import { NextResponse, after } from "next/server";
import { z } from "zod";
import { db } from "@/lib/supabase";
import { DOR_VALORES, TAMANHO_VALORES, normalizarWhatsapp, whatsappValido } from "@/lib/lead";
import { avisarLeadQuente, marcarQuerConversar } from "@/lib/lead-quente";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// campos de dados opcionais aqui: no reaceite só vem aceite_email; o cadastro novo exige o resto abaixo
const Dados = z.object({
  nome: z.string().trim().min(2, "Nome muito curto.").max(80, "Nome muito longo.").optional(),
  tem_empresa: z.boolean().optional(),
  ramo: z.string().trim().max(80, "Ramo muito longo (até 80 caracteres).").optional(),
  tamanho: z.enum(TAMANHO_VALORES).optional(),
  maior_dor: z.enum(DOR_VALORES).optional(),
  quer_conversar: z.boolean().optional(),
  whatsapp: z
    .string()
    .transform(normalizarWhatsapp)
    .refine((v) => v === "" || whatsappValido(v), "WhatsApp inválido: coloca com DDD.")
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
const ERRO_GERAL = "Deu erro aqui. Tenta de novo em instantes.";
const PEDE_ZAP = "Coloca seu WhatsApp com DDD pra eu te chamar.";

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
    .select("id,nome,descadastrado_em,tem_empresa,ramo,whatsapp,tamanho,maior_dor,quer_conversar")
    .eq("email", email)
    .maybeSingle();
  if (eBusca) {
    console.error("isca: busca lead", eBusca);
    return erro(ERRO_GERAL, 500);
  }

  let leadId: string;
  let nome: string;
  let temEmpresa: boolean;
  let querConversar: boolean;
  let temWhatsapp: boolean;
  let cadastroNovo = false;
  const agora = new Date().toISOString();
  const ramo = dados?.tem_empresa === false ? null : dados?.ramo || null;
  const whatsapp = dados?.whatsapp || null;

  if (!lead) {
    if (!dados) return NextResponse.json({ status: "cadastro" });
    if (!dados.nome) return erro("Coloca seu nome.");
    if (typeof dados.tem_empresa !== "boolean") return erro("Responde se você tem empresa.");
    if (!dados.aceite_email) return erro("Marca a caixa de aceite pra receber por e-mail.");
    if (dados.tem_empresa) {
      if (!dados.tamanho) return erro("Diz quantas pessoas trabalham aí.");
      if (!dados.maior_dor) return erro("Escolhe o que mais come o seu tempo.");
      if (typeof dados.quer_conversar !== "boolean") return erro("Responde se quer conversar comigo.");
      if (dados.quer_conversar && !whatsapp) return erro(PEDE_ZAP);
    }
    const quer = dados.tem_empresa && dados.quer_conversar === true;
    const { data: novo, error } = await db
      .from("leads")
      .insert({
        email,
        nome: dados.nome,
        tem_empresa: dados.tem_empresa,
        ramo,
        tamanho: dados.tem_empresa ? dados.tamanho : null,
        maior_dor: dados.tem_empresa ? dados.maior_dor : null,
        quer_conversar: quer,
        quer_conversar_em: quer ? agora : null,
        whatsapp,
        primeira_isca: isca,
        aceite_email: true,
        aceite_em: agora,
      })
      .select("id,nome")
      .single();
    if (error || !novo) {
      console.error("isca: insere lead", error);
      return erro(ERRO_GERAL, 500);
    }
    leadId = novo.id;
    nome = novo.nome;
    cadastroNovo = true;
    temEmpresa = dados.tem_empresa;
    querConversar = quer;
    temWhatsapp = !!whatsapp;
    if (quer) {
      const quente = {
        id: leadId,
        nome,
        email,
        whatsapp,
        ramo,
        tamanho: dados.tamanho ?? null,
        maior_dor: dados.maior_dor ?? null,
        isca,
        origem: "cadastro" as const,
      };
      after(() => avisarLeadQuente(quente));
    }
  } else {
    if (lead.descadastrado_em && !dados) {
      return NextResponse.json({ status: "reaceite", nome: primeiroNome(lead.nome) });
    }
    leadId = lead.id;
    nome = lead.nome;
    temEmpresa = !!lead.tem_empresa;
    querConversar = !!lead.quer_conversar;
    temWhatsapp = !!lead.whatsapp;
    if (dados) {
      const upd: Record<string, unknown> = {};
      if (dados.nome) { upd.nome = dados.nome; nome = dados.nome; }
      if (typeof dados.tem_empresa === "boolean") { upd.tem_empresa = dados.tem_empresa; upd.ramo = ramo; temEmpresa = dados.tem_empresa; }
      else if (dados.ramo) upd.ramo = dados.ramo;
      if (whatsapp) { upd.whatsapp = whatsapp; temWhatsapp = true; }
      if (temEmpresa) {
        if (dados.tamanho) upd.tamanho = dados.tamanho;
        if (dados.maior_dor) upd.maior_dor = dados.maior_dor;
      }
      if (lead.descadastrado_em && dados.aceite_email) {
        upd.descadastrado_em = null;
        upd.aceite_email = true;
        upd.aceite_em = agora;
      }
      const virarQuente = temEmpresa && dados.quer_conversar === true && !querConversar;
      if (virarQuente && !temWhatsapp) return erro(PEDE_ZAP);
      if (Object.keys(upd).length) {
        const { error } = await db.from("leads").update(upd).eq("id", leadId);
        if (error) console.error("isca: atualiza lead", error);
      }
      if (virarQuente) {
        let virou = false;
        try {
          virou = await marcarQuerConversar(leadId);
        } catch {
          return erro(ERRO_GERAL, 500);
        }
        querConversar = true;
        if (virou) {
          const quente = {
            id: leadId,
            nome,
            email,
            whatsapp: whatsapp || lead.whatsapp || null,
            ramo: (upd.ramo as string | null | undefined) !== undefined ? (upd.ramo as string | null) : lead.ramo ?? null,
            tamanho: (upd.tamanho as string | undefined) ?? lead.tamanho ?? null,
            maior_dor: (upd.maior_dor as string | undefined) ?? lead.maior_dor ?? null,
            isca,
            origem: "atualizacao" as const,
          };
          after(() => avisarLeadQuente(quente));
        }
      }
    }
  }

  // o que a tela "Pronto" pode oferecer: só booleanos e um rótulo, nunca dados do lead
  // (quem acabou de responder no formulário não recebe a oferta de novo)
  const conversar = !temEmpresa ? "nao" : querConversar ? "pedido" : cadastroNovo ? "nao" : "oferecer";
  const resposta = NextResponse.json({
    status: "enviado",
    nome: primeiroNome(nome),
    url: iscaRow.url_entrega || "",
    conversar,
    tem_whatsapp: temWhatsapp,
  });

  // antirrepetição: mesmo lead e isca nos últimos 10 min não reenvia (pedido que falhou não conta)
  const desde = new Date(Date.now() - 10 * 60 * 1000).toISOString();
  const { data: recente } = await db
    .from("lead_iscas")
    .select("id")
    .eq("lead_id", leadId)
    .eq("isca", isca)
    .not("enviada_em", "is", null)
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
    return erro(ERRO_GERAL, 500);
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
