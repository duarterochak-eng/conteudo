import type { Metadata } from "next";
import { buscarIsca, type Isca } from "@/lib/iscas";
import { lerPublico } from "@/data/servicos";
import { fontes } from "@/lib/fontes";
import { Landing, TEM_FOTO } from "@/components/landing";

export const dynamic = "force-dynamic";

const TITULO = "Kawan | Automação com IA para empresas";
const DESCRICAO =
  "O que você faz na mão todo dia, eu automatizo. Automação com IA para pequenas e médias empresas e para quem trabalha por conta.";

export const metadata: Metadata = {
  title: TITULO,
  description: DESCRICAO,
  openGraph: {
    title: TITULO,
    description: DESCRICAO,
    type: "website",
    locale: "pt_BR",
    ...(TEM_FOTO && { images: ["/kawan.jpg"] }),
  },
};

export default async function Home({ searchParams }: { searchParams: Promise<{ p?: string | string[] }> }) {
  // sem a isca BIO (não cadastrada, desligada) ou com o banco fora do ar/lento, a landing sai igual e o #tabela mostra só o WhatsApp
  let isca: Isca | null = null;
  try {
    const semResposta = new Promise<null>((r) => setTimeout(() => r(null), 3000));
    isca = await Promise.race([buscarIsca("BIO"), semResposta]);
  } catch (e) {
    console.error("landing: busca da isca BIO falhou", e);
  }
  return (
    <div className={fontes}>
      <Landing publico={lerPublico((await searchParams).p)} isca={isca} />
    </div>
  );
}
