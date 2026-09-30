"use client";
import { useState } from "react";

export default function BlocoCodigo({ codigo }: { codigo: string }) {
  const [copiado, setCopiado] = useState(false);

  async function copiar() {
    try {
      await navigator.clipboard.writeText(codigo);
    } catch {
      // http, navegador antigo ou permissão negada
      const t = document.createElement("textarea");
      t.value = codigo;
      t.setAttribute("readonly", "");
      t.style.position = "fixed";
      t.style.opacity = "0";
      document.body.appendChild(t);
      t.select();
      document.execCommand("copy");
      t.remove();
    }
    setCopiado(true);
    setTimeout(() => setCopiado(false), 2000);
  }

  return (
    <div className="en-codigo">
      <pre>{codigo}</pre>
      <button type="button" onClick={copiar}>{copiado ? "Copiado!" : "Copiar"}</button>
    </div>
  );
}
