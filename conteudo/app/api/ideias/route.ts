import { db } from "@/lib/supabase";
import { BUCKET_REF, EXT_OK, gerarAngulos, lerReferencia, type Leitura } from "@/lib/referencias";

export const runtime = "nodejs";
export const maxDuration = 300;

/**
 * POST /api/ideias
 *   { path, tipo, link?, nota? }  → nova referência: leitura (etapa 1) + ângulos (etapa 2)
 *   { referencia_id }            → refaz o que faltou (leitura se falhou, ângulos se não há ideias)
 * Resposta em linhas JSON (streaming): {"etapa":"lendo"} · {"etapa":"criando"} · {"ok":true,...} ou {"erro":"..."}.
 * A redação do carrossel NÃO roda aqui: só na aprovação.
 */
export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const enc = new TextEncoder();

  const stream = new ReadableStream({
    async start(ctl) {
      const manda = (o: any) => ctl.enqueue(enc.encode(JSON.stringify(o) + "\n"));
      let refId: string | null = body.referencia_id || null;
      try {
        let ref: any;
        if (refId) {
          const { data, error } = await db.from("referencias").select("*").eq("id", refId).single();
          if (error || !data) throw new Error("referência não encontrada");
          ref = data;
        } else {
          const ext = String(body.path || "").split(".").pop()?.toLowerCase() || "";
          if (!body.path || !EXT_OK[ext]) throw new Error("arquivo inválido");
          const { data, error } = await db
            .from("referencias")
            .insert({ path: body.path, tipo: EXT_OK[ext].tipo, link: body.link || null, nota: body.nota || null, status: "lendo" })
            .select("*")
            .single();
          if (error || !data) throw new Error("referência: " + (error?.message || "não criada"));
          ref = data;
          refId = ref.id;
        }

        // Etapa 1: leitura
        let leitura: Leitura = ref.leitura;
        if (ref.status !== "lida" || !leitura?.fatos?.length) {
          manda({ etapa: "lendo", referencia_id: refId });
          await db.from("referencias").update({ status: "lendo", erro: null }).eq("id", refId);
          try {
            leitura = await lerReferencia(ref);
          } catch (e: any) {
            await db.from("referencias").update({ status: "falhou", erro: String(e?.message || e) }).eq("id", refId);
            throw e;
          }
          await db.from("referencias").update({ leitura, status: "lida", erro: null }).eq("id", refId);
        }

        // Etapa 2: ângulos (só se ainda não há ideias desta referência)
        const { count } = await db.from("pautas").select("id", { count: "exact", head: true }).eq("referencia_id", refId);
        if (!count) {
          manda({ etapa: "criando", referencia_id: refId });
          try {
            const ideias = await gerarAngulos(leitura.fatos, ref.nota);
            const { error } = await db.from("pautas").insert(
              ideias.map(({ titulo, ...angle }) => ({ title: titulo, status: "proposta", referencia_id: refId, mode: "demonstracao", angle }))
            );
            if (error) throw new Error("pautas: " + error.message);
          } catch (e: any) {
            // leitura fica salva; o erro aparece na tela com "tentar de novo"
            await db.from("referencias").update({ erro: "Ideias: " + String(e?.message || e) }).eq("id", refId);
            throw e;
          }
        }
        manda({ ok: true, referencia_id: refId });
      } catch (e: any) {
        manda({ erro: String(e?.message || e), referencia_id: refId });
      }
      ctl.close();
    },
  });

  return new Response(stream, { headers: { "content-type": "application/x-ndjson; charset=utf-8", "cache-control": "no-store" } });
}
