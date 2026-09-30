"use client";
import { useEffect, useRef, useState, type ReactNode } from "react";

/**
 * Entrada ao rolar: devolve true quando o elemento entra na tela (IntersectionObserver, 15%, uma vez).
 * Só "arma" (esconde) o que está abaixo da tela na montagem: o que já aparece no primeiro render
 * fica como veio do servidor, sem piscar. Sem JS, tudo aparece normal.
 */
export function useScrollReveal<T extends HTMLElement>() {
  const ref = useRef<T>(null);
  const [estado, setEstado] = useState<"livre" | "armado" | "visivel">("livre");

  useEffect(() => {
    const el = ref.current;
    if (!el || typeof IntersectionObserver === "undefined") return;
    if (el.getBoundingClientRect().top < window.innerHeight) return;
    setEstado("armado");
    const io = new IntersectionObserver(
      (entradas) => {
        if (entradas.some((e) => e.isIntersecting)) {
          setEstado("visivel");
          io.disconnect();
        }
      },
      { threshold: 0.15 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return { ref, armado: estado !== "livre", visivel: estado === "visivel" };
}

/**
 * Bloco que sobe e aparece ao rolar. grade: quem anima são os filhos diretos,
 * com atraso de 60ms entre eles (cada filho define --i com o seu índice).
 */
export function Revelar({ className = "", grade, children }: { className?: string; grade?: boolean; children: ReactNode }) {
  const { ref, armado, visivel } = useScrollReveal<HTMLDivElement>();
  const base = grade ? "lp-rv-grade" : "lp-rv";
  const classe = armado ? `${base}${visivel ? " lp-rv-on" : ""}` : "";
  return (
    <div ref={ref} className={`${className} ${classe}`.trim() || undefined}>
      {children}
    </div>
  );
}
