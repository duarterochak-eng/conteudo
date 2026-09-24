import { db } from "./supabase";
import { askJsonVia } from "./llm";
import { Spec, type TSpec } from "./spec";
import { lint, normalizar, CLICHES } from "./lint";
import { type Formato } from "./formatos";

/** Regras comuns do prompt de redação e do de ângulos. */
export const REGRAS_COMUNS = `TOM
- Escreva como um consultor que manda uma mensagem de WhatsApp para o dono de uma padaria: frases curtas, exemplo do dia a dia, zero termo de manual.
- Português do Brasil. Sem emoji.
- Palavras proibidas: ${CLICHES}.
- NUNCA use número, cliente ou resultado que não esteja nos fatos.`;

export const PERSONA =
  "@kawan: IA aplicada à operação de pequenas e médias empresas. Público: dono de PME (loja, clínica, oficina, escritório de contabilidade). Oferta: automação com IA para ganhar tempo e desempenho.";

/** Poses para o campo photo da capa. */
export async function posesDisponiveis() {
  const { data: poses } = await db.from("avatar_poses").select("name,tags").eq("active", true);
  return (poses || []).map((p: any) => `${p.name} (${(p.tags || []).join(", ")})`).join(" · ") || "nenhuma";
}

/**
 * Redação: LLM → normalizar → (ajustar) → lint → 1 nova tentativa no mesmo modelo se sobrar tempo.
 * Usado pelo /api/carousel (sem formato) e pela aprovação de ideia (com formato).
 */
export async function redigir(system: string, user: string, opts: { formato?: Formato; ajustar?: (s: TSpec) => TSpec } = {}) {
  const prep = (json: any) => {
    const s = normalizar(Spec.parse(json));
    return opts.ajustar ? opts.ajustar(s) : s;
  };
  const t0 = Date.now();
  const r1 = await askJsonVia(system, user);
  let spec = prep(r1.json);
  let avisos = lint(spec, opts.formato);
  // Nova tentativa só no mesmo modelo que respondeu e só se sobrar tempo.
  if (avisos.length && Date.now() - t0 < 90000) {
    // 1 nova tentativa com os erros apontados. Se piorar, fica com a primeira.
    console.log("[lint] 1a versao:", avisos.join(" / "));
    try {
      const fix = `${user}

VOCÊ JÁ GEROU ESTE JSON:
${JSON.stringify(spec)}

ELE QUEBRA ESTAS REGRAS. Corrija TODAS e devolva o JSON completo:
- ${avisos.join("\n- ")}`;
      const spec2 = prep((await askJsonVia(system, fix, r1.via)).json);
      const avisos2 = lint(spec2, opts.formato);
      if (avisos2.length < avisos.length) { spec = spec2; avisos = avisos2; }
    } catch (e: any) { console.error("[lint] retry falhou", e?.message || e); }
    if (avisos.length) console.log("[lint] sobrou:", avisos.join(" / "));
  }
  return { spec, avisos };
}
