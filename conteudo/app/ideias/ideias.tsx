"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { FORMATOS, type Formato } from "@/lib/formatos";

export type IdeiaRow = {
  id: string;
  title: string;
  status: string;
  angle: any;
  reject_tags: string[] | null;
  reject_reason: string | null;
  carousel_id: string | null;
};
export type Ref = {
  id: string;
  path: string;
  tipo: "video" | "imagem";
  link: string | null;
  nota: string | null;
  leitura: { resumo: string; fatos: string[] } | null;
  status: "lendo" | "lida" | "falhou";
  erro: string | null;
  created_at: string;
  url: string | null;
  ideias: IdeiaRow[];
};

const EXTS = ["mp4", "mov", "png", "jpg", "jpeg", "webp"];
const MAX = 25 * 1024 * 1024;
const MOTIVOS: [string, string][] = [
  ["fraca", "fraca"],
  ["repetida", "repetida"],
  ["fora_do_publico", "fora do público"],
  ["outro", "outro"],
];
const PILAR: Record<string, string> = { tempo: "tempo", desempenho: "desempenho", bastidor: "bastidor", opiniao: "opinião" };
const pequeno = { padding: "4px 10px", fontSize: 13 };

async function lerJson(r: Response) {
  const txt = await r.text();
  try {
    return JSON.parse(txt);
  } catch {
    throw new Error(r.status === 504 ? "tempo esgotado no servidor (504). Tente de novo." : `servidor respondeu ${r.status}: ${txt.slice(0, 80)}`);
  }
}

/** Chama POST /api/ideias e acompanha as linhas {"etapa"} até o fim. */
async function rodarIdeias(body: any, onEtapa: (e: string) => void) {
  const r = await fetch("/api/ideias", { method: "POST", body: JSON.stringify(body) });
  if (!r.ok || !r.body) throw new Error(`servidor respondeu ${r.status}`);
  const leitor = r.body.getReader();
  const dec = new TextDecoder();
  let buf = "";
  let fim: any = null;
  for (;;) {
    const { done, value } = await leitor.read();
    if (done) break;
    buf += dec.decode(value, { stream: true });
    let i;
    while ((i = buf.indexOf("\n")) >= 0) {
      const linha = buf.slice(0, i).trim();
      buf = buf.slice(i + 1);
      if (!linha) continue;
      const o = JSON.parse(linha);
      if (o.etapa) onEtapa(o.etapa);
      else fim = o;
    }
  }
  if (!fim) throw new Error("a conexão caiu antes do fim (tempo esgotado?)");
  if (fim.erro) throw new Error(fim.erro);
  return fim;
}

const ETAPA: Record<string, string> = { lendo: "lendo…", criando: "criando ideias…" };

export default function Ideias({ refs }: { refs: Ref[] }) {
  return (
    <>
      <Upload />
      <div style={{ display: "grid", gap: 14, marginTop: 18 }}>
        {refs.map((r) => (
          <Referencia key={r.id} r={r} />
        ))}
        {!refs.length && <div className="card muted">Nenhuma referência ainda.</div>}
      </div>
    </>
  );
}

