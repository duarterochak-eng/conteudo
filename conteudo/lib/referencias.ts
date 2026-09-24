import { z } from "zod";
import { db } from "./supabase";
import { askJson, askJsonVia, emFila, GEMINI_MODELOS } from "./llm";
import { FORMATOS, NOMES_FORMATO } from "./formatos";
import { REGRAS_COMUNS, PERSONA } from "./redacao";

/**
 * Fluxo de Ideias: o Kawan sobe um vídeo ou print.
 * Etapa 1 (leitura): arquivo + nota → { resumo, fatos }.
 * Etapa 2 (ângulos): fatos + nota + persona → 4 ideias gravadas em pautas.
 * A redação (etapa 3) só roda na aprovação.
 */

export const BUCKET_REF = "referencias";
export const EXT_OK: Record<string, { tipo: "video" | "imagem"; mime: string }> = {
  mp4: { tipo: "video", mime: "video/mp4" },
  mov: { tipo: "video", mime: "video/mov" },
  png: { tipo: "imagem", mime: "image/png" },
  jpg: { tipo: "imagem", mime: "image/jpeg" },
  jpeg: { tipo: "imagem", mime: "image/jpeg" },
  webp: { tipo: "imagem", mime: "image/webp" },
};
export const MAX_BYTES = 25 * 1024 * 1024;
const GEMINI_INLINE_MAX = 20 * 1024 * 1024;

export type Leitura = { resumo: string; fatos: string[] };

const PEDIDO = `Leia este conteúdo de rede social e responda em português, só com JSON, sem texto fora dele:
{"resumo":"até 120 palavras: assunto, gancho dos primeiros segundos, estrutura, por que prende a atenção","fatos":["até 6 afirmações concretas que o conteúdo faz, sem interpretar nem completar"]}
Fato é o que o conteúdo diz ou mostra. Não invente número, nome ou data que não apareça.`;

const pedidoCom = (nota?: string | null) => (nota ? `${PEDIDO}\n\nO que chamou a atenção do Kawan: ${nota}` : PEDIDO);

const LeituraZ = z.object({
  resumo: z.string().min(1),
  fatos: z.array(z.string().min(1)).min(1).transform((a) => a.slice(0, 6)),
});
const leituraOk = (j: any) => LeituraZ.parse(j) as Leitura;

// ---------- chamadas multimodais ----------

