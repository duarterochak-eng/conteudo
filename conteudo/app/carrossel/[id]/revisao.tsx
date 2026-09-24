"use client";
import { useEffect, useRef, useState } from "react";

async function lerJson(r: Response) {
  const txt = await r.text();
  try {
    return JSON.parse(txt);
  } catch {
    throw new Error(r.status === 504 ? "tempo esgotado no servidor (504). Tente de novo." : `servidor respondeu ${r.status}: ${txt.slice(0, 80)}`);
  }
}

/**
 * Ajustes rápidos. "local" muda o JSON direto, sem IA: é instantâneo e não depende de modelo grátis estar no ar.
 * "instrucao" é marcador: clicar só marca; "Pedir ajuste" junta os marcados com o texto e manda pro /api/edit (IA).
 */
type Chip = { rotulo: string; instrucao?: string; local?: (spec: any, i: number | null) => any; slide?: number };
const clamp = (n: number) => Math.max(70, Math.min(190, n));
const mudaTamanho = (delta: number) => (spec: any, i: number | null) => {
  const slides = spec.slides.map((s: any, k: number) =>
    (i == null ? s.type !== "cta" : k === i) && typeof s.size === "number" ? { ...s, size: clamp(s.size + delta) } : s
  );
  return { ...spec, slides };
};
const modoCta = (mode: "salvar" | "comenta") => (spec: any) => ({
  ...spec,
  slides: spec.slides.map((s: any) => (s.type === "cta" ? { ...s, mode } : s)),
});

const CHIPS_CARROSSEL: Chip[] = [
  { rotulo: "Capa mais forte", slide: 0, instrucao: "Reescreva o título da capa com mais tensão ou um resultado concreto, até 9 palavras. Não use o molde 'Não falta X, sobra Y'. Grife 1 palavra com <em>." },
  { rotulo: "Encurtar textos", instrucao: "Corte o corpo de todos os slides pela metade, sem perder a informação principal. Títulos de passo com até 6 palavras." },
  { rotulo: "Mais direto", instrucao: "Deixe o tom mais direto e falado, como dono de loja conversando. Frases curtas. Nada de linguagem de manual." },
  { rotulo: "Tirar jargão de IA", instrucao: "Troque todo termo técnico ou de IA (agente, fluxo, integração, automação, API, CRM) por palavras que um dono de loja usa. Mantenha o sentido." },
  { rotulo: "Exemplos de outro ramo", instrucao: "Troque os exemplos para um único ramo de negócio diferente do atual (ex.: clínica, oficina, loja de roupas, escritório de contabilidade) e use o mesmo ramo em todos os slides." },
  { rotulo: "Mais cor", instrucao: "Em cada slide, grife com <mark> ou <em> a palavra mais importante do título (no máximo 1 por slide)." },
  { rotulo: "Texto maior", local: mudaTamanho(+12) },
  { rotulo: "Texto menor", local: mudaTamanho(-12) },
  { rotulo: "Refazer legenda", instrucao: "Reescreva só a legenda (caption): gancho na primeira linha, 3 a 5 bullets curtos e fechamento com a chamada do último slide. Não mexa nos slides." },
  { rotulo: "Final: Salva pra aplicar", local: modoCta("salvar") },
  { rotulo: "Final: Comenta PALAVRA", local: modoCta("comenta") },
];

const CHIPS_SLIDE: Chip[] = [
  { rotulo: "Mais visual", instrucao: "Troque o parágrafo por UM visual (chat, compare, ficha, flow ou items) que prove o título. Corpo com no máximo 15 palavras." },
  { rotulo: "Trocar o visual", instrucao: "Use um tipo de visual diferente do atual (chat, compare, ficha, flow ou items), com o mesmo conteúdo." },
  { rotulo: "Exemplo mais concreto", instrucao: "Troque o exemplo por uma cena concreta de empresa pequena: quem, o que aconteceu, a frase real. Sem inventar números." },
  { rotulo: "Encurtar", instrucao: "Corte o texto deste slide pela metade sem perder a ideia principal." },
  { rotulo: "Título mais forte", instrucao: "Reescreva o título com mais tensão, até 6 palavras." },
  { rotulo: "Mais cor", instrucao: "Grife com <mark> a palavra mais importante do título." },
  { rotulo: "Texto maior", local: mudaTamanho(+12) },
  { rotulo: "Texto menor", local: mudaTamanho(-12) },
  { rotulo: "Refazer slide", instrucao: "Reescreva este slide do zero, mesmo papel no carrossel, com outro ângulo e outro visual." },
];

