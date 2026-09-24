import { db } from "@/lib/supabase";
import { BUCKET_REF } from "@/lib/referencias";
import "../globals.css";
import Ideias, { type Ref } from "./ideias";

export const dynamic = "force-dynamic";

export default async function Page() {
  const { data: refs } = await db
    .from("referencias")
    .select("id,path,tipo,link,nota,leitura,status,erro,created_at")
    .order("created_at", { ascending: false })
    .limit(30);
  const ids = (refs || []).map((r: any) => r.id);

  const { data: pautas } = ids.length
    ? await db.from("pautas").select("id,title,status,angle,reject_tags,reject_reason,referencia_id").in("referencia_id", ids).order("created_at")
    : { data: [] as any[] };
  const pautaIds = (pautas || []).map((p: any) => p.id);
  const { data: cars } = pautaIds.length ? await db.from("carousels").select("id,pauta_id").in("pauta_id", pautaIds) : { data: [] as any[] };
  const carDe = new Map((cars || []).map((c: any) => [c.pauta_id, c.id]));

  // bucket privado: miniatura por URL assinada (1 h)
  const paths = (refs || []).map((r: any) => r.path);
  const { data: urls } = paths.length ? await db.storage.from(BUCKET_REF).createSignedUrls(paths, 3600) : { data: [] as any[] };
  const urlDe = new Map((urls || []).map((u: any) => [u.path, u.signedUrl]));

  const lista: Ref[] = (refs || []).map((r: any) => ({
    ...r,
    url: urlDe.get(r.path) || null,
    ideias: (pautas || [])
      .filter((p: any) => p.referencia_id === r.id)
      .map((p: any) => ({ ...p, carousel_id: carDe.get(p.id) || null })),
  }));

  return (
    <div className="wrap">
      <a href="/" className="muted" style={{ fontSize: 13 }}>← esteira</a>
      <h1 style={{ marginTop: 8 }}>Ideias</h1>
      <Ideias refs={lista} />
    </div>
  );
}
