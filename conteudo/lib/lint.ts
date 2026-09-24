import type { TSpec } from "./spec";
import { FORMATOS, type Formato } from "./formatos";

/**
 * Checagem do roteiro em código. O prompt pede; aqui a regra é cobrada.
 * Devolve a lista de problemas (vazia = ok). Usado para 1 nova tentativa no LLM.
 */

const EMOJI = /[\u{1F000}-\u{1FAFF}\u{2600}-\u{27BF}\u{FE0F}\u{200D}]/u;
const palavras = (s = "") => s.replace(/<[^>]+>/g, "").trim().split(/\s+/).filter(Boolean).length;
const limpo = (s = "") => s.replace(/<[^>]+>/g, "");

/** Id de cada regra. O formato (lib/formatos.ts) pode desligar regras pelo id. */
export type RegraLint =
  | "emoji" | "copia" | "tecnico" | "jargao_ia" | "treinar" | "manual" | "cliche" | "sistema_vago" | "publica_sozinho"
  | "capa_longa" | "capa_apostila" | "capa_molde" | "titulo_longo" | "corpo_longo" | "passo_sem_visual"
  | "items" | "flow" | "chat" | "colchetes" | "legenda";

// Palavras proibidas (também listadas no prompt de redação e de ângulos)
export const CLICHES = "revolucionar, revolucionário, mergulhar, jornada, desvendar, cenário atual, crucial, potencializar, alavancar, no mundo de hoje, a IA chegou, game changer, transformador";
const CLICHE_RE = /revolucion|mergulh|jornada|desvend|cen[áa]rio atual|crucial|potencializ|alavanc|no mundo de hoje|a IA chegou|game[ -]?changer|transformador/i;

// Termos proibidos pelo prompt (técnico, jargão, clichê)
const PROIBIDO: [RegraLint, RegExp, string][] = [
  ["tecnico", /\bAPI\b|webhook|\btoken\b|integra[çc][ãa]o/i, "passo técnico (API/webhook/token/integração): troque pela decisão do dono"],
  ["jargao_ia", /\bLLM\b|\bprompts?\b/i, "jargão de IA (LLM/prompt): diga \"a IA\" e \"as instruções\""],
  ["treinar", /trein(e|ar|o) (o |a )?(modelo|ia|agente)|ensine o agente/i, "\"treinar/ensinar o agente\": diga \"escreva as instruções\""],
  ["manual", /\bFAQ\b|escalonamento|hor[áa]rio de cobertura|fluxo de encaminhamento/i, "linguagem de manual (FAQ/escalonamento/cobertura)"],
  ["cliche", CLICHE_RE, "clichê proibido"],
  ["sistema_vago", /insira no sistema|no sistema\b/i, "\"o sistema\" vago: diga qual ferramenta ou o que o dono faz"],
  ["publica_sozinho", /agenda sozinho|posta sozinho|publica sozinho/i, "promete publicação automática (não existe no fluxo)"],
];

// Trechos que só existem nos exemplos do prompt: se aparecem, o modelo copiou
const COPIA = ["Gol 2012", "Auto Peças Silva", "João Silva", "99123-4567", "Faz mais barato", "Tem pra hoje", "Isso é robô", "o que acontece às 22h", "perguntas chatas", "Teste e ajuste", "Monitore e ajuste", "Orçamento #231", "Não falta funcionário", "Não falta equipe", "Sobra retrabalho", "Seu WhatsApp vende enquanto você dorme", "O mesmo dado digitado", "Retorno que depende da memória", "CRM que ninguém atualiza"];

