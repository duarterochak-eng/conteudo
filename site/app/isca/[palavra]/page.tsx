import { notFound } from "next/navigation";
import { buscarIsca } from "@/lib/iscas";
import Captura from "./captura";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ palavra: string }> }) {
  const isca = await buscarIsca((await params).palavra);
  return { title: isca ? `Receba ${isca.titulo}` : "Não encontrado", robots: { index: false } };
}

export default async function Page({ params }: { params: Promise<{ palavra: string }> }) {
  const isca = await buscarIsca((await params).palavra);
  if (!isca) notFound();
  return <Captura palavra={isca.palavra} titulo={isca.titulo} />;
}
