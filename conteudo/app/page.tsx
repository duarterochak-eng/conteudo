import { db } from "@/lib/supabase";
import "./globals.css";
import Novo from "./novo";
import Lista, { type Item, type Ver } from "./lista";

export const dynamic = "force-dynamic";

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

  const itens: Item[] = (data || []).map((c: any) => ({
    id: c.id,
    titulo: c.pautas?.title || "sem título",
    data: new Date(c.created_at).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", timeZone: "America/Sao_Paulo" }),
    capa: (c.carousel_versions || []).find((v: any) => v.version === c.current_version)?.png_paths?.[0] || null,
    grupo: grupo(c),
  }));

  return (
    <div className="wrap">
      <h1>Esteira</h1>
      <Novo />
      <Lista itens={itens} ver={ver} />
    </div>
  );
}
