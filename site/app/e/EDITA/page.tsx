import type { Metadata } from "next";
import { fontes } from "@/lib/fontes";
import BlocoCodigo from "../[palavra]/bloco-codigo";
import Fase2 from "./fase2";
import { PROMPT_FASE_1 } from "./prompts";
import "../[palavra]/entrega.css";

export const metadata: Metadata = {
  title: "Edite seu vídeo inteiro com o Claude",
  robots: { index: false, follow: false },
};

const PASSOS = [
  "Crie uma pasta e coloque todos os takes brutos, o roteiro e a música (se tiver).",
  "Separe suas referências: transições e efeitos que você gosta, prints de exemplo e o render da legenda, se tiver.",
  "Abra o Claude, selecione o modelo Opus 5.5 com esforço máximo e anexe todos os arquivos no chat.",
  "Cole o Prompt da Fase 1 e espere o corte bruto.",
  "Aprovou o corte? Preencha \"Adicionar mais ajustes\", copie o Prompt da Fase 2 e cole no mesmo chat.",
];

export default function Edita() {
  return (
    <div className={`${fontes} en`}>
      <main className="en-caixa">
        <div className="en-marca">@kawan.labs</div>
        <h1 className="en-h1">
          Edite seu vídeo <span style={{ color: "#e0521d" }}>inteiro</span> com o Claude
        </h1>
        <p style={{ margin: 0, fontSize: 19 }}>2 prompts. 1 chat. Você só grava.</p>
        <div className="en-corpo">
          <h2>Passo a passo</h2>
          <ol style={{ margin: "16px 0 0", paddingLeft: 22 }}>
            {PASSOS.map((p) => <li key={p} style={{ marginTop: 6 }}>{p}</li>)}
          </ol>
          <h2>Fase 1 — Cortes</h2>
          <BlocoCodigo codigo={PROMPT_FASE_1} />
          <h2>Fase 2 — Cor, legendas e sons</h2>
          <Fase2 />
        </div>
        <footer style={{ marginTop: 48, textAlign: "center", fontWeight: 600 }}>
          <a href="https://instagram.com/kawan.labs" target="_blank" rel="noopener noreferrer" style={{ color: "#141210" }}>@kawan.labs</a>
        </footer>
      </main>
    </div>
  );
}
