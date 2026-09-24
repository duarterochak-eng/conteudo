"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

/** Ocultar/Restaurar e Apagar de uma linha da esteira. */
export default function Acoes({ id, arquivado }: { id: string; arquivado: boolean }) {
  const router = useRouter();
  const [ocupado, setOcupado] = useState(false);

  async function chamar(init: RequestInit) {
    setOcupado(true);
    try {
      const r = await fetch(`/api/carousel/${id}`, init);
      if (!r.ok) {
        const d = await r.json().catch(() => ({}));
        alert("Erro: " + (d.erro || r.status));
      }
      router.refresh();
    } finally {
      setOcupado(false);
    }
  }

  const estilo = { padding: "3px 10px", fontSize: 12 };
  return (
    <div className="row" style={{ gap: 6, flexWrap: "nowrap" }}>
      <button
        className="btn"
        style={estilo}
        disabled={ocupado}
        onClick={() => chamar({ method: "PATCH", body: JSON.stringify({ acao: arquivado ? "restaurar" : "ocultar" }) })}
      >
        {arquivado ? "Restaurar" : "Ocultar"}
      </button>
      <button
        className="btn"
        style={estilo}
        disabled={ocupado}
        onClick={() => confirm("Apagar de vez? Não dá para desfazer.") && chamar({ method: "DELETE" })}
      >
        Apagar
      </button>
    </div>
  );
}
