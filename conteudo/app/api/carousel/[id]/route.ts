import { NextResponse } from "next/server";
import { db, BUCKET } from "@/lib/supabase";

export const runtime = "nodejs";

type Ctx = { params: Promise<{ id: string }> };

/** PATCH { acao: "ocultar" | "restaurar" } */
export async function PATCH(req: Request, { params }: Ctx) {
  try {
    const { id } = await params;
    const { acao } = await req.json();
    let status: string;
    if (acao === "ocultar") status = "arquivado";
    else if (acao === "restaurar") {
      const { count, error } = await db.from("carousel_versions").select("id", { count: "exact", head: true }).eq("carousel_id", id);
      if (error) throw new Error(error.message);
      status = count ? "em_revisao" : "gerando";
    } else return NextResponse.json({ erro: "ação inválida" }, { status: 400 });

    const { error } = await db.from("carousels").update({ status }).eq("id", id);
    if (error) throw new Error(error.message);
    return NextResponse.json({ ok: true, status });
  } catch (e: any) {
    return NextResponse.json({ erro: String(e?.message || e) }, { status: 500 });
  }
}

/** DELETE: arquivos do bucket, depois a linha (versões e mensagens caem por cascade), depois os eventos. */
export async function DELETE(_req: Request, { params }: Ctx) {
  try {
    const { id } = await params;
    const { data: vers, error: e1 } = await db.from("carousel_versions").select("png_paths").eq("carousel_id", id);
    if (e1) throw new Error(e1.message);

    // png_paths guarda a URL pública; o caminho no bucket vem depois de /public/<bucket>/
    const marca = `/object/public/${BUCKET}/`;
    const paths = (vers || [])
      .flatMap((v: any) => v.png_paths || [])
      .map((u: string) => (u.includes(marca) ? decodeURIComponent(u.split(marca)[1].split("?")[0]) : null))
      .filter(Boolean) as string[];
    if (paths.length) {
      const { error } = await db.storage.from(BUCKET).remove(paths);
      if (error) throw new Error("arquivos: " + error.message);
    }

    const { error: e2 } = await db.from("carousels").delete().eq("id", id);
    if (e2) throw new Error("carrossel: " + e2.message);
    const { error: e3 } = await db.from("editorial_events").delete().eq("entity_id", id);
    if (e3) throw new Error("eventos: " + e3.message);

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ erro: String(e?.message || e) }, { status: 500 });
  }
}
