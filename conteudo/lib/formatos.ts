import type { RegraLint } from "./lint";

/**
 * Formatos do carrossel (fluxo de Ideias). Objeto em código, sem tabela.
 * estrutura: papel de cada um dos 7 slides. lintDesligado: regras do lint.ts que não valem aqui.
 */
export type Formato = "tese" | "passo_a_passo" | "mensagem_pronta" | "o_que_muda" | "bastidor" | "erros_comuns";

type DefFormato = { nome: string; quando: string; estrutura: string[]; regras: string[]; visuais: string; lintDesligado: RegraLint[] };

export const FORMATOS: Record<Formato, DefFormato> = {
  tese: {
    nome: "Tese",
    quando: "uma opinião que contraria o senso comum do dono de PME",
    estrutura: [
      "cover: capa contrária ao senso comum",
      "statement: o problema, a tese em uma frase",
      "step: sinal 1",
      "step: sinal 2",
      "step: sinal 3",
      "step: o que muda (a solução, onde o dono entra)",
      "cta: final",
    ],
    regras: ["Os três sinais seguem o mesmo molde de frase no título.", "Cada sinal com um visual diferente."],
    visuais: "compare no problema; chat, ficha ou repete nos sinais; flow no o que muda",
    lintDesligado: [],
  },
  passo_a_passo: {
    nome: "Passo a passo",
    quando: "como fazer algo concreto, em etapas",
    estrutura: ["cover: capa com o resultado do passo a passo", "statement: o problema", "step: passo 1", "step: passo 2", "step: passo 3", "step: passo 4", "cta: final"],
    regras: ["Título de passo = verbo + objeto (\"Escreva as perguntas que mais chegam\").", "Nunca passo vago como \"teste e ajuste\"."],
    visuais: "chat, items com conteúdo copiável, flow",
    lintDesligado: [],
  },
  mensagem_pronta: {
    nome: "Mensagem pronta",
    quando: "mensagens para o dono copiar e mandar (WhatsApp, cobrança, retorno)",
    estrutura: [
      "cover: capa prometendo as mensagens",
      "statement: o problema que as mensagens resolvem",
      "step: modelo 1 para copiar",
      "step: modelo 2 para copiar",
      "step: modelo 3 para copiar",
      "step: a regra por trás dos modelos",
      "cta: final",
    ],
    regras: ["Cada modelo vai num chat, pronto para copiar.", "Pode usar [colchetes] no balão para o que o dono troca ([nome], [dia])."],
    visuais: "chat nos modelos; items ou compare na regra",
    lintDesligado: ["colchetes"],
  },
  o_que_muda: {
    nome: "O que muda",
    quando: "uma notícia ou lançamento e o impacto para o dono de PME",
    estrutura: [
      "cover: capa com a data do fato (só se a data estiver nos fatos; senão, o fato em poucas palavras)",
      "statement: o fato, sem exagero",
      "step: quem é afetado",
      "step: quem não é afetado",
      "step: o que fazer hoje",
      "step: o que continua igual",
      "cta: final",
    ],
    regras: ["Pode usar API, LLM e prompt quando o fato for sobre isso, explicando em uma frase simples.", "Nada de previsão: só o que está nos fatos."],
    visuais: "compare (afetado x não afetado), items, flow",
    lintDesligado: ["tecnico", "jargao_ia"],
  },
  bastidor: {
    nome: "Bastidor",
    quando: "caso próprio do Kawan (só se a nota disser que é caso dele)",
    estrutura: ["cover: capa com o resultado (só se estiver nos fatos)", "statement: o sistema que foi montado", "step: o teste", "step: o problema que apareceu", "step: a solução", "step: o que ficou de lição", "cta: final"],
    regras: ["Primeira pessoa (\"montei\", \"testei\").", "Nenhum número que não esteja nos fatos."],
    visuais: "flow no sistema; chat ou ficha no teste e no problema",
    lintDesligado: [],
  },
  erros_comuns: {
    nome: "Erros comuns",
    quando: "erros que o dono comete e como evitar",
    estrutura: ["cover: capa com número (\"5 erros...\")", "step: erro 1", "step: erro 2", "step: erro 3", "step: erro 4", "step: erro 5", "cta: final"],
    regras: ["Um erro por slide: título = o erro; corpo = o que fazer no lugar."],
    visuais: "compare (erro x certo), chat, ficha",
    lintDesligado: [],
  },
};

export const NOMES_FORMATO = Object.keys(FORMATOS) as Formato[];

/** Bloco do formato para o prompt de redação. */
export function blocoFormato(f: Formato) {
  const d = FORMATOS[f];
  return `FORMATO: ${d.nome}
ESTRUTURA (7 slides, nesta ordem; o tipo vem antes dos dois pontos):
${d.estrutura.map((e, i) => `${i + 1}. ${e}`).join("\n")}
REGRAS DO FORMATO:
- ${d.regras.join("\n- ")}
VISUAIS PREFERIDOS: ${d.visuais}`;
}
