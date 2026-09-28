import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/supabase";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// campos de dados opcionais aqui: no reaceite só vem aceite_email; o cadastro novo exige nome e tem_empresa abaixo
const Dados = z.object({
  nome: z.string().trim().min(2, "Nome muito curto.").max(80, "Nome muito longo.").optional(),
  tem_empresa: z.boolean().optional(),
  ramo: z.string().trim().max(80, "Ramo muito longo (até 80 caracteres).").optional(),
  whatsapp: z
    .string()
    .transform((v) => v.replace(/\D/g, ""))
    .refine((v) => v === "" || (v.length >= 10 && v.length <= 13), "WhatsApp inválido: coloca com DDD.")
    .optional(),
  aceite_email: z.boolean(),
});

const Body = z.object({
  isca: z.string().trim().min(1).max(60).transform((v) => v.toUpperCase()),
  email: z.string().trim().toLowerCase().email("E-mail inválido."),
  site: z.string().optional(),
  dados: Dados.optional(),
});

const primeiroNome = (n?: string | null) => (n || "").trim().split(/\s+/)[0] || "";
const erro = (msg: string, status = 400) => NextResponse.json({ erro: msg }, { status });

export async function POST(req: Request) {
  let json: unknown;
  try {
    json = await req.json();
  } catch {
    return erro("Pedido inválido.");
  }
  const p = Body.safeParse(json);
  if (!p.success) return erro(p.error.issues[0]?.message || "Dados inválidos.");
  const { isca, email, site, dados } = p.data;

  // honeypot: robô recebe "enviado" e nada acontece
  if (site && site.trim()) return NextResponse.json({ status: "enviado" });

  const { data: iscaRow } = await db
    .from("iscas")
    .select("palavra,titulo,url_entrega,assunto_email")
    .eq("palavra", isca)
    .eq("ativa", true)
    .maybeSingle();
  if (!iscaRow) return erro("Material não encontrado.", 404);

  const { data: lead, error: eBusca } = await db
    .from("leads")
    .select("id,nome,descadastrado_em")
    .eq("email", email)
    .maybeSingle();
  if (eBusca) {
    console.error("isca: busca lead", eBusca);
    return erro("Deu erro aqui. Tenta de novo em instantes.", 500);
  }

  let leadId: string;
  let nome: string;
  const agora = new Date().toISOString();
  const ramo = dados?.tem_empresa === false ? null : dados?.ramo || null;
  const whatsapp = dados?.whatsapp || null;

  if (!lead) {
    if (!dados) return NextResponse.json({ status: "cadastro" });
    if (!dados.nome) return erro("Coloca seu nome.");
    if (typeof dados.tem_empresa !== "boolean") return erro("Responde se você tem empresa.");
    if (!dados.aceite_email) return erro("Marca a caixa de aceite pra receber por e-mail.");
    const { data: novo, error } = await db
      .from("leads")
      .insert({
        email,
        nome: dados.nome,
        tem_empresa: dados.tem_empresa,
        ramo,
        whatsapp,
        primeira_isca: isca,
        aceite_email: true,
        aceite_em: agora,
      })
      .select("id,nome")
      .single();
    if (error || !novo) {
      console.error("isca: insere lead", error);
      return erro("Deu erro aqui. Tenta de novo em instantes.", 500);
    }
    leadId = novo.id;
    nome = novo.nome;
  } else {
    if (lead.descadastrado_em && !dados) {
      return NextResponse.json({ status: "reaceite", nome: primeiroNome(lead.nome) });
    }
    leadId = lead.id;
    nome = lead.nome;
    if (dados) {
      const upd: Record<string, unknown> = {};
      if (dados.nome) { upd.nome = dados.nome; nome = dados.nome; }
      if (typeof dados.tem_empresa === "boolean") { upd.tem_empresa = dados.tem_empresa; upd.ramo = ramo; }
      else if (dados.ramo) upd.ramo = dados.ramo;
      if (whatsapp) upd.whatsapp = whatsapp;
      if (lead.descadastrado_em && dados.aceite_email) {
        upd.descadastrado_em = null;
        upd.aceite_email = true;
        upd.aceite_em = agora;
      }
      if (Object.keys(upd).length) {
        const { error } = await db.from("leads").update(upd).eq("id", leadId);
        if (error) console.error("isca: atualiza lead", error);
      }
    }
  }

  const resposta = NextResponse.json({ status: "enviado", nome: primeiroNome(nome) });

  // antirrepetição: mesmo lead e isca nos últimos 10 min não reenvia
  const desde = new Date(Date.now() - 10 * 60 * 1000).toISOString();
  const { data: recente } = await db
    .from("lead_iscas")
    .select("id")
    .eq("lead_id", leadId)
    .eq("isca", isca)
    .gte("created_at", desde)
    .limit(1);
  if (recente && recente.length) return resposta;

  const { data: pedido, error: ePedido } = await db
    .from("lead_iscas")
    .insert({ lead_id: leadId, isca })
    .select("id")
    .single();
  if (ePedido || !pedido) {
    console.error("isca: insere lead_iscas", ePedido);
    return erro("Deu erro aqui. Tenta de novo em instantes.", 500);
  }

  const url = process.env.N8N_LEAD_WEBHOOK_URL;
  if (!url) {
    console.error("isca: falta N8N_LEAD_WEBHOOK_URL; pedido salvo", pedido.id);
    return resposta;
  }
  try {
    const r = await fetch(url, {
      method: "POST",
      headers: { "content-type": "application/json", "x-lead-secret": process.env.N8N_LEAD_SECRET || "" },
      body: JSON.stringify({
        lead_isca_id: pedido.id,
        email,
        nome,
        isca,
        titulo: iscaRow.titulo,
        url_entrega: iscaRow.url_entrega,
        assunto_email: iscaRow.assunto_email,
      }),
      signal: AbortSignal.timeout(8000),
    });
    if (!r.ok) console.error("isca: webhook n8n respondeu", r.status, "pedido", pedido.id);
  } catch (e) {
    console.error("isca: webhook n8n falhou; pedido salvo", pedido.id, e);
  }
  return resposta;
}
