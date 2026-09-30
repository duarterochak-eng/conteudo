import { db } from "./supabase";
import { DOR_ROTULO, TAMANHO_TEXTO, normalizarWhatsapp, type Dor, type Tamanho } from "./lead";

export type LeadQuente = {
  id: string;
  nome: string;
  email: string;
  whatsapp: string | null;
  ramo: string | null;
  tamanho: string | null;
  maior_dor: string | null;
  isca: string;
  /** como virou quente: no cadastro, numa atualização ou pelo botão da tela "Pronto" */
  origem: "cadastro" | "atualizacao" | "botao";
};

/**
 * Marca quer_conversar = true só se ainda era false (um único UPDATE, sem corrida).
 * Devolve true quando foi esta chamada que virou o lead: só nesse caso vale avisar o Kawan.
 */
export async function marcarQuerConversar(leadId: string, whatsapp?: string | null): Promise<boolean> {
  const upd: Record<string, unknown> = { quer_conversar: true, quer_conversar_em: new Date().toISOString() };
  if (whatsapp) upd.whatsapp = whatsapp;
  const { data, error } = await db.from("leads").update(upd).eq("id", leadId).eq("quer_conversar", false).select("id");
  if (error) {
    console.error("lead quente: marca quer_conversar", leadId, error);
    throw new Error("marca quer_conversar");
  }
  return !!data && data.length > 0;
}

/** Avisa o n8n (que manda o WhatsApp do Kawan). Falha só loga: o lead já está salvo. */
export async function avisarLeadQuente(l: LeadQuente): Promise<void> {
  const url = process.env.N8N_LEAD_QUENTE_WEBHOOK_URL;
  if (!url) {
    console.error("lead quente: falta N8N_LEAD_QUENTE_WEBHOOK_URL; lead", l.id);
    return;
  }
  try {
    const r = await fetch(url, {
      method: "POST",
      headers: { "content-type": "application/json", "x-lead-secret": process.env.N8N_LEAD_SECRET || "" },
      body: JSON.stringify({
        nome: l.nome,
        email: l.email,
        whatsapp: normalizarWhatsapp(l.whatsapp || ""),
        ramo: l.ramo || "",
        tamanho: l.tamanho ? TAMANHO_TEXTO[l.tamanho as Tamanho] || l.tamanho : "",
        maior_dor: l.maior_dor ? DOR_ROTULO[l.maior_dor as Dor] || l.maior_dor : "",
        isca: l.isca,
        origem: l.origem,
      }),
      signal: AbortSignal.timeout(8000),
    });
    if (!r.ok) console.error("lead quente: webhook n8n respondeu", r.status, "lead", l.id);
  } catch (e) {
    console.error("lead quente: webhook n8n falhou; lead", l.id, e);
  }
}
