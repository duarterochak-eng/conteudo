"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

async function lerJson(r: Response) {
  const txt = await r.text();
  try {
    return JSON.parse(txt);
  } catch {
    throw new Error(r.status === 504 ? "tempo esgotado no servidor (504). Tente de novo." : `servidor respondeu ${r.status}: ${txt.slice(0, 80)}`);
  }
}

export default function Novo() {
  const router = useRouter();
  const [tema, setTema] = useState("");
  const [provas, setProvas] = useState("");
  const [msg, setMsg] = useState("");
  const [carregando, setCarregando] = useState(false);

  async function gerar() {
    if (!tema.trim()) return;
    setCarregando(true);
    setMsg("Escrevendo o roteiro…");
    try {
      const r1 = await fetch("/api/carousel", {
        method: "POST",
        body: JSON.stringify({ tema, provas: provas.split("\n").map((s) => s.trim()).filter(Boolean) }),
      });
      const d1 = await lerJson(r1);
      if (!r1.ok) throw new Error(d1.erro);

      setMsg("Montando as imagens…");
      const r2 = await fetch("/api/render", {
        method: "POST",
        body: JSON.stringify({ carousel_id: d1.carousel_id, spec: d1.spec }),
      });
      const d2 = await lerJson(r2);
      if (!r2.ok) throw new Error(d2.erro);

      // fica na esteira: o novo aparece no "Último gerado"
      setTema("");
      setProvas("");
      setMsg("Pronto.");
    } catch (e: any) {
      setMsg("Erro: " + e.message);
    }
    setCarregando(false);
    router.refresh();
  }

  return (
    <div className="card" style={{ marginTop: 18, display: "grid", gap: 10 }}>
      <h2>Novo carrossel</h2>
      <input value={tema} onChange={(e) => setTema(e.target.value)} placeholder="Tema. Ex: agente de IA respondendo o WhatsApp fora do horário" />
      <textarea
        value={provas}
        onChange={(e) => setProvas(e.target.value)}
        rows={3}
        placeholder={"Provas reais (uma por linha, opcional).\nEx: agente da Mydra atendeu 312 leads em 30 dias"}
      />
      <div className="row">
        <button className="btn or" onClick={gerar} disabled={carregando}>
          {carregando ? "Gerando…" : "Gerar carrossel"}
        </button>
        <span className="muted">{msg}</span>
      </div>
    </div>
  );
}
