import Link from "next/link";
import { db } from "@/lib/supabase";
import "./globals.css";
import Novo from "./novo";

export const dynamic = "force-dynamic";

const LABEL: Record<string, string> = {
  gerando: "gerando",
  em_revisao: "aguardando você",
  aprovado: "aprovado",
  publicado: "publicado",
};

export default async function Home() {
  const { data: cars } = await db
    .from("carousels")
    .select("id,status,caption,created_at,current_version,slot_date,pautas(title,keyword)")
    .order("created_at", { ascending: false })
    .limit(30);

  return (
    <div className="wrap">
      <h1>Esteira</h1>
      <p className="muted">Carrosséis gerados, revisados e aprovados. Nada vai pro ar sem passar por você.</p>

      <Novo />

      <div className="grid">
        {(cars || []).map((c: any) => (
          <Link key={c.id} href={`/carrossel/${c.id}`} className="card" style={{ textDecoration: "none" }}>
            <div className="row" style={{ justifyContent: "space-between" }}>
              <span className="tag">{LABEL[c.status] || c.status}</span>
              <span className="tag">{c.pautas?.keyword || "—"}</span>
            </div>
            <h2 style={{ marginTop: 10, fontSize: 17 }}>{c.pautas?.title || "sem título"}</h2>
            <p className="muted" style={{ fontSize: 13, marginTop: 6 }}>
              {c.slot_date ? `Vaga: ${c.slot_date} · ` : ""}v{c.current_version || 1}
            </p>
          </Link>
        ))}
        {!cars?.length && <div className="card muted">Nada ainda. Crie o primeiro carrossel acima.</div>}
      </div>
    </div>
  );
}
