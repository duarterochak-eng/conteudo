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

export default function Revisao(props: any) {
  const [spec, setSpec] = useState(props.spec);
  const [urls, setUrls] = useState<string[]>(props.urls);
  const [msgs, setMsgs] = useState<any[]>(props.mensagens);
  const [txt, setTxt] = useState("");
  const [slide, setSlide] = useState<number | null>(null);
  const [status, setStatus] = useState(props.status);
  const [carregando, setCarregando] = useState(false);
  const [aberto, setAberto] = useState<number | null>(null); // slide ampliado
  const campo = useRef<HTMLTextAreaElement>(null);

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

  async function enviar() {
    if (!txt.trim()) return;
    setCarregando(true);
    setMsgs([...msgs, { role: "user", content: txt, slide_index: slide }]);
    const instrucao = txt;
    setTxt("");
    try {
      const r1 = await fetch("/api/edit", {
        method: "POST",
        body: JSON.stringify({ carousel_id: props.id, spec, instrucao, slide_index: slide }),
      });
      const d1 = await lerJson(r1);
      if (!r1.ok) throw new Error(d1.erro);
      const r2 = await fetch("/api/render", {
        method: "POST",
        body: JSON.stringify({ carousel_id: props.id, spec: d1.spec, origin: "edicao_chat" }),
      });
      const d2 = await lerJson(r2);
      if (!r2.ok) throw new Error(d2.erro);
      setSpec(d1.spec);
      setUrls(d2.urls);
      setMsgs((m) => [...m, { role: "assistant", content: (d1.resumo || "Ajuste aplicado.") + " (versão " + d2.version + ")" }]);
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
        <span className="tag">palavra: {spec.keyword}</span>
        <span className="tag">{urls.length} slides</span>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1.4fr 1fr", gap: 18, marginTop: 20, alignItems: "start" }}>
        <div className="card">
          <div className="slides">
            {urls.map((u, i) => (
              <div key={u} style={{ outline: slide === i ? "2px solid var(--or)" : "none", borderRadius: 8 }}>
                <img src={u} alt={"slide " + (i + 1)} onClick={() => setAberto(i)} style={{ cursor: "zoom-in" }} />
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
          <textarea ref={campo} rows={3} value={txt} onChange={(e) => setTxt(e.target.value)} placeholder="O que você quer mudar?" />
          <div className="row">
            <button className="btn or" onClick={enviar} disabled={carregando}>
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
