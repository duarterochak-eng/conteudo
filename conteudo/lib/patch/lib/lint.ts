import type { TSpec } from "./spec";

/**
 * Checagem do roteiro em código. O prompt pede; aqui a regra é cobrada.
 * Devolve a lista de problemas (vazia = ok). Usado para 1 nova tentativa no LLM.
 */

const EMOJI = /[\u{1F000}-\u{1FAFF}\u{2600}-\u{27BF}\u{FE0F}\u{200D}]/u;
const palavras = (s = "") => s.replace(/<[^>]+>/g, "").trim().split(/\s+/).filter(Boolean).length;
const limpo = (s = "") => s.replace(/<[^>]+>/g, "");

// Termos proibidos pelo prompt (técnico, jargão, clichê)
const PROIBIDO: [RegExp, string][] = [
  [/\bAPI\b|webhook|\btoken\b|integra[çc][ãa]o/i, "passo técnico (API/webhook/token/integração): troque pela decisão do dono"],
  [/trein(e|ar|o) (o |a )?(modelo|ia|agente)|ensine o agente/i, "\"treinar/ensinar o agente\": diga \"escreva as instruções\""],
  [/\bFAQ\b|escalonamento|hor[áa]rio de cobertura|fluxo de encaminhamento/i, "linguagem de manual (FAQ/escalonamento/cobertura)"],
  [/revolucion|potencializ|alavanc|no mundo de hoje|a IA chegou/i, "clichê proibido"],
  [/insira no sistema|no sistema\b/i, "\"o sistema\" vago: diga qual ferramenta ou o que o dono faz"],
  [/agenda sozinho|posta sozinho|publica sozinho/i, "promete publicação automática (não existe no fluxo)"],
];

// Trechos que só existem nos exemplos do prompt: se aparecem, o modelo copiou
const COPIA = ["Gol 2012", "Auto Peças Silva", "João Silva", "99123-4567", "Faz mais barato", "Tem pra hoje", "Isso é robô", "o que acontece às 22h", "perguntas chatas", "Teste e ajuste", "Monitore e ajuste", "Orçamento #231"];

export function lint(spec: TSpec): string[] {
  const p: string[] = [];
  const todo = JSON.stringify(spec);

  if (EMOJI.test(todo)) p.push("Tem emoji. Proibido (a fonte não tem e vira quadradinho).");
  for (const c of COPIA) if (todo.toLowerCase().includes(c.toLowerCase())) p.push(`Copiou exemplo do prompt ("${c}"). Escreva do zero para o tema.`);

  spec.slides.forEach((s: any, i) => {
    const n = `Slide ${i + 1}`;
    const textos = [s.title, s.body, ...(s.items || []), ...(s.flow || []), ...(s.chat || []).map((b: any) => b.text)].filter(Boolean).map(limpo).join(" | ");
    for (const [re, msg] of PROIBIDO) if (re.test(textos)) p.push(`${n}: ${msg}.`);

    if (s.type === "cover") {
      if (palavras(s.title) > 9) p.push(`${n}: capa com mais de 9 palavras.`);
      if (/^(como|aprenda|saiba|descubra)\b/i.test(limpo(s.title))) p.push(`${n}: capa com cara de apostila ("Como...", "Aprenda..."). Use tensão ou resultado concreto.`);
      return;
    }
    if (s.type === "cta") return;

    if (palavras(s.title) > 7) p.push(`${n}: título com mais de 7 palavras.`);
    if (palavras(s.body) > 25) p.push(`${n}: corpo com mais de 25 palavras.`);

    const temVisual = s.items?.length || s.flow?.length || s.chat?.length || s.compare || s.ficha || s.repete;
    if (s.type === "step" && !temVisual) p.push(`${n}: passo sem visual.`);

    if (s.items?.length) {
      if (s.items.length > 3) p.push(`${n}: ${s.items.length} items (máximo 3).`);
      s.items.forEach((x: string) => palavras(x) > 6 && p.push(`${n}: item "${limpo(x)}" com mais de 6 palavras.`));
      if (s.items.every((x: string) => palavras(x) <= 4 && !/["?:\d]/.test(x))) p.push(`${n}: items parecem rótulos ("${s.items.map(limpo).join('", "')}"). Troque por conteúdo copiável (a frase pronta, a pergunta real, a regra exata) ou use outro visual.`);
    }
    if (s.flow?.length) {
      if (s.flow.length < 3 || s.flow.length > 4) p.push(`${n}: flow com ${s.flow.length} etapas (use 3 a 4).`);
      s.flow.forEach((x: string) => palavras(x) > 2 && p.push(`${n}: etapa "${x}" com mais de 2 palavras.`));
    }
    if (s.chat?.length) {
      if (s.chat.length < 2) p.push(`${n}: chat com 1 balão. Mostre a conversa (2 a 3 balões: quem pergunta e quem responde).`);
      s.chat.forEach((b: any) => {
        if (palavras(b.text) > 18) p.push(`${n}: balão com mais de 18 palavras.`);
        if (/\[[^\]]+\]/.test(b.text)) p.push(`${n}: balão com placeholder "${b.text}". Escreva a mensagem real.`);
      });
    }
  });

  if (/comente\b/i.test(spec.caption)) p.push('Legenda: use "Comenta PALAVRA", não "Comente".');
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
