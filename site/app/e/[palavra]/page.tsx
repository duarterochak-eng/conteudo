import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { db } from "@/lib/supabase";
import { linkWhatsapp } from "@/lib/lead";
import { fontes } from "@/lib/fontes";
import IconeWhatsapp from "@/app/isca/[palavra]/icone-whatsapp";
import { markdown } from "./markdown";
import "./entrega.css";

export const dynamic = "force-dynamic";

async function buscar(palavra: string) {
  const { data } = await db
    .from("iscas")
    .select("titulo,conteudo")
    .eq("palavra", decodeURIComponent(palavra).toUpperCase())
    .eq("ativa", true)
    .not("conteudo", "is", null)
    .maybeSingle();
  return data as { titulo: string; conteudo: string } | null;
}

export async function generateMetadata({ params }: { params: Promise<{ palavra: string }> }): Promise<Metadata> {
  const isca = await buscar((await params).palavra);
  return { title: isca?.titulo ?? "Não encontrado", robots: { index: false, follow: false } };
}

export default async function Entrega({ params }: { params: Promise<{ palavra: string }> }) {
  const isca = await buscar((await params).palavra);
  if (!isca) notFound();
  return (
    <div className={`${fontes} en`}>
      <main className="en-caixa">
        <div className="en-marca">@kawan.labs</div>
        <h1 className="en-h1">{isca.titulo}</h1>
        <div className="en-corpo">{markdown(isca.conteudo)}</div>
        <div className="en-cta">
          <strong>Quer isso rodando sozinho na sua empresa?</strong>
          <a
            className="en-zap"
            href={linkWhatsapp(`Peguei ${isca.titulo} e quero falar sobre automatizar minha empresa`)}
            target="_blank"
            rel="noopener noreferrer"
          >
            <IconeWhatsapp />
            Me chama no WhatsApp
          </a>
        </div>
      </main>
    </div>
  );
}