/** Gemini nativo (generateContent) com o arquivo inline. */
async function geminiInline(model: string, mime: string, b64: string, texto: string) {
  const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`, {
    signal: AbortSignal.timeout(90000), // vídeo demora mais que texto
    method: "POST",
    headers: { "content-type": "application/json", "x-goog-api-key": process.env.GEMINI_API_KEY! },
    body: JSON.stringify({
      contents: [{ role: "user", parts: [{ inline_data: { mime_type: mime, data: b64 } }, { text: texto }] }],
      generationConfig: { responseMimeType: "application/json", maxOutputTokens: 4000 },
    }),
  });
  const j = await r.json().catch(() => ({}));
  // o " 503:" no texto faz o emFila tentar de novo
  if (!r.ok) throw new Error(`Gemini ${model} ${r.status}: ${JSON.stringify(j).slice(0, 300)}`);
  const txt = (j.candidates?.[0]?.content?.parts || []).map((p: any) => p.text || "").join("");
  if (!txt) throw new Error(`Gemini ${model}: resposta vazia (${j.candidates?.[0]?.finishReason || "sem motivo"})`);
  return txt as string;
}

const jsonDe = (txt: string) => {
  const m = txt.match(/\{[\s\S]*\}/);
  if (!m) throw new Error("não devolveu JSON: " + txt.slice(0, 200));
  return JSON.parse(m[0]);
};

async function lerComGemini(mime: string, buf: Buffer, nota?: string | null) {
  if (!process.env.GEMINI_API_KEY) throw new Error("sem GEMINI_API_KEY");
  const b64 = buf.toString("base64");
  const txt = await emFila("gemini-leitura", GEMINI_MODELOS(), (m) => geminiInline(m, mime, b64, pedidoCom(nota)), 100000);
  return jsonDe(txt);
}

/** Groq Whisper (whisper-large-v3): aceita até 25 MB. */
async function transcrever(buf: Buffer, ext: string) {
  if (!process.env.GROQ_API_KEY) throw new Error("sem GROQ_API_KEY");
  const form = new FormData();
  // .mov é o mesmo contêiner do mp4; o nome .mp4 evita recusa pela extensão
  form.append("file", new Blob([new Uint8Array(buf)], { type: "video/mp4" }), ext === "mov" ? "video.mp4" : `video.${ext}`);
  form.append("model", "whisper-large-v3");
  form.append("language", "pt");
  form.append("response_format", "json");
  const r = await fetch("https://api.groq.com/openai/v1/audio/transcriptions", {
    signal: AbortSignal.timeout(90000),
    method: "POST",
    headers: { authorization: `Bearer ${process.env.GROQ_API_KEY}` },
    body: form,
  });
  const j = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(`Whisper ${r.status}: ${JSON.stringify(j).slice(0, 300)}`);
  if (!j.text?.trim()) throw new Error("Whisper: transcrição vazia");
  return j.text as string;
}

/** Visão do Groq pela URL assinada (base64 no Groq é limitado a 4 MB). */
async function lerComGroqVisao(url: string, nota?: string | null) {
  if (!process.env.GROQ_API_KEY) throw new Error("sem GROQ_API_KEY");
  const model = process.env.GROQ_VISION_MODEL || "meta-llama/llama-4-scout-17b-16e-instruct";
  const r = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    signal: AbortSignal.timeout(60000),
    method: "POST",
    headers: { "content-type": "application/json", authorization: `Bearer ${process.env.GROQ_API_KEY}` },
    body: JSON.stringify({
      model,
      temperature: 0.2,
      max_tokens: 2000,
      messages: [{ role: "user", content: [{ type: "text", text: pedidoCom(nota) }, { type: "image_url", image_url: { url } }] }],
    }),
  });
  const j = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(`Groq visão ${model} ${r.status}: ${JSON.stringify(j).slice(0, 300)}`);
  return jsonDe(j.choices?.[0]?.message?.content || "");
}

// ---------- etapa 1: leitura ----------

export async function lerReferencia(ref: { path: string; tipo: string; nota?: string | null }): Promise<Leitura> {
  const ext = ref.path.split(".").pop()!.toLowerCase();
  const info = EXT_OK[ext];
  if (!info) throw new Error("extensão não aceita: " + ext);

  const { data: blob, error } = await db.storage.from(BUCKET_REF).download(ref.path);
  if (error || !blob) throw new Error("download: " + (error?.message || "vazio"));
  const buf = Buffer.from(await blob.arrayBuffer());
  const erros: string[] = [];

  if (buf.length <= GEMINI_INLINE_MAX) {
    try {
      return leituraOk(await lerComGemini(info.mime, buf, ref.nota));
    } catch (e: any) {
      erros.push(String(e?.message || e).slice(0, 200));
      console.error("[leitura] gemini falhou:", erros[0]);
    }
  } else erros.push(`arquivo com ${(buf.length / 1048576).toFixed(1)} MB: maior que o limite inline do Gemini`);

  try {
    if (info.tipo === "video") {
      const fala = await transcrever(buf, ext);
      const json = await askJson(
        "Você extrai fatos de vídeos de rede social a partir da transcrição do áudio. Não vê a imagem: não descreva o que não está na fala.",
        `${pedidoCom(ref.nota)}\n\nTRANSCRIÇÃO:\n${fala.slice(0, 12000)}`
      );
      return leituraOk(json);
    }
    const { data: assinada } = await db.storage.from(BUCKET_REF).createSignedUrl(ref.path, 600);
    if (!assinada?.signedUrl) throw new Error("não gerou URL assinada");
    return leituraOk(await lerComGroqVisao(assinada.signedUrl, ref.nota));
  } catch (e: any) {
    erros.push(String(e?.message || e).slice(0, 200));
    throw new Error("Leitura falhou. " + erros.join(" | "));
  }
}

// ---------- etapa 2: ângulos ----------

const IdeiaZ = z.object({
  titulo: z.string().min(1),
  formato: z.enum(NOMES_FORMATO as [string, ...string[]]),
  pilar: z.enum(["tempo", "desempenho", "bastidor", "opiniao"]),
  por_que: z.string().default(""),
  capas: z.array(z.string().min(1)).min(1).transform((a) => a.slice(0, 3)),
  roteiro: z.array(z.string()).min(1).transform((a) => a.slice(0, 7)),
  fatos_usados: z.array(z.coerce.number().int()).default([]),
});
export type Ideia = z.infer<typeof IdeiaZ>;

const SYSTEM_ANGULOS = `Você propõe ângulos de carrossel de Instagram a partir de fatos de um conteúdo de referência.

PERFIL: ${PERSONA}

${REGRAS_COMUNS}

FORMATOS (use o id):
${NOMES_FORMATO.map((f) => `- ${f}: ${FORMATOS[f].quando}`).join("\n")}

PILARES: tempo, desempenho, bastidor, opiniao.

REGRAS
- Proponha 4 ideias, cada uma num formato DIFERENTE.
- bastidor só se a nota do Kawan disser que é caso próprio dele.
- A ideia desenvolve o assunto a favor, sempre para o dono de PME.
- capas: 3 opções de até 9 palavras, com ângulos diferentes entre si (tensão, resultado, pergunta). Nunca o molde "Não falta X, sobra Y". Nunca "Como...", "Aprenda...".
- roteiro: 7 linhas curtas, o papel de cada slide (a última é o final "Salva pra aplicar").
- por_que: uma frase dizendo o que, nos fatos, sustenta a ideia.
- fatos_usados: índices (começando em 1) dos fatos que a ideia usa.

SAÍDA: só JSON, sem texto fora dele:
{"ideias":[{"titulo":"...","formato":"...","pilar":"...","por_que":"...","capas":["...","...","..."],"roteiro":["1 ...","2 ...","3 ...","4 ...","5 ...","6 ...","7 ..."],"fatos_usados":[1,2]}]}`;

const palavras = (s: string) => s.trim().split(/\s+/).filter(Boolean).length;

function checarIdeias(json: any) {
  const ok: Ideia[] = [];
  const problemas: string[] = [];
  const brutas: any[] = Array.isArray(json?.ideias) ? json.ideias : [];
  brutas.forEach((b, i) => {
    const r = IdeiaZ.safeParse(b);
    if (!r.success) return void problemas.push(`Ideia ${i + 1}: campos inválidos (${r.error.issues.map((x) => x.path.join(".")).join(", ")}).`);
    if (ok.some((x) => x.formato === r.data.formato)) return void problemas.push(`Ideia ${i + 1}: formato ${r.data.formato} repetido.`);
    r.data.capas.forEach((c) => {
      if (palavras(c) > 9) problemas.push(`Ideia ${i + 1}: capa "${c}" com mais de 9 palavras.`);
      if (/n[ãa]o falta\b[\s\S]{1,40}\bsobra\b/i.test(c)) problemas.push(`Ideia ${i + 1}: capa "${c}" no molde proibido.`);
    });
    ok.push(r.data);
  });
  if (ok.length < 4) problemas.push(`Vieram ${ok.length} ideias válidas; são 4, com formatos diferentes.`);
  return { ok, problemas };
}

export async function gerarAngulos(fatos: string[], nota?: string | null): Promise<Ideia[]> {
  const user = `NOTA DO KAWAN: ${nota || "(sem nota)"}

FATOS:
${fatos.map((f, i) => `${i + 1}. ${f}`).join("\n")}`;
  const r1 = await askJsonVia(SYSTEM_ANGULOS, user);
  let res = checarIdeias(r1.json);
  if (res.problemas.length) {
    console.log("[angulos] 1a:", res.problemas.join(" / "));
    try {
      const r2 = await askJsonVia(SYSTEM_ANGULOS, `${user}\n\nVOCÊ JÁ RESPONDEU:\n${JSON.stringify(r1.json)}\n\nCorrija e devolva o JSON completo:\n- ${res.problemas.join("\n- ")}`, r1.via);
      const res2 = checarIdeias(r2.json);
      if (res2.ok.length > res.ok.length || (res2.ok.length === res.ok.length && res2.problemas.length < res.problemas.length)) res = res2;
    } catch (e: any) {
      console.error("[angulos] retry falhou", e?.message || e);
    }
  }
  if (!res.ok.length) throw new Error("O modelo não devolveu ideias válidas. " + res.problemas.join(" "));
  return res.ok.slice(0, 4);
}
