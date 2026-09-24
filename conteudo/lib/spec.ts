import { z } from "zod";

/**
 * Formato do carrossel. É a fonte da verdade:
 * a imagem é só o render deste JSON. Toda edição pelo chat muda este objeto.
 * Texto aceita <em>laranja</em> e <mark>grifo laranja</mark>.
 */

/** Componentes visuais (a imagem carrega a informação, não é enfeite). */
export const ICONES = ["whatsapp", "ia", "crm", "alerta", "planilha", "email", "cliente", "relogio", "doc", "agenda", "dinheiro", "check"] as const;
const Par = z.tuple([z.string(), z.string()]);
const ate = (n: number) => z.array(z.string()).min(1).transform((a) => a.slice(0, n));
const icone = z.string().transform((x) => ((ICONES as readonly string[]).includes(x) ? x : "doc"));
export const Visuais = {
  // ficha de sistema: CRM, cadastro, pedido. state "ruim" = campos vazios/desatualizados
  ficha: z.object({ title: z.string(), icon: icone.optional(), rows: z.array(Par).min(1).transform((a) => a.slice(0, 5)), state: z.enum(["ok", "ruim"]).default("ok") }).optional(),
  // antes e depois lado a lado
  compare: z
    .object({
      before: z.object({ title: z.string().default("Hoje"), items: ate(4) }),
      after: z.object({ title: z.string().default("Com processo"), items: ate(4) }),
    })
    .optional(),
  // o mesmo dado digitado em vários lugares
  repete: z.object({ data: z.array(Par).min(1).transform((a) => a.slice(0, 3)), systems: ate(4) }).optional(),
  // ícone de cada etapa do flow (mesma ordem)
  flow_icons: z.array(icone).transform((a) => a.slice(0, 5)).optional(),
};

export const SlideCover = z.object({
  type: z.literal("cover"),
  title: z.string(),
  giant: z.string().optional(), // palavra gigante atrás da foto
  eyebrow: z.string().optional(),
  tag: z.string().optional(), // pílula "4 etapas"
  photo: z.string().optional(), // nome da pose (avatar_poses.name)
  size: z.number().min(70).max(190).default(124),
  giant_size: z.number().min(120).max(420).default(300),
});

export const SlideStatement = z.object({
  type: z.literal("statement"),
  label: z.string().optional(), // "01 / O PROBLEMA"
  title: z.string(),
  body: z.string().default(""),
  size: z.number().min(70).max(190).default(140),
  ...Visuais,
});

export const SlideStep = z.object({
  type: z.literal("step"),
  label: z.string().optional(),
  title: z.string(),
  body: z.string().default(""),
  size: z.number().min(70).max(190).default(130),
  items: z.array(z.string()).max(6).optional(),
  flow: z.array(z.string()).max(5).optional(),
  flow_on: z.number().int().min(0).max(4).optional(),
  chat: z
    .array(z.object({ side: z.enum(["lead", "me"]), who: z.string(), text: z.string() }))
    .max(4)
    .optional(),
  ...Visuais,
});

export const SlideCta = z.object({
  type: z.literal("cta"),
  eyebrow: z.string().default("Quer o material?"),
  sub: z.string().default("Te mando no direct:"),
  deliver: z.array(z.string()).min(1).max(4),
  photo: z.string().optional(),
});

export const Slide = z.discriminatedUnion("type", [SlideCover, SlideStatement, SlideStep, SlideCta]);

export const Spec = z.object({
  slug: z.string(),
  keyword: z.string(), // palavra do "Comenta X"
  handle: z.string().default("@kawan"),
  caption: z.string().default(""),
  slides: z.array(Slide).min(3).max(10),
});

export type TSpec = z.infer<typeof Spec>;
export type TSlide = z.infer<typeof Slide>;
