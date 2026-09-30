import { z } from "zod";

/**
 * Tabela das IAs: formato do arquivo data/tabela-ia.json + contas que a página faz sobre ele.
 * O arquivo é a única fonte da verdade. Se algo aqui reprovar, o build falha e a Vercel
 * continua servindo o último deploy bom. Ver data/ATUALIZAR.md.
 */

/* ---------- guardas editoriais (valem para todo texto que aparece na página) ---------- */

const PROIBIDO: [RegExp, string][] = [
  [/(?<!R)\$/, "valor em dólar (a tabela mostra só reais)"],
  [/\bUSD\b/i, "valor em dólar (a tabela mostra só reais)"],
  [/\d\s*d[oó]lares?\b/i, "valor em dólar (a tabela mostra só reais)"],
  [
    /GDPval|SWE-?bench|MMLU|GPQA|ARC-?AGI|HumanEval|LMArena|Terminal-?Bench|OSWorld|DeepSWE|benchmark/i,
    "nota de benchmark (a tabela não mostra pontuação)",
  ],
  [/\btokens?\b/i, "jargão (token)"],
];

const texto = (max: number) =>
  z
    .string()
    .min(1)
    .max(max)
    .superRefine((v, ctx) => {
      if (v !== v.trim()) ctx.addIssue({ code: "custom", message: "espaço sobrando no começo ou no fim" });
      for (const [re, motivo] of PROIBIDO) {
        if (re.test(v)) ctx.addIssue({ code: "custom", message: `${motivo}: "${v.slice(0, 70)}"` });
      }
    });

/* ---------- peças do schema ---------- */

const id = z.string().regex(/^[a-z0-9]+(-[a-z0-9]+)*$/, "id: minúsculas, números e hífen");

const data = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "data no formato AAAA-MM-DD")
  .refine((s) => {
    const d = new Date(`${s}T00:00:00Z`);
    return !isNaN(+d) && d.toISOString().slice(0, 10) === s;
  }, "data que não existe");

const url = z
  .string()
  .url()
  .refine((u) => u.startsWith("https://"), "só links https");

const fontes = z.array(url).min(1, "toda linha precisa de pelo menos uma fonte").max(4);

const pill = z.enum(["claro", "laranja", "preto", "cinza"]);

const provedor = z.object({ id, nome: texto(30), empresa: texto(30) }).strict();

const plano = z
  .object({
    id,
    provedor: id,
    nome: texto(30),
    preco_brl_mes: z.number().min(0).optional(),
    preco_usd_mes: z.number().min(0).optional(),
    a_partir_de: z.boolean().optional(),
    detalhe: texto(170),
    fontes,
    verificado_em: data,
  })
  .strict()
  .refine((p) => (p.preco_brl_mes !== undefined) !== (p.preco_usd_mes !== undefined), {
    message: "informe preco_brl_mes (cobrado em reais) OU preco_usd_mes (convertido pelo câmbio), nunca os dois",
  });

const modelo = z
  .object({
    id,
    provedor: id,
    nome: texto(40),
    apelido: texto(20).optional(),
    cargo: texto(40),
    status: z.enum(["atual", "anterior"]),
    desde: data.optional(),
    preco_entrada_usd: z.number().positive().optional(),
    descricao: texto(240),
    onde: texto(150).optional(),
    plano_minimo: id,
    pill,
    fontes,
    verificado_em: data,
  })
  .strict();

const membro = z
  .object({
    modelo: id,
    cargo: texto(20),
    icone: z.enum(["cafe", "fone", "grafico", "tela"]),
    destaque: z.boolean().optional(),
    onde: texto(90),
    nao: texto(70),
  })
  .strict();