export default function Revisao(props: any) {
  const [spec, setSpec] = useState(props.spec);
  const [urls, setUrls] = useState<string[]>(props.urls);
  const [msgs, setMsgs] = useState<any[]>(props.mensagens);
  const [txt, setTxt] = useState("");
  const [marcados, setMarcados] = useState<string[]>([]); // rótulos dos chips com instrucao
  const [slide, setSlide] = useState<number | null>(null);
  const [status, setStatus] = useState(props.status);
  const [carregando, setCarregando] = useState(false);
  const [aberto, setAberto] = useState<number | null>(null); // slide ampliado
  const campo = useRef<HTMLTextAreaElement>(null);

  // A lista de chips muda entre carrossel e slide: marcador não sobrevive à troca.
  useEffect(() => setMarcados([]), [slide]);

  // Teclado no modo ampliado: ← → navega, Esc fecha.
  useEffect(() => {
    if (aberto == null) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setAberto(null);
      if (e.key === "ArrowRight") setAberto((a) => (a == null ? a : Math.min(a + 1, urls.length - 1)));
      if (e.key === "ArrowLeft") setAberto((a) => (a == null ? a : Math.max(a - 1, 0)));
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [aberto, urls.length]);

  function ajustarEste(i: number) {
    setSlide(i);
    setAberto(null);
    setTimeout(() => campo.current?.focus(), 50);
  }

  async function renderizar(novo: any, origin: string) {
    const r2 = await fetch("/api/render", {
      method: "POST",
      body: JSON.stringify({ carousel_id: props.id, spec: novo, origin }),
    });
    const d2 = await lerJson(r2);
    if (!r2.ok) throw new Error(d2.erro);
    setSpec(novo);
    setUrls(d2.urls);
    return d2.version;
  }

  function marcar(c: Chip) {
    setMarcados((m) => (m.includes(c.rotulo) ? m.filter((r) => r !== c.rotulo) : [...m, c.rotulo]));
  }

  async function aplicarLocal(chip: Chip) {
    if (carregando || !chip.local) return;
    setCarregando(true);
    setMsgs((m) => [...m, { role: "user", content: "⚡ " + chip.rotulo, slide_index: slide }]);
    try {
      const v = await renderizar(chip.local(spec, slide), "edicao_manual");
      setMsgs((m) => [...m, { role: "assistant", content: `${chip.rotulo}: feito (versão ${v}).` }]);
    } catch (e: any) {
      setMsgs((m) => [...m, { role: "assistant", content: "Erro: " + e.message }]);
    }
    setCarregando(false);
  }

  async function enviar() {
    if (carregando) return;
    const lista = (slide == null ? CHIPS_CARROSSEL : CHIPS_SLIDE).filter((c) => c.instrucao && marcados.includes(c.rotulo));
    const detalhe = txt.trim();
    if (!lista.length && !detalhe) return;
    const base = lista.map((c) => c.instrucao).join("\n");
    const instrucao = !lista.length ? txt : !detalhe ? base : `${base}\nDetalhes do Kawan (prioridade sobre as instruções acima): ${detalhe}`;
    const alvo = slide ?? lista.find((c) => c.slide != null)?.slide ?? null;
    const conteudo = lista.length ? "⚡ " + [...lista.map((c) => c.rotulo), ...(detalhe ? [detalhe] : [])].join(" · ") : txt;
    setCarregando(true);
    setMsgs((m) => [...m, { role: "user", content: conteudo, slide_index: alvo }]);
    setTxt("");
    setMarcados([]);
    try {
      const r1 = await fetch("/api/edit", {
        method: "POST",
        body: JSON.stringify({ carousel_id: props.id, spec, instrucao, slide_index: alvo }),
      });
      const d1 = await lerJson(r1);
      if (!r1.ok) throw new Error(d1.erro);
      const v = await renderizar(d1.spec, "edicao_chat");
      setMsgs((m) => [...m, { role: "assistant", content: (d1.resumo || "Ajuste aplicado.") + " (versão " + v + ")" }]);
    } catch (e: any) {
      setMsgs((m) => [...m, { role: "assistant", content: "Erro: " + e.message }]);
    }
    setCarregando(false);
  }

  async function aprovar() {
    await fetch("/api/aprovar", { method: "POST", body: JSON.stringify({ carousel_id: props.id }) });
    setStatus("aprovado");
  }

  return (
    <div className="wrap">
      <a href="/" className="muted" style={{ fontSize: 13 }}>← esteira</a>
      <h1 style={{ marginTop: 8 }}>{props.titulo}</h1>
      <div className="row" style={{ marginTop: 6 }}>
        <span className="tag">{status}</span>
        <span className="tag">{spec.slides.some((x: any) => x.type === "cta" && x.mode === "comenta") ? "comenta: " + spec.keyword : "final: salvar"}</span>
        <span className="tag">{urls.length} slides</span>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1.4fr 1fr", gap: 18, marginTop: 20, alignItems: "start" }}>
        <div className="card">
          <div className="slides">
            {urls.map((u, i) => (
              <div key={u} style={{ outline: slide === i ? "2px solid var(--or)" : "none", borderRadius: 8 }}>
                <img
                  src={u}
                  alt={"slide " + (i + 1)}
                  loading="lazy"
                  onClick={() => setAberto(i)}
                  style={{ cursor: "zoom-in", aspectRatio: "1080 / 1350", width: "100%", background: "#e9e7e2" }}
                />
                <div className="row" style={{ fontSize: 12, marginTop: 4, justifyContent: "space-between" }}>
                  <span className="muted">slide {i + 1}</span>
                  <button className="btn" style={{ padding: "2px 8px", fontSize: 12 }} onClick={() => (slide === i ? setSlide(null) : setSlide(i))}>
                    {slide === i ? "selecionado ✓" : "ajustar"}
                  </button>
                </div>
              </div>
            ))}
          </div>
          <details style={{ marginTop: 14 }}>
            <summary className="muted">Legenda</summary>
            <p style={{ whiteSpace: "pre-wrap", marginTop: 8 }}>{spec.caption}</p>
          </details>
        </div>

        <div className="card" style={{ display: "grid", gap: 12 }}>
          <h2>Revisão</h2>
          <p className="muted" style={{ fontSize: 13, marginTop: -6 }}>
            {slide == null ? "Falando do carrossel inteiro. Clique num slide para falar só dele." : `Falando do slide ${slide + 1}.`}
            {slide != null && (
              <button className="btn" style={{ padding: "2px 8px", marginLeft: 8, fontSize: 12 }} onClick={() => setSlide(null)}>
                tirar seleção
              </button>
            )}
          </p>
          <div className="chatbox">
            {msgs.map((m, i) => (
              <div key={i} className={"msg " + (m.role === "user" ? "me" : "")}>
                {m.slide_index != null && <span className="tag" style={{ marginRight: 6 }}>slide {m.slide_index + 1}</span>}
                {m.content}
              </div>
            ))}
            {!msgs.length && <span className="muted">Ex.: "aumenta o texto do slide 3", "a capa está fraca, deixa o gancho mais direto".</span>}
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
            {(slide == null ? CHIPS_CARROSSEL : CHIPS_SLIDE).map((c) => {
              const on = !c.local && marcados.includes(c.rotulo);
              return (
                <button
                  key={c.rotulo}
                  className="btn"
                  disabled={carregando}
                  title={c.instrucao || "Aplicado direto, sem IA"}
                  onClick={() => (c.local ? aplicarLocal(c) : marcar(c))}
                  style={{ padding: "4px 10px", fontSize: 12, borderRadius: 99, ...(on ? { borderColor: "var(--or)", color: "var(--or)" } : {}) }}
                >
                  {c.rotulo}
                </button>
              );
            })}
          </div>
          <textarea ref={campo} rows={3} value={txt} onChange={(e) => setTxt(e.target.value)} placeholder="Detalhe o ajuste (opcional se marcou um botão acima)" />
          <div className="row">
            <button className="btn or" onClick={() => enviar()} disabled={carregando}>
              {carregando ? "Ajustando…" : "Pedir ajuste"}
            </button>
            <button className="btn primary" onClick={aprovar} disabled={status === "aprovado"}>
              {status === "aprovado" ? "Aprovado" : "Aprovar"}
            </button>
          </div>
        </div>
      </div>
      {aberto != null && (
        <div
          onClick={() => setAberto(null)}
          style={{ position: "fixed", inset: 0, background: "rgba(10,12,16,.88)", zIndex: 50, display: "flex", alignItems: "center", justifyContent: "center", gap: 16, padding: 16 }}
        >
          <button className="btn" disabled={aberto === 0} onClick={(e) => { e.stopPropagation(); setAberto(aberto - 1); }} style={{ fontSize: 22, padding: "8px 14px" }}>‹</button>
          <div onClick={(e) => e.stopPropagation()} style={{ display: "grid", gap: 10, justifyItems: "center" }}>
            <img src={urls[aberto]} alt={"slide " + (aberto + 1)} style={{ maxHeight: "84vh", maxWidth: "min(90vw, 1080px)", borderRadius: 8, display: "block" }} />
            <div className="row" style={{ gap: 8 }}>
              <span style={{ color: "#fff", fontSize: 13 }}>slide {aberto + 1} de {urls.length}</span>
              <button className="btn or" onClick={() => ajustarEste(aberto)}>Ajustar este slide</button>
              <a className="btn" href={urls[aberto]} download target="_blank" rel="noreferrer">Abrir PNG</a>
              <button className="btn" onClick={() => setAberto(null)}>Fechar (Esc)</button>
            </div>
          </div>
          <button className="btn" disabled={aberto === urls.length - 1} onClick={(e) => { e.stopPropagation(); setAberto(aberto + 1); }} style={{ fontSize: 22, padding: "8px 14px" }}>›</button>
        </div>
      )}
    </div>
  );
}
