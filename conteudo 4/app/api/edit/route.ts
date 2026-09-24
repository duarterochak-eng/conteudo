import { NextResponse } from "next/server";
import { db } from "@/lib/supabase";
import { askJson } from "@/lib/llm";
import { Spec, Slide } from "@/lib/spec";

export const runtime = "nodejs";
export const maxDuration = 60;

const REGRAS = `COMO INTERPRETAR O PEDIDO
- A instrução é a INTENÇÃO do dono, não texto para colar. Gíria vira ação:
  "sem graça", "falta molho", "tá fraco" = deixar mais forte e visual; nunca escreva essas palavras no slide.
  Só copie texto literal quando vier entre aspas.
- "falta cor" / "mais cor": use <em>palavra</em> (laranja) ou <mark>palavra</mark> (grifo) em 1 ou 2 palavras-chave do título ou corpo; em flow, ponha flow_on na etapa principal.
- "mais visual": troque parágrafo por UM destes visuais:
  chat [{"side":"lead"|"me","who","text"}] · compare {"before":{"title","items"},"after":{"title","items"}} ·
  repete {"data":[["Campo","valor"]],"systems":["WhatsApp","Planilha"]} · ficha {"title","icon","state":"ruim"|"ok","rows":[["Campo","valor"]]} ·
  flow + flow_on + flow_icons (whatsapp, ia, crm, alerta, planilha, email, cliente, relogio, doc, agenda, dinheiro, check) · items.
- "texto maior/menor": ajuste o campo size (70 a 190).
- "gancho mais forte": título mais curto, com tensão ou resultado concreto.
- Se o pedido for sobre layout que o JSON não controla (posição, fundo, fonte), faça o melhor com os campos disponíveis e diga no resumo o que não dá para mudar.

LIMITES
- Título de passo: até 6 palavras. Corpo: até 28 palavras (até 20 se houver items).
- items: 2 a 3, até 6 palavras cada. flow: 3 a 4 etapas de 1 a 2 palavras. chat: 2 a 3 balões de até 18 palavras.
- No máximo 2 <em>/<mark> por slide.
- NUNCA invente números, resultados, clientes ou datas.
- Português do Brasil, direto, sem emoji.

RESUMO
- "resumo": uma frase curta dizendo o que você mudou ("Grifei 'atendente' e destaquei a etapa Agente no fluxo").`;

const SYSTEM_SLIDE = `Você edita UM slide de um carrossel de Instagram (JSON).
Responda APENAS com: {"slide":{...o slide editado, mesmo "type"...},"resumo":"..."}

${REGRAS}`;

const SYSTEM_TUDO = `Você edita o JSON de um carrossel de Instagram.
Responda APENAS com: {"spec":{...o carrossel completo...},"resumo":"..."}
Mude só o que a instrução pede e mantenha o resto idêntico.

${REGRAS}`;

/**
 * POST /api/edit
 * body: { carousel_id, spec, instrucao, slide_index? }
 * Com slide_index, o modelo recebe e devolve SÓ aquele slide, e o servidor encaixa no lugar certo.
 * (Antes o modelo recebia o carrossel inteiro e às vezes editava o slide vizinho.)
 */
export async function POST(req: Request) {
  try {
    const { carousel_id, spec, instrucao, slide_index } = await req.json();
    const atual = Spec.parse(spec);
    let novo;
    let resumo = "Ajuste aplicado.";

    if (slide_index != null && atual.slides[slide_index]) {
      const alvo = atual.slides[slide_index];
      const user = `SLIDE ATUAL (${slide_index + 1} de ${atual.slides.length}, palavra-chave do carrossel: ${atual.keyword}):
${JSON.stringify(alvo)}

INSTRUÇÃO:
${instrucao}`;
      const r = await askJson(SYSTEM_SLIDE, user);
      const editado = Slide.parse(r.slide ?? r);
      if (editado.type !== alvo.type) throw new Error("o modelo trocou o tipo do slide; tente de novo");
      const slides = [...atual.slides];
      slides[slide_index] = editado;
      novo = Spec.parse({ ...atual, slides });
      if (typeof r.resumo === "string") resumo = r.resumo;
    } else {
      const user = `JSON ATUAL:
${JSON.stringify(atual)}

INSTRUÇÃO:
${instrucao}`;
      const r = await askJson(SYSTEM_TUDO, user);
      novo = Spec.parse(r.spec ?? r);
      if (typeof r.resumo === "string") resumo = r.resumo;
    }

    if (carousel_id) {
      await db.from("review_messages").insert([
        { carousel_id, slide_index: slide_index ?? null, role: "user", content: instrucao },
        { carousel_id, slide_index: slide_index ?? null, role: "assistant", content: resumo },
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

    return NextResponse.json({ ok: true, spec: novo, resumo });
  } catch (e: any) {
    return NextResponse.json({ erro: String(e?.message || e) }, { status: 500 });
  }
}
