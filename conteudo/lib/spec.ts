import { z } from "zod";

/**
 * Formato do carrossel. É a fonte da verdade:
 * a imagem é só o render deste JSON. Toda edição pelo chat muda este objeto.
 * Texto aceita <em>laranja</em> e <mark>grifo laranja</mark>.
 */

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