const escolha = z
  .object({
    modelo: id.optional(),
    rotulo: texto(40).optional(),
    plano: id.optional(),
    pill: pill.optional(),
    nota: texto(40).optional(),
    fontes: fontes.optional(),
  })
  .strict()
  .superRefine((e, ctx) => {
    if ((e.modelo === undefined) === (e.rotulo === undefined)) {
      ctx.addIssue({ code: "custom", message: "use `modelo` (um modelo da lista) OU `rotulo` (produto sem modelo próprio)" });
    }
    if (e.rotulo !== undefined && (e.plano === undefined || e.pill === undefined || e.fontes === undefined)) {
      ctx.addIssue({ code: "custom", message: "com `rotulo` são obrigatórios `plano`, `pill` e `fontes` (não há linha de modelo para carregar a fonte)" });
    }
  });

const tarefa = z
  .object({
    id,
    tarefa: texto(80),
    sub: texto(80).optional(),
    tipo: z.enum(["app", "automacao"]),
    escolhas: z.record(id, escolha),
  })
  .strict();

const regra = z.object({ titulo: texto(40), texto: texto(170) }).strict();

const mudanca = z
  .object({
    data,
    tipo: z.enum(["novo", "plano", "preco", "correcao", "saiu"]),
    titulo: texto(80),
    detalhe: texto(320),
    fontes,
  })
  .strict();

const cambio = z
  .object({
    brl_por_usd: z.number().min(3).max(10),
    iof: z.number().min(0).max(0.1),
    data,
    fontes,
  })
  .strict();

/* ---------- schema da tabela + conferências cruzadas ---------- */

const DIAS_MAX_ENTRADA = 21; // nenhuma linha pode estar sem conferência há mais que isso, em relação à `verificada_em`
const DIAS_MAX_CAMBIO = 14;

const corpo = z
  .object({
    atualizada_em: data,
    verificada_em: data,
    modelo_base: id,
    cambio,
    provedores: z.array(provedor).min(1).max(4),
    planos: z.array(plano).min(1).max(30),
    modelos: z.array(modelo).min(1).max(40),
    equipe: z.array(membro).length(4),
    tarefas: z.array(tarefa).min(3).max(16),
    regras: z.array(regra).min(2).max(3),
    cta: z.object({ texto: texto(260) }).strict(),
    mudancas: z.array(mudanca).min(1).max(40),
  })
  .strict();