/** Sem formato: comportamento de sempre. Com formato: pula as regras em lintDesligado. */
export function lint(spec: TSpec, formato?: Formato): string[] {
  const desligado = new Set<RegraLint>(formato ? FORMATOS[formato].lintDesligado : []);
  const on = (r: RegraLint) => !desligado.has(r);
  const p: string[] = [];
  const todo = JSON.stringify(spec);

  if (on("emoji") && EMOJI.test(todo)) p.push("Tem emoji. Proibido (a fonte não tem e vira quadradinho).");
  if (on("copia")) for (const c of COPIA) if (todo.toLowerCase().includes(c.toLowerCase())) p.push(`Copiou exemplo do prompt ("${c}"). Escreva do zero para o tema.`);

  spec.slides.forEach((s: any, i) => {
    const n = `Slide ${i + 1}`;
    const textos = [s.title, s.body, ...(s.items || []), ...(s.flow || []), ...(s.chat || []).map((b: any) => b.text)].filter(Boolean).map(limpo).join(" | ");
    // jargao_ia só vale no fluxo de Ideias (com formato); o /api/carousel antigo segue igual
    for (const [id, re, msg] of PROIBIDO) if (on(id) && (id !== "jargao_ia" || formato) && re.test(textos)) p.push(`${n}: ${msg}.`);

    if (s.type === "cover") {
      if (on("capa_longa") && palavras(s.title) > 9) p.push(`${n}: capa com mais de 9 palavras.`);
      if (on("capa_apostila") && /^(como|aprenda|saiba|descubra)\b/i.test(limpo(s.title))) p.push(`${n}: capa com cara de apostila ("Como...", "Aprenda..."). Use tensão ou resultado concreto.`);
      if (on("capa_molde") && /n[ãa]o falta\b[\s\S]{1,40}\bsobra\b/i.test(limpo(s.title))) p.push(`${n}: capa no molde "Não falta X, sobra Y". Use outro ângulo.`);
      return;
    }
    if (s.type === "cta") return;

    if (on("titulo_longo") && palavras(s.title) > 7) p.push(`${n}: título com mais de 7 palavras.`);
    if (on("corpo_longo") && palavras(s.body) > 25) p.push(`${n}: corpo com mais de 25 palavras.`);

    const temVisual = s.items?.length || s.flow?.length || s.chat?.length || s.compare || s.ficha || s.repete;
    if (on("passo_sem_visual") && s.type === "step" && !temVisual) p.push(`${n}: passo sem visual.`);

    if (on("items") && s.items?.length) {
      if (s.items.length > 3) p.push(`${n}: ${s.items.length} items (máximo 3).`);
      s.items.forEach((x: string) => palavras(x) > 6 && p.push(`${n}: item "${limpo(x)}" com mais de 6 palavras.`));
      if (s.items.every((x: string) => palavras(x) <= 4 && !/["?:\d]/.test(x))) p.push(`${n}: items parecem rótulos ("${s.items.map(limpo).join('", "')}"). Troque por conteúdo copiável (a frase pronta, a pergunta real, a regra exata) ou use outro visual.`);
    }
    if (on("flow") && s.flow?.length) {
      if (s.flow.map((x: string) => x.toLowerCase().trim()).join(",") === "whatsapp,ia,crm,alerta") p.push(`${n}: fluxo copiado do exemplo do prompt (WhatsApp, IA, CRM, Alerta). Monte as etapas reais deste tema.`);
      if (s.flow.length < 3 || s.flow.length > 4) p.push(`${n}: flow com ${s.flow.length} etapas (use 3 a 4).`);
      s.flow.forEach((x: string) => palavras(x) > 2 && p.push(`${n}: etapa "${x}" com mais de 2 palavras.`));
    }
    if (s.chat?.length) {
      if (on("chat") && s.chat.length < 2) p.push(`${n}: chat com 1 balão. Mostre a conversa (2 a 3 balões: quem pergunta e quem responde).`);
      s.chat.forEach((b: any) => {
        if (on("chat") && palavras(b.text) > 18) p.push(`${n}: balão com mais de 18 palavras.`);
        if (on("colchetes") && /\[[^\]]+\]/.test(b.text)) p.push(`${n}: balão com placeholder "${b.text}". Escreva a mensagem real.`);
      });
    }
  });

  if (on("legenda") && /comente\b/i.test(spec.caption)) p.push('Legenda: use "Comenta PALAVRA", não "Comente".');
  if (on("cliche") && CLICHE_RE.test(spec.caption)) p.push("Legenda: clichê proibido.");
  if (formato) {
    // fluxo de Ideias: 7 slides e final sempre "salvar"
    if (spec.slides.length !== 7) p.push(`O carrossel tem ${spec.slides.length} slides; o formato pede 7.`);
    if (on("legenda") && /\bcomenta\b/i.test(spec.caption)) p.push('Legenda: o final é "Salva pra aplicar" ou "Manda pro seu sócio", não "Comenta".');
  }
  return p;
}

/** Correções mecânicas que não precisam do LLM. */
export function normalizar(spec: TSpec): TSpec {
  for (const s of spec.slides as any[]) {
    // Agente/empresa sempre do lado laranja; cliente do lado branco
    for (const b of s.chat || []) {
      if (/^(agente|ia|atendente|loja|empresa)\b/i.test(b.who)) b.side = "me";
      else if (/^(cliente|lead)\b/i.test(b.who)) b.side = "lead";
    }
    if (s.items?.length > 3) s.items = s.items.slice(0, 3);
  }
  return spec;
}
