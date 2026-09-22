import Anthropic from "@anthropic-ai/sdk";

/** Usa Claude Haiku se houver chave; senão cai pro Groq (compatível com a API da OpenAI). */
export async function askJson(system: string, user: string): Promise<any> {
  const raw = process.env.ANTHROPIC_API_KEY ? await viaClaude(system, user) : await viaGroq(system, user);
  const m = raw.match(/\{[\s\S]*\}/);
  if (!m) throw new Error("LLM não devolveu JSON: " + raw.slice(0, 300));
  return JSON.parse(m[0]);
}

async function viaClaude(system: string, user: string) {
  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  const r = await client.messages.create({
    model: process.env.CLAUDE_MODEL || "claude-haiku-4-5",
    max_tokens: 4000,
    system,
    messages: [{ role: "user", content: user }],
  });
  return r.content.map((c: any) => (c.type === "text" ? c.text : "")).join("");
}

async function viaGroq(system: string, user: string) {
  const r = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${process.env.GROQ_API_KEY}`,
    },
    body: JSON.stringify({
      model: process.env.GROQ_MODEL || "llama-3.3-70b-versatile",
      temperature: 0.4,
      max_tokens: 4000,
      messages: [
        { role: "system", content: system },
        { role: "user", content: user },
      ],
    }),
  });
  const j = await r.json();
  if (!r.ok) throw new Error("Groq: " + JSON.stringify(j).slice(0, 300));
  return j.choices[0].message.content as string;
}
