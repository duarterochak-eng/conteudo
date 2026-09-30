"use client";
import { createContext, useContext, useState, type ReactNode } from "react";
import type { Publico } from "@/data/servicos";

const Contexto = createContext<{ publico: Publico; setPublico: (p: Publico) => void }>({
  publico: "empresa",
  setPublico: () => {},
});

/**
 * Empresa/profissional vive aqui, no navegador. O ?p= lido no servidor só dá o valor inicial:
 * trocar não vai ao servidor (não refaz a consulta da BIO nem mexe no estado da captura).
 */
export function PublicoProvider({ inicial, children }: { inicial: Publico; children: ReactNode }) {
  const [publico, setPublico] = useState(inicial);
  return <Contexto.Provider value={{ publico, setPublico }}>{children}</Contexto.Provider>;
}

export const usePublico = () => useContext(Contexto);

/** Mostra a versão do público escolhido. As duas vêm prontas do servidor. */
export function PorPublico({ empresa, profissional }: { empresa: ReactNode; profissional: ReactNode }) {
  return <>{usePublico().publico === "profissional" ? profissional : empresa}</>;
}
