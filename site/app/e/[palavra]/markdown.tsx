import type { ReactNode } from "react";
import BlocoCodigo from "./bloco-codigo";

/** Markdown mínimo: # e ## títulos, parágrafos, listas com "-", **negrito** e blocos ```. Sem HTML cru. */
export function markdown(texto: string): ReactNode[] {
  const linhas = texto.replace(/\r\n/g, "\n").split("\n");
  const out: ReactNode[] = [];
  let par: string[] = [];
  let lista: string[] = [];
  const fechar = () => {
    if (par.length) out.push(<p key={out.length}>{negrito(par.join(" "))}</p>);
    if (lista.length) out.push(<ul key={out.length}>{lista.map((l, i) => <li key={i}>{negrito(l)}</li>)}</ul>);
    par = [];
    lista = [];
  };
  for (let i = 0; i < linhas.length; i++) {
    const l = linhas[i];
    if (l.trimStart().startsWith("```")) {
      fechar();
      const codigo: string[] = [];
      while (++i < linhas.length && !linhas[i].trimStart().startsWith("```")) codigo.push(linhas[i]);
      out.push(<BlocoCodigo key={out.length} codigo={codigo.join("\n")} />);
    } else if (/^##\s+/.test(l)) {
      fechar();
      out.push(<h3 key={out.length}>{negrito(l.replace(/^##\s+/, ""))}</h3>);
    } else if (/^#\s+/.test(l)) {
      fechar();
      out.push(<h2 key={out.length}>{negrito(l.replace(/^#\s+/, ""))}</h2>);
    } else if (/^\s*-\s+/.test(l)) {
      if (par.length) { const p = lista; lista = []; fechar(); lista = p; }
      lista.push(l.replace(/^\s*-\s+/, ""));
    } else if (!l.trim()) {
      fechar();
    } else {
      if (lista.length) fechar();
      par.push(l.trim());
    }
  }
  fechar();
  return out;
}

function negrito(s: string): ReactNode[] {
  return s.split(/\*\*(.+?)\*\*/g).map((t, i) => (i % 2 ? <strong key={i}>{t}</strong> : t));
}
