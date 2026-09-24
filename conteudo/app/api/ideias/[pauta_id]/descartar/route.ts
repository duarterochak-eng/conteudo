import { NextResponse } from "next/server";
import { db } from "@/lib/supabase";

export const runtime = "nodejs";

const TAGS = ["fraca", "repetida", "fora_do_publico", "outro"];

/** POST /api/ideias/[pauta_id]/descartar { tags[], motivo? } */
export async function POST(req: Request, { params }: { params: Promise<{ pauta_id: string }> }) {
  try {
    const { pauta_id } = await params;
    const { tags, motivo } = await req.json();
    const reject_tags = (Array.isArray(tags) ? tags : []).filter((t: string) => TAGS.includes(t));
    const { error } = await db
      .from("pautas")
      .update({ status: "rejeitada", reject_tags, reject_reason: motivo?.trim() || null, decided_at: new Date().toISOString() })
      .eq("id", pauta_id);
    if (error) throw new Error(error.message);
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ erro: String(e?.message || e) }, { status: 500 });
  }
}
