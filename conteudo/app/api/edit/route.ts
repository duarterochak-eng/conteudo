import { NextResponse } from "next/server";
import { db } from "@/lib/supabase";
import { askJson } from "@/lib/llm";
import { Spec } from "@/lib/spec";

export const runtime = "nodejs";
export const maxDuration = 60;

const SYSTEM = `Você edita o JSON de um carrossel de Instagram. Receba o JSON atual e a instrução do dono do perfil.

REGRAS
- Responda APENAS com o JSON completo e válido do carrossel, sem texto antes ou depois.
- Mude só o que a instrução pede. Mantenha o resto idêntico.
- Se a instrução citar um slide, mexa só nele (slide 1 = índice 0).
- Texto: <em>palavra</em> deixa laranja, <mark>palavra</mark> grifa em laranja. Use no máximo 2 grifos por slide.
- Título de capa: no máximo 9 palavras. Corpo: no máximo 28 palavras.
- "texto maior/menor" = ajuste o campo size (70 a 190).
- "mais visual" = use items, flow ou chat no slide, não mais texto.
- NUNCA invente números, resultados, clientes ou datas. Se a instrução pedir um número que não está no JSON, use o texto [PROVA] no lugar.
- Português do Brasil, direto, sem emoji.`;

/**
 * POST /api/edit
 * body: { carousel_id, spec, instrucao, slide_index? }
 * Devolve o spec novo (ainda não renderizado).
 */
export async function POST(req: Request) {
  try {
    const { carousel_id, spec, instrucao, slide_index } = await req.json();
    const atual = Spec.parse(spec);

    const user = `JSON ATUAL:
${JSON.stringify(atual)}

INSTRUÇÃO${slide_index != null ? ` (sobre o slide ${slide_index + 1})` : ""}:
${instrucao}`;

    const novo = Spec.parse(await askJson(SYSTEM, user));

    if (carousel_id) {
      await db.from("review_messages").insert([
        { carousel_id, slide_index: slide_index ?? null, role: "user", content: instrucao },
        { carousel_id, slide_index: slide_index ?? null, role: "assistant", content: "Ajuste aplicado." },
      ]);
      await db.from("editorial_events").insert({
        entity: "carousel",
        entity_id: carousel_id,
        event: "edicao",
        slide_index: slide_index ?? null,
        instruction: instrucao,
        diff: { antes: atual, depois: novo },
      });
    }

    return NextResponse.json({ ok: true, spec: novo });
  } catch (e: any) {
    return NextResponse.json({ erro: String(e?.message || e) }, { status: 500 });
  }
}
