import Anthropic from "@anthropic-ai/sdk";

/**
 * Fila de modelos. Ordem padrão (muda com LLM_ORDER="gemini,openrouter,groq"):
 *   claude     -> ANTHROPIC_API_KEY  (CLAUDE_MODEL, padrão claude-sonnet-5)
 *   gemini     -> GEMINI_API_KEY     (só 3.8 e 3.7; o 3.5 escrevia mal e saiu)
 *   openrouter -> OPENROUTER_API_KEY (modelos grátis, OPENROUTER_MODELS separados por vírgula)
 *   groq       -> GROQ_API_KEY       (GROQ_MODEL, padrão openai/gpt-oss-120b)
 * Se um falhar (sobrecarga, limite grátis), tenta o próximo.
 */
export async function askJson(system: string, user: string): Promise<any> {
  return (await askJsonVia(system, user)).json;
}

/** Igual ao askJson, mas diz quem respondeu. `only` força um provedor (nova tentativa rápida). */
export async function askJsonVia(system: string, user: string, only?: string): Promise<{ json: any; via: string }> {
  const todos: Record<string, [string | undefined, () => Promise<string>]> = {
    claude: [process.env.ANTHROPIC_API_KEY, () => viaClaude(system, user)],
    gemini: [process.env.GEMINI_API_KEY, () => viaGemini(system, user)],
    openrouter: [process.env.OPENROUTER_API_KEY, () => viaOpenRouter(system, user)],
    groq: [process.env.GROQ_API_KEY, () => viaGroq(system, user)],
  };
  const ordem = (process.env.LLM_ORDER || "claude,gemini,openrouter,groq").split(",").map((x) => x.trim());
  const fila: [string, () => Promise<string>][] = ordem
    .filter((n) => todos[n]?.[0] && (!only || n === only))
    .map((n) => [n, todos[n][1]]);
  if (!fila.length) throw new Error("Nenhuma chave de IA configurada na Vercel.");

  const erros: string[] = [];
  for (const [nome, chamar] of fila) {
    try {
      const t0 = Date.now();
      const raw = await chamar();
      const m = raw.match(/\{[\s\S]*\}/);
      if (!m) throw new Error("não devolveu JSON: " + raw.slice(0, 200));
      const json = JSON.parse(m[0]);
      console.log(`[llm] ${nome} ok ${Date.now() - t0}ms`);
      return { json, via: nome };
    } catch (e: any) {
      console.error(`[llm] ${nome} falhou:`, e?.message || e);
      erros.push(`${nome}: ${String(e?.message || e).slice(0, 200)}`);
    }
  }
  throw new Error("Todos os modelos falharam. " + erros.join(" | "));
}

async function viaClaude(system: string, user: string) {
  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  const r = await client.messages.create({
    model: process.env.CLAUDE_MODEL || "claude-sonnet-5",
    max_tokens: 4000,
    system,
    messages: [{ role: "user", content: user }],
  });
  return r.content.map((c: any) => (c.type === "text" ? c.text : "")).join("");
}

/** Endpoint compatível com OpenAI; mesma forma de chamada do Groq. */
const espera = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function viaOpenAICompat(url: string, key: string, body: Record<string, any>, nome: string, timeoutMs = 35000) {
  const r = await fetch(url, {
    signal: AbortSignal.timeout(timeoutMs), // modelo grátis travado não pode comer o tempo todo da função
    method: "POST",
    headers: { "content-type": "application/json", authorization: `Bearer ${key}` },
    body: JSON.stringify(body),
  });
  const j = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(nome + " " + r.status + ": " + JSON.stringify(j).slice(0, 300));
  const txt = j.choices?.[0]?.message?.content;
  if (!txt) throw new Error(nome + ": resposta vazia (" + (j.choices?.[0]?.finish_reason || "sem motivo") + ")");
  return txt as string;
}

/** Sobrecarga e limite são passageiros: vale 1 nova tentativa curta. */
const passageiro = (e: any) => / (429|500|502|503|504):|timeout|aborted/i.test(String(e?.message || e));

