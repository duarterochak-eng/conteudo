import Anthropic from "@anthropic-ai/sdk";

/**
 * Escolhe o modelo pela chave disponível, nesta ordem:
 *   1. ANTHROPIC_API_KEY  -> Claude (CLAUDE_MODEL, padrão claude-sonnet-5)
 *   2. GEMINI_API_KEY     -> Gemini (GEMINI_MODEL, padrão gemini-3.8-flash; tem plano gratuito)
 *   3. GROQ_API_KEY       -> Groq (GROQ_MODEL, padrão openai/gpt-oss-120b)
 * Se o escolhido falhar (limite do plano gratuito, fora do ar), tenta o próximo.
 */
export async function askJson(system: string, user: string): Promise<any> {
  const fila: [string, () => Promise<string>][] = [];
  if (process.env.ANTHROPIC_API_KEY) fila.push(["claude", () => viaClaude(system, user)]);
  if (process.env.GEMINI_API_KEY) fila.push(["gemini", () => viaGemini(system, user)]);
  if (process.env.GROQ_API_KEY) fila.push(["groq", () => viaGroq(system, user)]);
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
      return json;
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
async function viaOpenAICompat(url: string, key: string, body: Record<string, any>, nome: string) {
  const r = await fetch(url, {
    method: "POST",
    headers: { "content-type": "application/json", authorization: `Bearer ${key}` },
    body: JSON.stringify(body),
  });
  const j = await r.json();
  if (!r.ok) throw new Error(nome + " " + r.status + ": " + JSON.stringify(j).slice(0, 300));
  const txt = j.choices?.[0]?.message?.content;
  if (!txt) throw new Error(nome + ": resposta vazia");
  return txt as string;
}

/**
 * Gemini gratuito às vezes responde 503 (sobrecarga). Tenta o modelo principal,
 * depois irmãos também gratuitos, antes de desistir e cair pro Groq.
 */
async function viaGemini(system: string, user: string) {
  const modelos = [process.env.GEMINI_MODEL || "gemini-3.8-flash", "gemini-3.7-flash", "gemini-3.5-flash"];
  const unicos = modelos.filter((m, i) => modelos.indexOf(m) === i);
  let ultimo: any;
  for (const model of unicos) {
    try {
      const txt = await viaOpenAICompat(
        "https://generativelanguage.googleapis.com/v1beta/openai/chat/completions",
        process.env.GEMINI_API_KEY!,
        {
          model,
          reasoning_effort: "low", // pensamento curto: mantém a geração rápida (limite da função na Vercel)
          max_tokens: 8000,
          messages: [
            { role: "system", content: system },
            { role: "user", content: user },
          ],
        },
        "Gemini " + model
      );
      console.log(`[llm] gemini modelo ${model}`);
      return txt;
    } catch (e: any) {
      ultimo = e;
      const msg = String(e?.message || e);
      // Só troca de modelo em sobrecarga/limite; erro de chave ou de pedido não adianta repetir.
      if (!/ 503| 429| 500/.test(msg)) throw e;
      console.error(`[llm] ${model} indisponível, tentando o próximo`);
    }
  }
  throw ultimo;
}

async function viaGroq(system: string, user: string) {
  return viaOpenAICompat(
    "https://api.groq.com/openai/v1/chat/completions",
    process.env.GROQ_API_KEY!,
    {
      model: process.env.GROQ_MODEL || "openai/gpt-oss-120b",
      temperature: 0.4,
      max_tokens: 4000,
      messages: [
        { role: "system", content: system },
        { role: "user", content: user },
      ],
    },
    "Groq"
  );
}