function Upload() {
  const router = useRouter();
  const [arquivo, setArquivo] = useState<File | null>(null);
  const [link, setLink] = useState("");
  const [nota, setNota] = useState("");
  const [msg, setMsg] = useState("");
  const [ocupado, setOcupado] = useState(false);

  function escolher(f: File | null) {
    setMsg("");
    if (!f) return setArquivo(null);
    const ext = f.name.split(".").pop()?.toLowerCase() || "";
    if (!EXTS.includes(ext)) {
      setArquivo(null);
      return setMsg("Formato não aceito. Use mp4, mov, png, jpg ou webp.");
    }
    if (f.size > MAX) {
      setArquivo(null);
      return setMsg(`Arquivo com ${(f.size / 1048576).toFixed(1)} MB. O limite é 25 MB.`);
    }
    setArquivo(f);
  }

  async function gerar() {
    if (!arquivo || ocupado) return;
    setOcupado(true);
    try {
      setMsg("enviando…");
      const ext = arquivo.name.split(".").pop()!.toLowerCase();
      const r1 = await fetch("/api/upload-url", { method: "POST", body: JSON.stringify({ ext, tamanho: arquivo.size }) });
      const d1 = await lerJson(r1);
      if (!r1.ok) throw new Error(d1.erro);

      // direto para o Storage (mesmo formato do uploadToSignedUrl do supabase-js)
      const form = new FormData();
      form.append("cacheControl", "3600");
      form.append("", arquivo);
      const up = await fetch(d1.url, { method: "PUT", headers: { "x-upsert": "false" }, body: form });
      if (!up.ok) throw new Error(`upload ${up.status}: ${(await up.text()).slice(0, 120)}`);

      let mostrou = false;
      await rodarIdeias({ path: d1.path, tipo: d1.tipo, link: link.trim() || null, nota: nota.trim() || null }, (e) => {
        setMsg(ETAPA[e] || e);
        if (!mostrou) {
          mostrou = true;
          router.refresh(); // a referência já aparece na lista
        }
      });
      setArquivo(null);
      setLink("");
      setNota("");
      setMsg("Pronto.");
    } catch (e: any) {
      setMsg("Erro: " + e.message);
    }
    setOcupado(false);
    router.refresh();
  }

  return (
    <div className="card" style={{ marginTop: 18, display: "grid", gap: 10 }}>
      <h2>Nova referência</h2>
      <input
        key={arquivo ? "com" : "sem"}
        type="file"
        accept=".mp4,.mov,.png,.jpg,.jpeg,.webp,video/mp4,video/quicktime,image/png,image/jpeg,image/webp"
        onChange={(e) => escolher(e.target.files?.[0] || null)}
        disabled={ocupado}
      />
      {arquivo && <span className="muted" style={{ fontSize: 13 }}>{arquivo.name} · {(arquivo.size / 1048576).toFixed(1)} MB</span>}
      <input value={link} onChange={(e) => setLink(e.target.value)} placeholder="Link do post (opcional)" disabled={ocupado} />
      <textarea value={nota} onChange={(e) => setNota(e.target.value)} rows={2} placeholder="O que te chamou atenção? (opcional)" disabled={ocupado} />
      <div className="row">
        <button className="btn or" onClick={gerar} disabled={!arquivo || ocupado}>
          {ocupado ? "Gerando…" : "Gerar ideias"}
        </button>
        <span className="muted">{msg}</span>
      </div>
    </div>
  );
}

