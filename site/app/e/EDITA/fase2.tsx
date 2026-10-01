"use client";
import { useState } from "react";
import BlocoCodigo from "../[palavra]/bloco-codigo";
import { PROMPT_FASE_2_BASE } from "./prompts";

export default function Fase2() {
  const [ajustes, setAjustes] = useState("");
  const texto = ajustes.trim();
  const prompt = PROMPT_FASE_2_BASE + (texto ? "\n\nAjustes adicionais:\n" + texto : "");
  return (
    <>
      <label htmlFor="ajustes" className="ed-label">Adicionar mais ajustes (opcional)</label>
      <textarea
        id="ajustes"
        className="ed-ajustes"
        rows={5}
        value={ajustes}
        onChange={(e) => setAjustes(e.target.value)}
        placeholder="Ex: use a legenda grande atrás da minha cabeça no início e no CTA. Quando eu apontar para cima, reproduza o estilo do print que enviei. Quando minha esposa aparecer, faça um movimento de câmera lateral e de volta."
      />
      <BlocoCodigo codigo={prompt} />
    </>
  );
}
