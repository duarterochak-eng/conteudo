import { NextResponse } from "next/server";
import { db } from "@/lib/supabase";

export async function POST(req: Request) {
  const { carousel_id } = await req.json();
  await db.from("carousels").update({ status: "aprovado", approved_at: new Date().toISOString() }).eq("id", carousel_id);
  await db.from("editorial_events").insert({ entity: "carousel", entity_id: carousel_id, event: "carrossel_aprovado" });
  return NextResponse.json({ ok: true });
}