function Referencia({ r }: { r: Ref }) {
  const router = useRouter();
  const [verDescartadas, setVerDescartadas] = useState(false);
  const [msg, setMsg] = useState("");
  const [ocupado, setOcupado] = useState(false);

  const descartadas = r.ideias.filter((i) => i.status === "rejeitada");
  const visiveis = r.ideias.filter((i) => i.status !== "rejeitada" || verDescartadas);
  const travada = r.status === "lendo" && Date.now() - new Date(r.created_at).getTime() > 10 * 60 * 1000;
  const podeRefazer = r.status === "falhou" || travada || (r.status === "lida" && !r.ideias.length);

  async function refazer() {
    setOcupado(true);
    try {
      await rodarIdeias({ referencia_id: r.id }, (e) => setMsg(ETAPA[e] || e));
      setMsg("");
    } catch (e: any) {
      setMsg("Erro: " + e.message);
    }
    setOcupado(false);
    router.refresh();
  }

  return (
    <div className="card" style={{ display: "grid", gap: 12 }}>
      <div className="row" style={{ alignItems: "flex-start", flexWrap: "nowrap", gap: 14 }}>
        {r.url ? (
          r.tipo === "video" ? (
            <video src={r.url} controls preload="metadata" style={{ width: 140, borderRadius: 8, background: "#000", flexShrink: 0 }} />
          ) : (
            <img src={r.url} alt="" loading="lazy" style={{ width: 140, borderRadius: 8, flexShrink: 0 }} />
          )
        ) : (
          <div style={{ width: 140, aspectRatio: "9 / 16", borderRadius: 8, background: "#D5D9E0", flexShrink: 0 }} />
        )}
        <div style={{ display: "grid", gap: 6, minWidth: 0 }}>
          <span className="muted" style={{ fontSize: 12 }}>
            {new Date(r.created_at).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", timeZone: "America/Sao_Paulo" })}
            {r.link && (
              <>
                {" · "}
                <a href={r.link} target="_blank" rel="noreferrer">post original</a>
              </>
            )}
          </span>
          {r.nota ? <p style={{ margin: 0 }}>{r.nota}</p> : <p className="muted" style={{ margin: 0 }}>(sem nota)</p>}
          {r.status === "lendo" && !travada && <span className="muted" style={{ fontSize: 13 }}>lendo…</span>}
          {(r.erro || travada) && <span style={{ fontSize: 13, color: "var(--or)" }}>{r.erro || "A leitura travou."}</span>}
          {podeRefazer && (
            <div className="row" style={{ gap: 8 }}>
              <button className="btn" style={pequeno} onClick={refazer} disabled={ocupado}>
                {ocupado ? "Tentando…" : "Tentar de novo"}
              </button>
              <span className="muted" style={{ fontSize: 13 }}>{msg}</span>
            </div>
          )}
          {r.leitura && (
            <details>
              <summary className="muted" style={{ cursor: "pointer", fontSize: 13 }}>O que a IA entendeu</summary>
              <p style={{ fontSize: 14 }}>{r.leitura.resumo}</p>
              <ol style={{ fontSize: 14, paddingLeft: 20, margin: 0 }}>
                {r.leitura.fatos.map((f, i) => (
                  <li key={i}>{f}</li>
                ))}
              </ol>
            </details>
          )}
        </div>
      </div>

      {visiveis.length > 0 && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 10 }}>
          {visiveis.map((i) => (
            <CardIdeia key={i.id} i={i} />
          ))}
        </div>
      )}
      {descartadas.length > 0 && (
        <button className="btn" style={{ ...pequeno, justifySelf: "start" }} onClick={() => setVerDescartadas((v) => !v)}>
          {verDescartadas ? "esconder descartadas" : `mostrar descartadas (${descartadas.length})`}
        </button>
      )}
    </div>
  );
}

