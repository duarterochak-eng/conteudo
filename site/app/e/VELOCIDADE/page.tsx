import type { Metadata } from "next";
import { fontes } from "@/lib/fontes";
import BlocoCodigo from "../[palavra]/bloco-codigo";
import { PROMPT } from "./prompt";
import "../[palavra]/entrega.css";

export const metadata: Metadata = {
  title: "O prompt que monta seu formato de conteúdo",
  robots: { index: false, follow: false },
};

export default function Velocidade() {
  return (
    <div className={`${fontes} en`}>
      <main className="en-caixa">
        <div className="en-marca">@kawan.labs</div>
        <h1 className="en-h1">
          O prompt que monta seu <span style={{ color: "#e0521d" }}>formato</span> de conteúdo
        </h1>
        <p style={{ margin: 0, fontSize: 19 }}>
          Cola no Claude ou no ChatGPT, responde as 5 perguntas e ele te devolve um molde de vídeo repetível, dez assuntos pra ele e o roteiro do primeiro.
        </p>
        <div className="en-corpo">
          <BlocoCodigo codigo={PROMPT} />
        </div>
        <footer style={{ marginTop: 48, textAlign: "center", fontWeight: 600 }}>
          <a href="https://instagram.com/kawan.labs" target="_blank" rel="noopener noreferrer" style={{ color: "#141210" }}>@kawan.labs</a>
        </footer>
      </main>
    </div>
  );
}