/** O relógio entra como parâmetro só para a conferência de "data no futuro" poder ser testada. */
const criarSchema = (hoje: Date) =>
  corpo.superRefine((t, ctx) => {
    const erro = (path: (string | number)[], message: string) => ctx.addIssue({ code: "custom", path, message });

    const repetidos = (chave: "provedores" | "planos" | "modelos" | "tarefas") => {
      const vistos = new Set<string>();
      (t[chave] as { id: string }[]).forEach((x, i) => {
        if (vistos.has(x.id)) erro([chave, i, "id"], `id repetido: ${x.id}`);
        vistos.add(x.id);
      });
    };
    (["provedores", "planos", "modelos", "tarefas"] as const).forEach(repetidos);

    const provs = new Map(t.provedores.map((p) => [p.id, p]));
    const planos = new Map(t.planos.map((p) => [p.id, p]));
    const modelos = new Map(t.modelos.map((m) => [m.id, m]));

    t.planos.forEach((p, i) => {
      if (!provs.has(p.provedor)) erro(["planos", i, "provedor"], `provedor inexistente: ${p.provedor}`);
    });

    t.modelos.forEach((m, i) => {
      if (!provs.has(m.provedor)) erro(["modelos", i, "provedor"], `provedor inexistente: ${m.provedor}`);
      const pl = planos.get(m.plano_minimo);
      if (!pl) erro(["modelos", i, "plano_minimo"], `plano inexistente: ${m.plano_minimo}`);
      else if (pl.provedor !== m.provedor) erro(["modelos", i, "plano_minimo"], `${m.plano_minimo} é de outro provedor`);
    });

    const base = modelos.get(t.modelo_base);
    if (!base) erro(["modelo_base"], `modelo inexistente: ${t.modelo_base}`);
    else if (base.preco_entrada_usd === undefined) erro(["modelo_base"], "o modelo base precisa de preco_entrada_usd");

    t.equipe.forEach((e, i) => {
      const m = modelos.get(e.modelo);
      if (!m) return erro(["equipe", i, "modelo"], `modelo inexistente: ${e.modelo}`);
      if (m.status !== "atual") erro(["equipe", i, "modelo"], `${e.modelo} está como "anterior"; a equipe só tem modelo atual`);
      if (m.preco_entrada_usd === undefined) erro(["equipe", i, "modelo"], `${e.modelo} precisa de preco_entrada_usd (o crachá mostra o salário)`);
    });

    const ids = [...provs.keys()].sort().join(",");
    t.tarefas.forEach((tf, i) => {
      if (Object.keys(tf.escolhas).sort().join(",") !== ids) {
        erro(["tarefas", i, "escolhas"], `precisa ter exatamente uma escolha por provedor (${ids})`);
      }
      for (const [prov, e] of Object.entries(tf.escolhas)) {
        const at = ["tarefas", i, "escolhas", prov];
        if (e.plano !== undefined) {
          const pl = planos.get(e.plano);
          if (!pl) erro([...at, "plano"], `plano inexistente: ${e.plano}`);
          else if (pl.provedor !== prov) erro([...at, "plano"], `${e.plano} é de outro provedor`);
        }
        if (e.modelo !== undefined) {
          const m = modelos.get(e.modelo);
          if (!m) erro([...at, "modelo"], `modelo inexistente: ${e.modelo}`);
          else {
            if (m.provedor !== prov) erro([...at, "modelo"], `${e.modelo} é de outro provedor`);
            if (m.status !== "atual") erro([...at, "modelo"], `${e.modelo} está como "anterior"; indique o modelo atual`);
            if (tf.tipo === "automacao" && m.preco_entrada_usd === undefined) {
              erro([...at, "modelo"], `${e.modelo} não tem preco_entrada_usd; não serve para tarefa de automação`);
            }
          }
        }
      }
    });

    /* datas: nada no futuro (erro de digitação clássico), coerência e prazo de validade de cada linha */
    const limite = isoDia(new Date(+hoje + 86400000)); // 1 dia de folga por causa do fuso
    const datas: [(string | number)[], string | undefined][] = [
      [["atualizada_em"], t.atualizada_em],
      [["verificada_em"], t.verificada_em],
      [["cambio", "data"], t.cambio.data],
      ...t.mudancas.map((m, i): [(string | number)[], string] => [["mudancas", i, "data"], m.data]),
      ...t.modelos.map((m, i): [(string | number)[], string | undefined] => [["modelos", i, "desde"], m.desde]),
      ...t.modelos.map((m, i): [(string | number)[], string] => [["modelos", i, "verificado_em"], m.verificado_em]),
      ...t.planos.map((p, i): [(string | number)[], string] => [["planos", i, "verificado_em"], p.verificado_em]),
    ];
    let futuro = false;
    for (const [caminho, d] of datas) {
      if (d && d > limite) {
        futuro = true;
        erro(caminho, `${d} está no futuro (hoje é ${isoDia(hoje)})`);
      }
    }
    if (futuro) return; // o resto depende das datas estarem certas

    if (t.verificada_em < t.atualizada_em) erro(["verificada_em"], "a conferência não pode ser anterior à atualização");
    const passado = (caminho: (string | number)[], d: string | undefined, max?: number) => {
      if (!d) return;
      if (d > t.verificada_em) erro(caminho, `${d} é depois de verificada_em (${t.verificada_em})`);
      else if (max !== undefined && diasEntre(d, t.verificada_em) > max) {
        erro(caminho, `${d} está velha demais (mais de ${max} dias antes de verificada_em). Confira a fonte e atualize a data`);
      }
    };
    t.planos.forEach((p, i) => passado(["planos", i, "verificado_em"], p.verificado_em, DIAS_MAX_ENTRADA));
    t.modelos.forEach((m, i) => {
      passado(["modelos", i, "verificado_em"], m.verificado_em, DIAS_MAX_ENTRADA);
      passado(["modelos", i, "desde"], m.desde);
    });
    t.mudancas.forEach((m, i) => passado(["mudancas", i, "data"], m.data));
    passado(["cambio", "data"], t.cambio.data, DIAS_MAX_CAMBIO);
    passado(["atualizada_em"], t.atualizada_em);
  });

