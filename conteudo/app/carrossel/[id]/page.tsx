import { db } from "@/lib/supabase";
import "../../globals.css";
import Revisao from "./revisao";

export const dynamic = "force-dynamic";

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { data: car } = await db
    .from("carousels")
    .select("id,status,caption,current_version,pautas(title,keyword)")
    .eq("id", id)
    .single();
  const { data: ver } = await db
    .from("carousel_versions")
    .select("version,spec,png_paths")
    .eq("carousel_id", id)
    .order("version", { ascending: false })
    .limit(1)
    .maybeSingle();
  const { data: msgs } = await db
    .from("review_messages")
    .select("role,content,slide_index,created_at")
    .eq("carousel_id", id)
    .order("created_at");

  if (!car || !ver) return <div className="wrap">Carrossel não encontrado.</div>;

  return (
    <Revisao
      id={id}
      titulo={(car as any).pautas?.title || "Carrossel"}
      status={car.status}
      versao={ver.version}
      spec={ver.spec}
      urls={ver.png_paths || []}
      mensagens={msgs || []}
    />
  );
}
