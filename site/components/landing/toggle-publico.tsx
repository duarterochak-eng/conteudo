"use client";
import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import type { Publico } from "@/data/servicos";

const OPCOES: { valor: Publico; rotulo: string }[] = [
  { valor: "empresa", rotulo: "Tenho empresa" },
  { valor: "profissional", rotulo: "Trabalho por conta" },
];

/** "Você é:" empresa ou profissional. Fica em ?p=, então o link compartilhado abre no mesmo modo. */
export default function TogglePublico({ publico }: { publico: Publico }) {
  const router = useRouter();
  const pathname = usePathname();
  // o botão muda na hora; o conteúdo troca quando o servidor devolve a página com o novo ?p=
  const [atual, setAtual] = useState(publico);
  useEffect(() => setAtual(publico), [publico]);

  function escolher(p: Publico) {
    if (p === atual) return;
    setAtual(p);
    // mantém utm_* e outros parâmetros que vieram no link
    const params = new URLSearchParams(window.location.search);
    params.set("p", p);
    router.replace(`${pathname}?${params}`, { scroll: false });
  }

  return (
    <div className="lp-toggle" role="group" aria-label="Você é">
      <span className="lp-toggle-rotulo">Você é:</span>
      <div className="lp-toggle-opcoes">
        {OPCOES.map((o) => (
          <button
            key={o.valor}
            type="button"
            className={atual === o.valor ? "on" : undefined}
            aria-pressed={atual === o.valor}
            onClick={() => escolher(o.valor)}
          >
            {o.rotulo}
          </button>
        ))}
      </div>
    </div>
  );
}
