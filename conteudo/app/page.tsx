import Link from "next/link";
import { db } from "@/lib/supabase";
import "./globals.css";
import Novo from "./novo";
import Lista, { type Item, type Ver } from "./lista";

export const dynamic = "force-dynamic";

const STATUS: Record<string, string> = { aguardando: "aguardando você", gerando: "gerando", falhou: "falhou", feitos: "feito" };

const TRAVOU_MS = 10 * 60 * 1000; // "gerando" há mais que isso = geração que travou (só exibição)

function grupo(c: any): Exclude<Ver, "todos"> | null {
  if (c.status === "em_revisao" || c.status === "editando") return "aguardando";
  if (c.status === "gerando") return Date.now() - new Date(c.created_at).getTime() > TRAVOU_MS ? "falhou" : "gerando";
  if (["aprovado", "publicado", "medido"].includes(c.status)) return "feitos";
  if (c.status === "arquivado") return "cancelados";
  return null;
}

export default async function Home({ searchParams }: { searchParams: Promise<{ ver?: string }> }) {
  const { ver } = await searchParams;
  const { data } = await db
    .from("carousels")
    .select("id,status,created_at,current_version,pautas(title),carousel_versions(version,png_paths)")
    .order("created_at", { ascending: false })
    .limit(200);

  const todos: Item[] = (data || []).map((c: any) => ({
    id: c.id,
    titulo: c.pautas?.title || "sem título",
    data: new Date(c.created_at).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", timeZone: "America/Sao_Paulo" }),
    capa: (c.carousel_versions || []).find((v: any) => v.version === c.current_version)?.png_paths?.[0] || null,
    grupo: grupo(c),
  }));
  // Último gerado: o mais recente que não foi cancelado. Sai da lista de baixo (e das contagens).
  const ultimo = todos.find((i) => i.grupo !== "cancelados");
  const itens = todos.filter((i) => i !== ultimo);

  return (
    <div className="wrap">
      <div className="row" style={{ justifyContent: "space-between" }}>
        <h1>Esteira</h1>
        <Link href="/ideias" className="btn" style={{ padding: "6px 14px", textDecoration: "none" }}>Ideias</Link>
      </div>
      <Novo />
      {ultimo && (
        <Link href={`/carrossel/${ultimo.id}`} className="card row" style={{ marginTop: 18, flexWrap: "nowrap", alignItems: "flex-start", textDecoration: "none", gap: 16 }}>
          {ultimo.capa ? (
            <img src={ultimo.capa} alt="" style={{ width: 120, aspectRatio: "1080 / 1350", objectFit: "cover", borderRadius: 6, background: "#e9e7e2", flexShrink: 0 }} />
          ) : (
            <div style={{ width: 120, aspectRatio: "1080 / 1350", borderRadius: 6, background: "#D5D9E0", flexShrink: 0 }} />
          )}
          <div style={{ display: "grid", gap: 6, minWidth: 0 }}>
            <span className="muted" style={{ fontSize: 12 }}>Último gerado</span>
            <h2 style={{ fontSize: 18 }}>{ultimo.titulo}</h2>
            <span className="muted" style={{ fontSize: 13 }}>
              {ultimo.data}
              {ultimo.grupo && STATUS[ultimo.grupo] ? ` · ${STATUS[ultimo.grupo]}` : ""}
            </span>
          </div>
        </Link>
      )}
      {todos.length ? (
        <Lista itens={itens} ver={ver} />
      ) : (
        <div className="card muted" style={{ marginTop: 18 }}>Nada ainda. Crie o primeiro carrossel acima.</div>
      )}
    </div>
  );
}
