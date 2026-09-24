import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { db } from "@/lib/supabase";
import { redigir, posesDisponiveis, REGRAS_COMUNS, PERSONA } from "@/lib/redacao";
import { blocoFormato, FORMATOS, type Formato } from "@/lib/formatos";
import type { TSpec } from "@/lib/spec";

export const runtime = "nodejs";
export const maxDuration = 300;

// Sem exemplos concretos de propósito: o modelo copia exemplo (ver CLAUDE.md).
const SYSTEM = `Você escreve carrosséis de Instagram (7 slides) a partir de fatos de uma referência.

PERFIL: ${PERSONA}

${REGRAS_COMUNS}

SAÍDA: apenas o JSON, sem texto fora dele:
{"slug":"kebab-case","keyword":"PALAVRA","handle":"@kawan","caption":"...","slides":[...]}

TIPOS DE SLIDE
- cover: {"type":"cover","title":"...","giant":"PALAVRA","eyebrow":"...","tag":"...","photo":"nome da pose ou omita"}
- statement: {"type":"statement","label":"01 / ...","title":"...","body":"...", + no máximo UM visual entre compare, ficha, repete}
- step: {"type":"step","label":"02 / ...","title":"...","body":"...", + UM visual}
- cta: {"type":"cta","mode":"salvar","title":"Salva pra aplicar","eyebrow":"...","sub":"...","deliver":["...","..."]}

VISUAIS (a imagem prova o título, não enfeita; campos do slide)
- chat: lista de 2 a 3 balões {"side":"lead" (cliente) ou "me" (empresa/agente),"who":"quem · hora","text":"até 18 palavras"}.
- compare: {"before":{"title","items"},"after":{"title","items"}}, 3 itens de até 4 palavras por lado.
- ficha: {"title","icon","state":"ruim"|"ok","rows":[["Campo","valor"]]}, cadastro ou pedido vazio (ruim) ou em dia (ok).
- repete: {"data":[["Campo","valor"]],"systems":["onde o dado é digitado"]}, o mesmo dado em vários lugares.
- flow + flow_on + flow_icons: 3 a 4 etapas de 1 a 2 palavras; ícones: whatsapp, ia, crm, alerta, planilha, email, cliente, relogio, doc, agenda, dinheiro, check.
- items: 2 a 3 frases de conteúdo copiável (a pergunta real, a regra exata), até 6 palavras cada. Nunca rótulo de categoria.

LIMITES
- Capa: até 9 palavras, 1 a 2 palavras com <em>...</em>. Títulos dos outros slides: até 6 palavras. Corpo: até 15 palavras com visual.
- <em>palavra</em> = laranja, <mark>palavra</mark> = grifo; no máximo 2 por slide.
- O corpo nunca repete o título: acrescenta a cena, o porquê ou onde o dono entra.
- O dono decide e acompanha; nada de passo técnico (configurar, integrar, gerar token).

FATOS
- Use APENAS os fatos listados. Nenhum número, nome de empresa, cliente ou resultado fora deles.
- Exemplo ilustrativo é permitido só se ficar claro que é exemplo ("exemplo:", "numa clínica, seria assim") e sem números.

FINAL
- O último slide é cta com mode "salvar" (título "Salva pra aplicar" ou "Manda pro seu sócio"). Nunca "Comenta".
- A legenda repete o gancho, traz 3 a 5 bullets curtos e fecha com "Salva pra aplicar" ou "Manda pro seu sócio".
- keyword: uma palavra comum em português, 4 a 8 letras, em CAIXA ALTA.`;

const semTags = (s = "") => s.replace(/<[^>]+>/g, "").replace(/\s+/g, " ").trim().toLowerCase();

/**
 * POST /api/ideias/[pauta_id]/aprovar { capa }
 * Etapa 3 (redação). Aprova a pauta, escreve o carrossel e cria a linha em carousels.
 * O render fica com o navegador (POST /api/render), como no formulário da esteira.
 */
export async function POST(req: Request, { params }: { params: Promise<{ pauta_id: string }> }) {
  try {
    const { pauta_id } = await params;
    const { capa } = await req.json();
    if (!capa?.trim()) return NextResponse.json({ erro: "Escolha uma capa." }, { status: 400 });

    const { data: pauta, error } = await db.from("pautas").select("id,title,status,angle,referencia_id").eq("id", pauta_id).single();
    if (error || !pauta) throw new Error("pauta não encontrada");
    const { data: jaTem } = await db.from("carousels").select("id").eq("pauta_id", pauta_id).limit(1).maybeSingle();
    if (jaTem) return NextResponse.json({ erro: "Essa ideia já tem carrossel.", carousel_id: jaTem.id }, { status: 409 });

    const angle = { ...(pauta.angle || {}), capa_escolhida: capa.trim() };
    const formato = angle.formato as Formato;
    if (!FORMATOS[formato]) throw new Error("formato inválido na pauta: " + angle.formato);
    await db.from("pautas").update({ status: "aprovada", decided_at: new Date().toISOString(), angle }).eq("id", pauta_id);

    const { data: ref } = await db.from("referencias").select("leitura").eq("id", pauta.referencia_id).single();
    const fatos: string[] = ref?.leitura?.fatos || [];
    if (!fatos.length) throw new Error("a referência não tem fatos");
    const usados = new Set<number>(angle.fatos_usados || []);

    const user = `${blocoFormato(formato)}

CAPA (obrigatória, é o título do slide 1; pode marcar palavras com <em>): ${angle.capa_escolhida}

ESQUELETO (papel de cada slide):
${(angle.roteiro || []).join("\n")}

IDEIA: ${pauta.title}${angle.por_que ? `\nPOR QUE: ${angle.por_que}` : ""}

USE APENAS ESTES FATOS:
${fatos.map((f, i) => `${i + 1}. ${f}${usados.has(i + 1) ? " (base desta ideia)" : ""}`).join("\n")}

POSES DISPONÍVEIS (campo photo): ${await posesDisponiveis()}`;

    // Capa escolhida e final "salvar" são garantidos em código, não só pedidos.
    const ajustar = (s: TSpec): TSpec => {
      const slides = s.slides.map((sl: any, i) => {
        if (i === 0 && sl.type === "cover" && semTags(sl.title) !== semTags(angle.capa_escolhida)) return { ...sl, title: angle.capa_escolhida };
        if (sl.type === "cta") return { ...sl, mode: "salvar" };
        return sl;
      });
      return { ...s, slides } as TSpec;
    };
    const { spec, avisos } = await redigir(SYSTEM, user, { formato, ajustar });

    const { data: car, error: e2 } = await db
      .from("carousels")
      .insert({ pauta_id, status: "gerando", caption: spec.caption })
      .select("id")
      .single();
    if (e2 || !car) throw new Error("carrossel: " + (e2?.message || "não criado"));
    await db.from("pautas").update({ status: "em_producao", keyword: spec.keyword }).eq("id", pauta_id);

    return NextResponse.json({ ok: true, carousel_id: car.id, spec, avisos });
  } catch (e: any) {
    if (e instanceof ZodError) return NextResponse.json({ erro: "O modelo devolveu um formato inválido. Tente de novo." }, { status: 500 });
    return NextResponse.json({ erro: String(e?.message || e) }, { status: 500 });
  }
}
