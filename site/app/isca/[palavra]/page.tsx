import { notFound } from "next/navigation";
import { db } from "@/lib/supabase";
import Captura from "./captura";

export const dynamic = "force-dynamic";

async function buscar(palavra: string) {
  const { data } = await db
    .from("iscas")
    .select("palavra,titulo")
    .eq("palavra", decodeURIComponent(palavra).toUpperCase())
    .eq("ativa", true)
    .maybeSingle();
  return data as { palavra: string; titulo: string } | null;
}

export async function generateMetadata({ params }: { params: Promise<{ palavra: string }> }) {
  const isca = await buscar((await params).palavra);
  return { title: isca ? `Receba ${isca.titulo}` : "Não encontrado", robots: { index: false } };
}

export default async function Page({ params }: { params: Promise<{ palavra: string }> }) {
  const isca = await buscar((await params).palavra);
  if (!isca) notFound();
  return <Captura palavra={isca.palavra} titulo={isca.titulo} />;
}
