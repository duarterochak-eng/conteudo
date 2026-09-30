import { redirect } from "next/navigation";
import { buscarIsca, type Isca } from "@/lib/iscas";
import Captura, { type Capa } from "./isca/[palavra]/captura";

export const dynamic = "force-dynamic";
export const metadata = { title: "@kawan.labs", robots: { index: false } };

// link da bio do Instagram: mesmo fluxo das iscas, com a isca BIO e textos próprios
const CAPA: Capa = {
  antes: "IA na sua empresa,",
  destaque: "sem enrolação",
  sub: "Coloca seu e-mail: a tabela das IAs chega agora, de presente, e quando eu testar algo bom na prática eu te aviso por aqui. Tem empresa? Dá pra falar comigo direto.",
  botao: "Quero receber",
};

export default async function Home() {
  // sem a isca BIO (não cadastrada, desligada) ou com o banco fora do ar, o link da bio continua indo pro Instagram
  let isca: Isca | null = null;
  try {
    isca = await buscarIsca("BIO");
  } catch (e) {
    console.error("bio: busca da isca falhou", e);
  }
  if (!isca) redirect("https://instagram.com/kawan.labs");
  return <Captura palavra={isca.palavra} titulo={isca.titulo} capa={CAPA} />;
}
