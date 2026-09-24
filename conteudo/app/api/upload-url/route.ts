import { NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { db } from "@/lib/supabase";
import { BUCKET_REF, EXT_OK, MAX_BYTES } from "@/lib/referencias";

export const runtime = "nodejs";

/**
 * POST /api/upload-url { ext, tamanho }
 * URL assinada para o navegador subir direto no Storage (a função da Vercel aceita só 4,5 MB).
 */
export async function POST(req: Request) {
  try {
    const { ext, tamanho } = await req.json();
    const e = String(ext || "").toLowerCase();
    if (!EXT_OK[e]) return NextResponse.json({ erro: "Formato não aceito. Use mp4, mov, png, jpg ou webp." }, { status: 400 });
    if (Number(tamanho) > MAX_BYTES) return NextResponse.json({ erro: "Arquivo maior que 25 MB." }, { status: 400 });

    const dia = new Date().toLocaleDateString("sv-SE", { timeZone: "America/Sao_Paulo" }); // AAAA-MM-DD
    const path = `${dia}/${randomUUID()}.${e}`;
    const { data, error } = await db.storage.from(BUCKET_REF).createSignedUploadUrl(path);
    if (error || !data) throw new Error(error?.message || "sem URL");
    return NextResponse.json({ ok: true, path, tipo: EXT_OK[e].tipo, url: data.signedUrl });
  } catch (e: any) {
    return NextResponse.json({ erro: String(e?.message || e) }, { status: 500 });
  }
}