export type Tabela = z.infer<typeof corpo>;
export type Provedor = Tabela["provedores"][number];
export type Plano = Tabela["planos"][number];
export type Modelo = Tabela["modelos"][number];
export type Tarefa = Tabela["tarefas"][number];
export type Mudanca = Tabela["mudancas"][number];
export type Cambio = Tabela["cambio"];
export type Pill = z.infer<typeof pill>;

/* ---------- leitura com mensagem de erro legível ---------- */

/** Valida o JSON. `hoje` só existe para teste. Lança com a lista do que está errado. */
export function parseTabela(raw: unknown, hoje: Date = new Date()): Tabela {
  const r = criarSchema(hoje).safeParse(raw);
  if (!r.success) {
    const linhas = r.error.issues.slice(0, 25).map((i) => `  • ${i.path.join(".") || "(raiz)"}: ${i.message}`);
    const mais = r.error.issues.length > 25 ? `\n  … e mais ${r.error.issues.length - 25}` : "";
    throw new Error(`data/tabela-ia.json inválido (${r.error.issues.length} problema(s)):\n${linhas.join("\n")}${mais}`);
  }
  return r.data;
}

/* ---------- datas ---------- */

export const isoDia = (d: Date) => d.toISOString().slice(0, 10);
const dia = (s: string) => Date.UTC(+s.slice(0, 4), +s.slice(5, 7) - 1, +s.slice(8, 10)) / 86400000;
export const diasEntre = (de: string, ate: string) => Math.round(dia(ate) - dia(de));
export const fmtData = (s: string) => `${s.slice(8, 10)}/${s.slice(5, 7)}/${s.slice(0, 4)}`;
export const fmtDiaMes = (s: string) => `${s.slice(8, 10)}/${s.slice(5, 7)}`;

/** "Novo" = modelo atual lançado há no máximo 10 dias. */
export const ehNovo = (m: Modelo, hoje: string) => m.status === "atual" && !!m.desde && diasEntre(m.desde, hoje) <= 10;

/** Depois de tantos dias sem conferir, a página avisa que pode estar velha. */
export const DIAS_PARA_AVISO = 10;
export const diasSemConferir = (t: Tabela, hoje: string) => Math.max(0, diasEntre(t.verificada_em, hoje));

/* ---------- dinheiro e salário ---------- */

const NBSP = " ";
const numero = (casas: number) => new Intl.NumberFormat("pt-BR", { minimumFractionDigits: casas, maximumFractionDigits: casas });
export const reais = (v: number, casas = 0) => `R$${NBSP}${numero(casas).format(v)}`;
export const fmtCambio = (c: Cambio) => `R$${NBSP}${numero(2).format(c.brl_por_usd)}`;
export const fmtIof = (c: Cambio) => `${numero(1).format(c.iof * 100)}%`;

/** Preço mensal em reais. Plano em dólar vira reais pelo câmbio + IOF do cartão. */
export function precoPlano(p: Plano, c: Cambio): { valor: number; aprox: boolean } {
  if (p.preco_brl_mes !== undefined) return { valor: p.preco_brl_mes, aprox: false };
  return { valor: (p.preco_usd_mes as number) * c.brl_por_usd * (1 + c.iof), aprox: true };
}

/** "R$ 0", "R$ 39,99" (cobrado em reais) ou "~R$ 108" (convertido). */
export function fmtPreco(p: Plano, c: Cambio): string {
  const { valor, aprox } = precoPlano(p, c);
  if (valor === 0) return `R$${NBSP}0`;
  if (aprox) return `~${reais(Math.round(valor))}`;
  return reais(valor, Number.isInteger(valor) ? 0 : 2);
}

