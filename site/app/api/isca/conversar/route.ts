import { NextResponse, after } from "next/server";
import { z } from "zod";
import { db } from "@/lib/supabase";
import { normalizarWhatsapp, whatsappValido } from "@/lib/lead";
import { avisarLeadQuente, marcarQuerConversar } from "@/lib/lead-quente";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// botão "Quero conversar" da tela Pronto: quem já é lead (e tem empresa) vira lead quente
const Body = z.object({
  email: z.string().trim().toLowerCase().email("E-mail inválido."),
  isca: z.string().trim().max(60).transform((v) => v.toUpperCase()).optional(),
  whatsapp: z
    .string()
    .transform(normalizarWhatsapp)
    .refine((v) => v === "" || whatsappValido(v), "WhatsApp inválido: coloca com DDD.")
    .optional(),
});

const erro = (msg: string, status = 400) => NextResponse.json({ erro: msg }, { status });
const ERRO_GERAL = "Deu erro aqui. Tenta de novo em instantes.";

export async function POST(req: Request) {
  let json: unknown;
  try {
    json = await req.json();
  } catch {
    return erro("Pedido inválido.");
  }
  const p = Body.safeParse(json);
  if (!p.success) return erro(p.error.issues[0]?.message || "Dados inválidos.");
  const { email, isca } = p.data;

  const { data: lead, error } = await db
    .from("leads")
    .select("id,nome,tem_empresa,ramo,whatsapp,tamanho,maior_dor,quer_conversar,primeira_isca")
    .eq("email", email)
    .maybeSingle();
  if (error) {
    console.error("conversar: busca lead", error);
    return erro(ERRO_GERAL, 500);
  }
  if (!lead) return erro("Não achei seu cadastro. Pede o material de novo pelo e-mail.", 404);
  if (!lead.tem_empresa) return erro("Essa conversa é para quem tem empresa.");

  const novoZap = p.data.whatsapp || "";
  const zap = novoZap || normalizarWhatsapp(lead.whatsapp || "");
  if (!whatsappValido(zap)) return erro("Coloca seu WhatsApp com DDD pra eu te chamar.");

  let virou = false;
  try {
    virou = await marcarQuerConversar(lead.id, novoZap || null);
  } catch {
    return erro(ERRO_GERAL, 500);
  }
  if (virou) {
    const quente = {
      id: lead.id as string,
      nome: lead.nome as string,
      email,
      whatsapp: zap,
      ramo: (lead.ramo as string | null) ?? null,
      tamanho: (lead.tamanho as string | null) ?? null,
      maior_dor: (lead.maior_dor as string | null) ?? null,
      isca: isca || (lead.primeira_isca as string | null) || "",
      origem: "botao" as const,
    };
    after(() => avisarLeadQuente(quente));
  }
  return NextResponse.json({ status: "ok" });
}
