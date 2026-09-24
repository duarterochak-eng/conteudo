import Link from "next/link";
import { db } from "@/lib/supabase";
import "./globals.css";
import Novo from "./novo";
import Acoes from "./acoes";

export const dynamic = "force-dynamic";

const TRAVOU_MS = 10 * 60 * 1000; // "gerando" há mais que isso = geração que travou

const dataCurta = (iso: string) =>
  new Date(iso).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", timeZone: "America/Sao_Paulo" });

function Linha({ c, arquivado = false }: { c: any; arquivado?: boolean }) {
  const capa = (c.carousel_versions || []).find((v: any) => v.version === c.current_version)?.png_paths?.[0];
  const falhou = c.status === "gerando" && Date.now() - new Date(c.created_at).getTime() > TRAVOU_MS;
  return (
    <div className="row" style={{ flexWrap: "nowrap", padding: "8px 12px", borderTop: "1px solid var(--line)" }}>
      <Link href={`/carrossel/${c.id}`} className="row" style={{ flex: 1, minWidth: 0, flexWrap: "nowrap", textDecoration: "none" }}>
        {capa ? (
          <img src={capa} alt="" loading="lazy" style={{ width: 48, aspectRatio: "1080 / 1350", objectFit: "cover", borderRadius: 4, background: "#e9e7e2", flexShrink: 0 }} />
        ) : (
          <div style={{ width: 48, aspectRatio: "1080 / 1350", borderRadius: 4, background: "#D5D9E0", flexShrink: 0 }} />
        )}
        <span style={{ flex: 1, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", fontWeight: 600 }}>
          {c.pautas?.title || "sem título"}
        </span>
        {c.status === "gerando" && <span className="tag" style={falhou ? { color: "var(--or)" } : undefined}>{falhou ? "falhou" : "gerando"}</span>}
        <span className="muted" style={{ fontSize: 13, flexShrink: 0 }}>{dataCurta(c.created_at)}</span>
      </Link>
      <Acoes id={c.id} arquivado={arquivado} />
    </div>
  );
}

function Secao({ titulo, lista }: { titulo: string; lista: any[] }) {
  if (!lista.length) return null;
  return (
    <div className="card" style={{ marginTop: 18, padding: 0 }}>
      <h2 style={{ fontSize: 16, padding: "12px 12px 10px" }}>
        {titulo} <span className="muted" style={{ fontWeight: 400 }}>({lista.length})</span>
      </h2>
      {lista.map((c) => <Linha key={c.id} c={c} />)}
    </div>
  );
}

export default async function Home() {
  const { data } = await db
    .from("carousels")
    .select("id,status,created_at,current_version,pautas(title),carousel_versions(version,png_paths)")
    .order("created_at", { ascending: false })
    .limit(200);
  const cars = data || [];
  const de = (...s: string[]) => cars.filter((c: any) => s.includes(c.status));
  const cancelados = de("arquivado");

  return (
    <div className="wrap">
      <h1>Esteira</h1>

      <Novo />

      <Secao titulo="Aguardando você" lista={de("em_revisao", "editando")} />
      <Secao titulo="Gerando" lista={de("gerando")} />
      <Secao titulo="Feitos" lista={de("aprovado", "publicado", "medido")} />
      {cancelados.length > 0 && (
        <details className="card" style={{ marginTop: 18, padding: 0 }}>
          <summary style={{ padding: 12, cursor: "pointer" }} className="muted">
            Cancelados ({cancelados.length})
          </summary>
          {cancelados.map((c: any) => <Linha key={c.id} c={c} arquivado />)}
        </details>
      )}
      {!cars.length && <div className="card muted" style={{ marginTop: 18 }}>Nada ainda. Crie o primeiro carrossel acima.</div>}
    </div>
  );
}
