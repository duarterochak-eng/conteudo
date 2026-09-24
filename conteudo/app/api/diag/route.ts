import { NextResponse } from "next/server";
import { GEMINI_MODELOS, OR_MODELOS, chamarGemini, chamarOpenRouter, chamarGroq } from "@/lib/llm";

export const runtime = "nodejs";
export const maxDuration = 120;
export const dynamic = "force-dynamic";

/**
 * GET /api/diag — testa cada modelo com uma pergunta mínima, em paralelo.
 * Mostra quem responde, em quanto tempo e o erro de quem não responde.
 */
const SYS = 'Responda apenas com JSON.';
const USER = 'Devolva exatamente: {"ok":true,"frase":"<uma frase curta em português sobre atendimento no WhatsApp>"}';

async function medir(nome: string, fn: () => Promise<string>) {
  const t0 = Date.now();
  try {
    const txt = await fn();
    return { nome, ok: true, ms: Date.now() - t0, resposta: txt.slice(0, 160) };
  } catch (e: any) {
    return { nome, ok: false, ms: Date.now() - t0, erro: String(e?.message || e).slice(0, 300) };
  }
}

export async function GET() {
  const testes: Promise<any>[] = [];
  if (process.env.GEMINI_API_KEY) for (const m of GEMINI_MODELOS()) testes.push(medir("gemini " + m, () => chamarGemini(m, SYS, USER, 1500, 40000)));
  if (process.env.OPENROUTER_API_KEY) for (const m of OR_MODELOS()) testes.push(medir("openrouter " + m, () => chamarOpenRouter(m, SYS, USER, 1500, 40000)));
  if (process.env.GROQ_API_KEY) testes.push(medir("groq " + (process.env.GROQ_MODEL || "openai/gpt-oss-120b"), () => chamarGroq(SYS, USER, 500)));

  // Modelos Gemini que a sua chave enxerga (para achar nomes que existem de verdade)
  let gemini_disponiveis: string[] = [];
  if (process.env.GEMINI_API_KEY) {
    try {
      const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?pageSize=200&key=${process.env.GEMINI_API_KEY}`);
      const j = await r.json();
      gemini_disponiveis = (j.models || []).map((m: any) => String(m.name).replace("models/", "")).filter((n: string) => /flash|pro|gemma/.test(n));
    } catch {}
  }

  const resultados = await Promise.all(testes);
  console.log("[diag]", JSON.stringify(resultados));
  return NextResponse.json({ ordem: process.env.LLM_ORDER || "claude,gemini,openrouter,groq", resultados, gemini_disponiveis });
}
