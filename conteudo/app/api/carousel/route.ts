import { NextResponse } from "next/server";
import { db } from "@/lib/supabase";
import { askJson } from "@/lib/llm";
import { Spec } from "@/lib/spec";

export const runtime = "nodejs";
export const maxDuration = 60;

const SYSTEM = `Você escreve carrosséis de Instagram para um perfil que fala com DONOS DE PEQUENAS E MÉDIAS EMPRESAS sobre IA aplicada à operação (atendimento, vendas, cobrança, processos).

SAÍDA: apenas o JSON, sem texto fora dele, neste formato:
{"slug":"kebab-case","keyword":"PALAVRA","handle":"@kawan","caption":"...","slides":[...]}

TIPOS DE SLIDE
- {"type":"cover","title":"...","giant":"PALAVRA","eyebrow":"...","tag":"...","photo":"nome-da-pose","size":124,"giant_size":300}
- {"type":"statement","label":"01 / O PROBLEMA","title":"...","body":"...","size":140}
- {"type":"step","label":"02 / PASSO 1","title":"...","body":"...","size":130, e OPCIONALMENTE items[] OU flow[]+flow_on OU chat[{side:"lead"|"me",who,text}]}
- {"type":"cta","eyebrow":"Quer o material?","sub":"Te mando no direct:","deliver":["...","...","..."],"photo":"nome-da-pose"}

ESTRUTURA PADRÃO (7 slides): capa · problema · 4 passos/peças · cta.

REGRAS DE ESCRITA
- Português do Brasil, direto, frases curtas, sem emoji, sem jargão.
- Capa: no máximo 9 palavras. Corpo de slide: no máximo 28 palavras.
- <em>palavra</em> = laranja. <mark>palavra</mark> = grifo. No máximo 2 por slide.
- Fale com quem tem empresa pequena, não com entusiasta de IA.
- NUNCA invente número, cliente, case ou resultado. Só use os números que vierem em PROVAS. Sem prova, escreva em modo teste/demonstração ("testei", "montei", "como eu faria").
- A legenda repete o gancho, traz 3 a 5 bullets curtos e fecha com "Comenta PALAVRA que eu te mando ...".`;

/**
 * POST /api/carousel  { tema, keyword?, provas?[], slot_date? }
 * Cria o carrossel, gera o spec com o LLM e devolve para o front mandar renderizar.
 */
export async function POST(req: Request) {
  try {
    const { tema, keyword, provas, slot_date } = await req.json();

    const { data: poses } = await db.from("avatar_poses").select("name,tags").eq("active", true);
    const nomes = (poses || []).map((p: any) => `${p.name} (${(p.tags || []).join(", ")})`).join(" · ") || "nenhuma";

    const user = `TEMA: ${tema}
PALAVRA-CHAVE SUGERIDA: ${keyword || "escolha uma, curta e em CAIXA ALTA"}
PROVAS DISPONÍVEIS: ${provas?.length ? provas.join(" | ") : "nenhuma"}
POSES DISPONÍVEIS (campo photo): ${nomes}`;

    const spec = Spec.parse(await askJson(SYSTEM, user));

    const { data: pauta } = await db
      .from("pautas")
      .insert({ title: tema, keyword: spec.keyword, status: "em_producao", mode: provas?.length ? "resultado" : "demonstracao" })
      .select("id")
      .single();

    const { data: car } = await db
      .from("carousels")
      .insert({ pauta_id: pauta?.id, status: "gerando", caption: spec.caption, slot_date: slot_date || null })
      .select("id")
      .single();

    return NextResponse.json({ ok: true, carousel_id: car?.id, spec });
  } catch (e: any) {
    return NextResponse.json({ erro: String(e?.message || e) }, { status: 500 });
  }
}