/**
 * Tenta cada modelo; em sobrecarga (429/503) espera e tenta mais 1 vez antes de pular.
 * Para quando passa do prazo, para sobrar tempo pros próximos provedores.
 */
export async function emFila(nome: string, modelos: string[], chamar: (m: string) => Promise<string>, prazoMs: number) {
  const t0 = Date.now();
  let ultimo: any = new Error(nome + ": nenhum modelo");
  for (const m of modelos) {
    for (let tentativa = 0; tentativa < 2; tentativa++) {
      if (Date.now() - t0 > prazoMs) throw new Error(nome + ": prazo esgotado; último erro: " + String(ultimo?.message || ultimo).slice(0, 200));
      try {
        const txt = await chamar(m);
        if (!/\{[\s\S]*\}/.test(txt)) throw new Error(m + ": sem JSON");
        console.log(`[llm] ${nome} modelo ${m}${tentativa ? " (2a tentativa)" : ""}`);
        return txt;
      } catch (e: any) {
        ultimo = e;
        console.error(`[llm] ${m} falhou:`, String(e?.message || e).slice(0, 160));
        if (!passageiro(e)) break; // erro de nome/chave: não adianta repetir
        if (tentativa === 0) await espera(3000);
      }
    }
  }
  throw ultimo;
}

const lista = (v: string | undefined, padrao: string) => (v || padrao).split(",").map((m) => m.trim()).filter(Boolean);

export const GEMINI_MODELOS = () => lista(process.env.GEMINI_MODELS || process.env.GEMINI_MODEL, "gemini-3.8-flash,gemini-3.7-flash");
export const OR_MODELOS = () =>
  lista(process.env.OPENROUTER_MODELS, "z-ai/glm-5.2:free,qwen/qwen3.8-27b:free,google/gemma-4-31b-it:free,nvidia/nemotron-3-super-120b-a12b:free,openrouter/free");

export function chamarGemini(model: string, system: string, user: string, maxTokens = 8000, timeoutMs = 35000) {
  return viaOpenAICompat(
    "https://generativelanguage.googleapis.com/v1beta/openai/chat/completions",
    process.env.GEMINI_API_KEY!,
    {
      model,
      reasoning_effort: "low", // pensamento curto: mantém a geração rápida
      max_tokens: maxTokens,
      messages: [
        { role: "system", content: system },
        { role: "user", content: user },
      ],
    },
    "Gemini " + model,
    timeoutMs
  );
}

export function chamarOpenRouter(model: string, system: string, user: string, maxTokens = 8000, timeoutMs = 35000) {
  return viaOpenAICompat(
    "https://openrouter.ai/api/v1/chat/completions",
    process.env.OPENROUTER_API_KEY!,
    {
      model,
      temperature: 0.5,
      max_tokens: maxTokens,
      // Modelo que "pensa" gastava todos os tokens raciocinando e devolvia vazio (caso do Nemotron).
      reasoning: { effort: "low", exclude: true },
      messages: [
        { role: "system", content: system },
        { role: "user", content: user },
      ],
    },
    "OpenRouter " + model,
    timeoutMs
  );
}

async function viaGemini(system: string, user: string) {
  return emFila("gemini", GEMINI_MODELOS(), (m) => chamarGemini(m, system, user), 45000);
}

/** OpenRouter grátis: GLM e Qwen caem por limite do provedor (429); por isso a fila é longa e termina no roteador grátis. */
async function viaOpenRouter(system: string, user: string) {
  return emFila("openrouter", OR_MODELOS(), (m) => chamarOpenRouter(m, system, user), 60000);
}

export function chamarGroq(system: string, user: string, maxTokens = 4000) {
  return viaOpenAICompat(
    "https://api.groq.com/openai/v1/chat/completions",
    process.env.GROQ_API_KEY!,
    {
      model: process.env.GROQ_MODEL || "openai/gpt-oss-120b",
      temperature: 0.4,
      max_tokens: maxTokens,
      messages: [
        { role: "system", content: system },
        { role: "user", content: user },
      ],
    },
    "Groq"
  );
}
const viaGroq = (system: string, user: string) => chamarGroq(system, user);
