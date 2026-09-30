// Constantes e funções do funil de leads, usadas no servidor (API) e no navegador (formulário).

/** WhatsApp público do Kawan para o link wa.me. Só dígitos, com DDI. */
export const WHATSAPP_KAWAN = "5565981586922";

export const linkWhatsapp = (texto: string) => `https://wa.me/${WHATSAPP_KAWAN}?text=${encodeURIComponent(texto)}`;

/** Só dígitos, com DDI 55 quando vier só DDD + número (10 ou 11 dígitos). Vazio continua vazio. */
export function normalizarWhatsapp(v: string): string {
  const d = (v || "").replace(/\D/g, "");
  return d.length === 10 || d.length === 11 ? `55${d}` : d;
}

/** Vale para o número já normalizado: DDI + DDD + 8 ou 9 dígitos. */
export const whatsappValido = (d: string) => d.length === 12 || d.length === 13;

export const TAMANHO_VALORES = ["so_eu", "2_5", "6_20", "21_mais"] as const;
export type Tamanho = (typeof TAMANHO_VALORES)[number];
export const TAMANHO_ROTULO: Record<Tamanho, string> = {
  so_eu: "Só eu",
  "2_5": "2 a 5",
  "6_20": "6 a 20",
  "21_mais": "Mais de 20",
};
/** Texto que vai no aviso de lead quente. */
export const TAMANHO_TEXTO: Record<Tamanho, string> = {
  so_eu: "Só eu",
  "2_5": "2 a 5 pessoas",
  "6_20": "6 a 20 pessoas",
  "21_mais": "Mais de 20 pessoas",
};

export const DOR_VALORES = [
  "atendimento_whatsapp",
  "vendas_followup",
  "financeiro_planilhas",
  "conteudo_instagram",
  "outro",
] as const;
export type Dor = (typeof DOR_VALORES)[number];
export const DOR_ROTULO: Record<Dor, string> = {
  atendimento_whatsapp: "Atendimento no WhatsApp",
  vendas_followup: "Vendas e follow-up",
  financeiro_planilhas: "Financeiro e planilhas",
  conteudo_instagram: "Conteúdo e Instagram",
  outro: "Outro",
};
