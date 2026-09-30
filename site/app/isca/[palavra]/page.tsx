import { notFound } from "next/navigation";
import { buscarIsca } from "@/lib/iscas";
import { lerPublico } from "@/data/servicos";
import { fontes } from "@/lib/fontes";
import CapturaLead from "@/components/captura-lead";
import { SecoesPosEntrega } from "@/components/landing";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ palavra: string }> }) {
  const isca = await buscarIsca((await params).palavra);
  return { title: isca ? `Receba ${isca.titulo}` : "Não encontrado", robots: { index: false } };
}

export default async function Page({
  params,
  searchParams,
}: {
  params: Promise<{ palavra: string }>;
  searchParams: Promise<{ p?: string | string[] }>;
}) {
  const isca = await buscarIsca((await params).palavra);
  if (!isca) notFound();
  // a captura fica sozinha na tela; serviços, quem sou e contato só aparecem depois da entrega
  return (
    <div className={fontes}>
      <CapturaLead
        isca={isca.palavra}
        titulo={isca.titulo}
        variante="hero"
        depois={<SecoesPosEntrega publico={lerPublico((await searchParams).p)} />}
      />
    </div>
  );
}
