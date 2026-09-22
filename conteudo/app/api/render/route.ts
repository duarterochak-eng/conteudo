import { NextResponse } from "next/server";
import chromium from "@sparticuz/chromium";
import puppeteer from "puppeteer-core";
import { db, BUCKET } from "@/lib/supabase";
import { Spec } from "@/lib/spec";
import { specToHtml, W, H, PoseMap } from "@/lib/template";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const spec = Spec.parse(body.spec);

    const { data: poseRows } = await db.from("avatar_poses").select("name,storage_path,style").eq("active", true);
    const poses: PoseMap = {};
    for (const p of poseRows || []) {
      const { data } = db.storage.from("poses").getPublicUrl(p.storage_path);
      poses[p.name] = { url: data.publicUrl, style: p.style || undefined };
    }

    const html = specToHtml(spec, poses);

    const browser = await puppeteer.launch({
      args: chromium.args,
      executablePath: await chromium.executablePath(),
      headless: true,
      defaultViewport: { width: W, height: H },
    });
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: "load" });
    await page.evaluate(() => (document as any).fonts.ready);

    const stamp = Date.now();
    const urls: string[] = [];
    const cards = await page.$$(".s");
    for (let i = 0; i < cards.length; i++) {
      const png = (await cards[i].screenshot({ type: "png" })) as Buffer;
      const path = `${spec.slug}/${stamp}/${String(i + 1).padStart(2, "0")}.png`;
      const up = await db.storage.from(BUCKET).upload(path, png, { contentType: "image/png", upsert: true });
      if (up.error) throw new Error("upload: " + up.error.message);
      urls.push(db.storage.from(BUCKET).getPublicUrl(path).data.publicUrl);
    }
    await browser.close();

    let version: number | null = null;
    if (body.carousel_id) {
      const { data: last } = await db
        .from("carousel_versions")
        .select("version")
        .eq("carousel_id", body.carousel_id)
        .order("version", { ascending: false })
        .limit(1)
        .maybeSingle();
      version = (last?.version || 0) + 1;
      await db.from("carousel_versions").insert({
        carousel_id: body.carousel_id,
        version,
        spec,
        png_paths: urls,
        origin: body.origin || "gerado",
      });
      await db
        .from("carousels")
        .update({ current_version: version, status: "em_revisao", caption: spec.caption })
        .eq("id", body.carousel_id);
    }

    return NextResponse.json({ ok: true, urls, version });
  } catch (e: any) {
    return NextResponse.json({ erro: String(e?.message || e) }, { status: 500 });
  }
}
