import { NextResponse } from "next/server";
import chromium from "@sparticuz/chromium";
import puppeteer from "puppeteer-core";
import { db, BUCKET } from "@/lib/supabase";
import { Spec } from "@/lib/spec";
import { specToHtml, W, H, PoseMap } from "@/lib/template";

export const runtime = "nodejs";
// Fluid compute no Hobby permite até 300s. Com 60s o render de 7 slides estourava.
export const maxDuration = 300;

export async function POST(req: Request) {
  const t0 = Date.now();
  const log = (etapa: string) => console.log(`[render] ${etapa} ${Date.now() - t0}ms`);
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
    log("chromium aberto");
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: "load" });
    await page.evaluate(() => (document as any).fonts.ready);
    await page.waitForSelector("body[data-fit=ok]", { timeout: 5000 }).catch(() => {});

    const stamp = Date.now();
    const cards = await page.$$(".s");
    const pngs: Buffer[] = [];
    for (const card of cards) pngs.push((await card.screenshot({ type: "png" })) as Buffer);
    await browser.close();
    log(`${pngs.length} prints`);

    // Uploads em paralelo: em série, a latência de rede somava ~2s por slide.
    const urls = await Promise.all(
      pngs.map(async (png, i) => {
        const path = `${spec.slug}/${stamp}/${String(i + 1).padStart(2, "0")}.png`;
        const up = await db.storage.from(BUCKET).upload(path, png, { contentType: "image/png", upsert: true });
        if (up.error) throw new Error("upload: " + up.error.message);
        return db.storage.from(BUCKET).getPublicUrl(path).data.publicUrl;
      })
    );
    log("uploads");

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
      const ins = await db.from("carousel_versions").insert({
        carousel_id: body.carousel_id,
        version,
        spec,
        png_paths: urls,
        origin: body.origin || "gerado",
      });
      if (ins.error) throw new Error("versão: " + ins.error.message);
      const upd = await db
        .from("carousels")
        .update({ current_version: version, status: "em_revisao", caption: spec.caption })
        .eq("id", body.carousel_id);
      if (upd.error) throw new Error("carrossel: " + upd.error.message);
    }
    log("fim");

    return NextResponse.json({ ok: true, urls, version });
  } catch (e: any) {
    console.error("[render] erro", e);
    return NextResponse.json({ erro: String(e?.message || e) }, { status: 500 });
  }
}
