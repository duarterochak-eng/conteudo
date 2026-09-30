import { db } from "./supabase";

export type Isca = { palavra: string; titulo: string };

/** Isca ativa pela palavra (ex.: TABELA, BIO). Null se não existir ou estiver desligada. */
export async function buscarIsca(palavra: string): Promise<Isca | null> {
  const { data } = await db
    .from("iscas")
    .select("palavra,titulo")
    .eq("palavra", decodeURIComponent(palavra).toUpperCase())
    .eq("ativa", true)
    .maybeSingle();
  return (data as Isca | null) ?? null;
}