function CardIdeia({ i }: { i: IdeiaRow }) {
  const router = useRouter();
  const a = i.angle || {};
  const capas: string[] = a.capas || [];
  const [escolha, setEscolha] = useState(0);
  const [capa, setCapa] = useState(a.capa_escolhida || capas[0] || "");
  const [descartando, setDescartando] = useState(false);
  const [tags, setTags] = useState<string[]>([]);
  const [motivo, setMotivo] = useState("");
  const [ocupado, setOcupado] = useState(false);
  const [msg, setMsg] = useState("");

  const nomeFormato = FORMATOS[a.formato as Formato]?.nome || a.formato;

  async function aprovar() {
    if (!capa.trim() || ocupado) return;
    setOcupado(true);
    try {
      setMsg("escrevendo o carrossel…");
      const r1 = await fetch(`/api/ideias/${i.id}/aprovar`, { method: "POST", body: JSON.stringify({ capa }) });
      const d1 = await lerJson(r1);
      if (!r1.ok) throw new Error(d1.erro);
      setMsg("montando as imagens…");
      const r2 = await fetch("/api/render", { method: "POST", body: JSON.stringify({ carousel_id: d1.carousel_id, spec: d1.spec }) });
      const d2 = await lerJson(r2);
      if (!r2.ok) throw new Error(d2.erro);
      setMsg("");
    } catch (e: any) {
      setMsg("Erro: " + e.message);
    }
    setOcupado(false);
    router.refresh();
  }

  async function descartar() {
    if (ocupado) return;
    setOcupado(true);
    try {
      const r = await fetch(`/api/ideias/${i.id}/descartar`, { method: "POST", body: JSON.stringify({ tags, motivo }) });
      const d = await lerJson(r);
      if (!r.ok) throw new Error(d.erro);
      setDescartando(false);
    } catch (e: any) {
      setMsg("Erro: " + e.message);
    }
    setOcupado(false);
    router.refresh();
  }

  const cabecalho = (
    <>
      <span className="muted" style={{ fontSize: 12 }}>
        {nomeFormato} · {PILAR[a.pilar] || a.pilar}
      </span>
      <strong>{i.title}</strong>
    </>
  );

  if (i.carousel_id) {
    return (
      <div className="card" style={{ display: "grid", gap: 6, background: "var(--surface2)" }}>
        {cabecalho}
        <span style={{ fontSize: 14 }}>
          Aprovada · <a href={`/carrossel/${i.carousel_id}`} style={{ color: "var(--or)", fontWeight: 600 }}>abrir carrossel</a>
        </span>
      </div>
    );
  }
  if (i.status === "rejeitada") {
    return (
      <div className="card" style={{ display: "grid", gap: 6, opacity: 0.6 }}>
        {cabecalho}
        <span className="muted" style={{ fontSize: 13 }}>
          Descartada{i.reject_tags?.length ? ": " + i.reject_tags.map((t) => MOTIVOS.find(([k]) => k === t)?.[1] || t).join(", ") : ""}
          {i.reject_reason ? ` · ${i.reject_reason}` : ""}
        </span>
      </div>
    );
  }

  return (
    <div className="card" style={{ display: "grid", gap: 8 }}>
      {cabecalho}
      {a.por_que && <span className="muted" style={{ fontSize: 13 }}>Por que saiu deste vídeo: {a.por_que}</span>}
      {a.roteiro?.length > 0 && (
        <ol style={{ fontSize: 13, paddingLeft: 18, margin: 0 }}>
          {a.roteiro.map((l: string, k: number) => (
            <li key={k}>{l.replace(/^\d+[.)]?\s*/, "")}</li>
          ))}
        </ol>
      )}
      <div style={{ display: "grid", gap: 4 }}>
        <span className="muted" style={{ fontSize: 12 }}>Capa</span>
        {capas.map((c, k) => (
          <label key={k} style={{ display: "flex", gap: 6, alignItems: "flex-start", fontSize: 14, cursor: "pointer" }}>
            <input
              type="radio"
              name={"capa-" + i.id}
              checked={escolha === k}
              onChange={() => {
                setEscolha(k);
                setCapa(c);
              }}
              style={{ width: "auto", marginTop: 4 }}
            />
            {c}
          </label>
        ))}
        <input value={capa} onChange={(e) => setCapa(e.target.value)} style={{ fontSize: 14, padding: "6px 10px" }} />
      </div>
      <div className="row" style={{ gap: 6 }}>
        <button className="btn or" style={pequeno} onClick={aprovar} disabled={ocupado || !capa.trim()}>
          {i.status === "aprovada" ? "Aprovar de novo" : "Aprovar"}
        </button>
        <button className="btn" style={pequeno} onClick={() => setDescartando((d) => !d)} disabled={ocupado}>
          Descartar
        </button>
        <span className="muted" style={{ fontSize: 13 }}>{msg}</span>
      </div>
      {descartando && (
        <div style={{ display: "grid", gap: 6, borderTop: "1px solid var(--line)", paddingTop: 8 }}>
          <div className="row" style={{ gap: 6 }}>
            {MOTIVOS.map(([k, rotulo]) => {
              const on = tags.includes(k);
              return (
                <button
                  key={k}
                  className="btn"
                  onClick={() => setTags((t) => (on ? t.filter((x) => x !== k) : [...t, k]))}
                  style={{ ...pequeno, borderRadius: 99, ...(on ? { borderColor: "var(--or)", color: "var(--or)" } : {}) }}
                >
                  {rotulo}
                </button>
              );
            })}
          </div>
          <input value={motivo} onChange={(e) => setMotivo(e.target.value)} placeholder="Motivo (opcional)" style={{ fontSize: 14, padding: "6px 10px" }} />
          <button className="btn" style={{ ...pequeno, justifySelf: "start" }} onClick={descartar} disabled={ocupado || (!tags.length && !motivo.trim())}>
            Confirmar descarte
          </button>
        </div>
      )}
    </div>
  );
}