export const apelido = (m: Modelo) => m.apelido ?? m.nome;

/** Quantas vezes o preço do modelo base. Só existe para modelo com preço de API. */
export function multiplo(m: Modelo, base: Modelo): number | null {
  if (m.preco_entrada_usd === undefined || base.preco_entrada_usd === undefined) return null;
  return Math.round((m.preco_entrada_usd / base.preco_entrada_usd) * 10) / 10;
}
export const fmtMult = (x: number) => `${numero(Number.isInteger(x) ? 0 : 1).format(x)}x`;

/* ---------- montagem das linhas da tabela por tarefa ---------- */

export type Pick = { nome: string; pill: Pill; custo: string; sub: string; fontes?: string[] };

/** Uma célula da "Tarefa por tarefa": nome, cor, custo e a observação embaixo. */
export function montarPick(t: Tabela, tf: Tarefa, provedorId: string): Pick {
  const e = tf.escolhas[provedorId];
  const prov = t.provedores.find((p) => p.id === provedorId) as Provedor;
  const base = t.modelos.find((m) => m.id === t.modelo_base) as Modelo;
  const subPlano = (pl: Plano) => (precoPlano(pl, t.cambio).valor === 0 ? `${prov.nome} grátis` : `${pl.nome}/mês`);

  if (e.rotulo !== undefined) {
    const pl = t.planos.find((p) => p.id === e.plano) as Plano;
    return { nome: e.rotulo, pill: e.pill as Pill, custo: fmtPreco(pl, t.cambio), sub: e.nota ?? subPlano(pl), fontes: e.fontes };
  }

  const m = t.modelos.find((x) => x.id === e.modelo) as Modelo;
  if (tf.tipo === "automacao") {
    const x = multiplo(m, base) as number;
    return { nome: m.nome, pill: m.pill, custo: fmtMult(x), sub: m.id === base.id ? "salário base" : `a ${apelido(base)}` };
  }
  const pl = t.planos.find((p) => p.id === (e.plano ?? m.plano_minimo)) as Plano;
  return { nome: m.nome, pill: m.pill, custo: fmtPreco(pl, t.cambio), sub: e.nota ?? subPlano(pl) };
}

/* ---------- fontes ---------- */

const ROTULOS: Record<string, string> = {
  "openai.com": "OpenAI",
  "help.openai.com": "OpenAI (ajuda)",
  "chatgpt.com": "ChatGPT",
  "anthropic.com": "Anthropic",
  "claude.com": "Claude",
  "support.claude.com": "Claude (ajuda)",
  "platform.claude.com": "Claude (docs)",
  "simonwillison.net": "Simon Willison",
  "forbes.com.br": "Forbes Brasil",
  "piranot.com.br": "Piranot",
  "oantagonista.com.br": "O Antagonista",
  "theaicareerlab.com": "AI Career Lab",
  "thenextweb.com": "The Next Web",
  "horadecodar.com.br": "Hora de Codar",
};

export function rotuloFonte(u: string): string {
  const h = new URL(u).hostname.replace(/^www\./, "");
  return ROTULOS[h] ?? h;
}

/** Uma fonte por veículo, na ordem em que aparecem na tabela. */
export function fontesDoRodape(t: Tabela): { rotulo: string; url: string }[] {
  const todas = [
    ...t.modelos.flatMap((m) => m.fontes),
    ...t.planos.flatMap((p) => p.fontes),
    ...t.mudancas.flatMap((m) => m.fontes),
    ...t.cambio.fontes,
  ];
  const vistos = new Map<string, string>();
  for (const u of todas) {
    const r = rotuloFonte(u);
    if (!vistos.has(r)) vistos.set(r, u);
  }
  return [...vistos].map(([rotulo, url]) => ({ rotulo, url }));
}
