"use client";
import type { Publico } from "@/data/servicos";
import { usePublico } from "./publico";

const OPCOES: { valor: Publico; rotulo: string }[] = [
  { valor: "empresa", rotulo: "Tenho empresa" },
  { valor: "profissional", rotulo: "Trabalho por conta" },
];

/** "Você é:" empresa ou profissional. Grava em ?p= para o link compartilhado abrir no mesmo modo. */
export default function TogglePublico() {
  const { publico, setPublico } = usePublico();

  function escolher(p: Publico) {
    if (p === publico) return;
    setPublico(p);
    // só a URL muda, sem ida ao servidor; mantém utm_*, outros parâmetros e o #
    const url = new URL(window.location.href);
    url.searchParams.set("p", p);
    window.history.replaceState(null, "", url);
  }

  return (
    <div className="lp-toggle" role="group" aria-label="Você é">
      <span className="lp-toggle-rotulo">Você é:</span>
      <div className="lp-toggle-opcoes">
        {OPCOES.map((o) => (
          <button
            key={o.valor}
            type="button"
            className={publico === o.valor ? "on" : undefined}
            aria-pressed={publico === o.valor}
            onClick={() => escolher(o.valor)}
          >
            {o.rotulo}
          </button>
        ))}
      </div>
    </div>
  );
}
