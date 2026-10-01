"use client";

import { useState } from "react";
import { Anton, Inter_Tight } from "next/font/google";

const anton = Anton({ weight: "400", subsets: ["latin"] });
const inter = Inter_Tight({ subsets: ["latin"] });

const PROMPT_FASE_1 = `Trabalhe como um diretor de edição de cinema experiente, responsável por contar uma história dinâmica e envolvente por meio dos cortes.
Sua primeira tarefa é selecionar as melhores cenas e organizá-las de acordo com o roteiro. Tenha em mente que algumas cenas foram gravadas em um único take e podem não seguir o roteiro à risca. Use o melhor julgamento para encontrar a ordem que preserve a história e mantenha o ritmo.
O vídeo funciona em looping: a cena final precisa se conectar à cena inicial. As duas foram gravadas no mesmo take, então considere essa continuidade ao montar a sequência.
Por enquanto, faça apenas um corte bruto inicial, definindo a ordem das cenas e o dinamismo esperado. Não se preocupe com acabamentos ou ajustes finos nesta etapa.`;

const PROMPT_FASE_2_BASE = `Trabalhe como especialista em colorização cinematográfica. A partir do corte bruto da fase anterior, ajuste as cores para dar ao vídeo um aspecto de filme, mantendo uma imagem natural e coerente.
Adicione legendas e elementos visuais que acompanhem o conteúdo e o ritmo do vídeo:

- No início e no encerramento com CTA, use legenda grande de destaque.
- No restante do vídeo, use legendas dinâmicas que acompanhem a fala e conversem com as imagens.

Acrescente efeitos sonoros leves ao longo do vídeo, sem competir com a fala ou com a música.
Mantenha o ritmo e a continuidade do corte bruto, incluindo a conexão entre o final e o início para que o vídeo funcione em looping.`;

const PASSOS = [
  "Crie uma pasta e coloque nela todos os takes brutos, o roteiro e a música (se tiver).",
  "Separe também suas referências: transições e efeitos que você gosta, prints de exemplo e o render da legenda, se tiver.",
  "Abra o Claude, selecione o modelo Opus 5.5 com esforço máximo e anexe todos os arquivos no chat.",
  "Cole o Prompt da Fase 1 e espere o corte bruto.",
  "Aprovou o corte? Preencha \"Adicionar mais ajustes\", copie o Prompt da Fase 2 e cole no mesmo chat.",
];

const LARANJA = "#E0521D";

function BotaoCopiar({ texto }: { texto: string }) {
  const [copiado, setCopiado] = useState(false);
  async function copiar() {
    await navigator.clipboard.writeText(texto);
    setCopiado(true);
    setTimeout(() => setCopiado(false), 2000);
  }
  return (
    <button onClick={copiar} style={{ marginTop: 12, width: "100%", padding: "14px 16px", background: "#000", color: "#F2F0EB", border: 0, borderRadius: 10, fontSize: 16, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>
      {copiado ? "Copiado!" : "Copiar"}
    </button>
  );
}

const caixa: React.CSSProperties = { whiteSpace: "pre-wrap", fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace", fontSize: 13, lineHeight: 1.55, background: "#fff", border: "1px solid #d9d6cf", borderRadius: 10, padding: 16, margin: 0, wordBreak: "break-word" };
const h2: React.CSSProperties = { fontSize: 30, lineHeight: 1.2, fontWeight: 400, margin: "40px 0 16px", textTransform: "uppercase" };

export default function Edita() {
  const [ajustes, setAjustes] = useState("");
  const promptFinal = PROMPT_FASE_2_BASE + (ajustes.trim() ? "\n\nAjustes adicionais:\n" + ajustes.trim() : "");

  return (
    <main className={inter.className} style={{ background: "#F2F0EB", color: "#000", minHeight: "100vh", padding: "40px 16px 48px" }}>
      <div style={{ maxWidth: 720, margin: "0 auto" }}>
        <h1 className={anton.className} style={{ fontSize: 48, lineHeight: 1.2, fontWeight: 400, margin: 0, textTransform: "uppercase" }}>
          Edite seu vídeo <span style={{ color: LARANJA }}>inteiro</span> com o Claude
        </h1>
        <p style={{ fontSize: 19, margin: "12px 0 0" }}>2 prompts. 1 chat. Você só grava.</p>

        <h2 className={anton.className} style={h2}>Passo a passo</h2>
        <ol style={{ margin: 0, paddingLeft: 22, fontSize: 17, lineHeight: 1.55 }}>
          {PASSOS.map((p, i) => <li key={i} style={{ marginBottom: 10 }}>{p}</li>)}
        </ol>

        <h2 className={anton.className} style={h2}>Fase 1 — Cortes</h2>
        <pre style={caixa}>{PROMPT_FASE_1}</pre>
        <BotaoCopiar texto={PROMPT_FASE_1} />

        <h2 className={anton.className} style={h2}>Fase 2 — Cor, legendas e sons</h2>
        <label htmlFor="ajustes" style={{ display: "block", fontWeight: 700, marginBottom: 8 }}>Adicionar mais ajustes (opcional)</label>
        <textarea
          id="ajustes"
          value={ajustes}
          onChange={(e) => setAjustes(e.target.value)}
          rows={5}
          placeholder="Ex: use a legenda grande atrás da minha cabeça no início e no CTA. Quando eu apontar para cima, reproduza o estilo do print que enviei. Quando minha esposa aparecer, faça um movimento de câmera lateral e de volta."
          style={{ width: "100%", boxSizing: "border-box", padding: 12, fontSize: 16, fontFamily: "inherit", border: "1px solid #d9d6cf", borderRadius: 10, background: "#fff", resize: "vertical", marginBottom: 16 }}
        />
        <pre style={caixa}>{promptFinal}</pre>
        <BotaoCopiar texto={promptFinal} />

        <footer style={{ marginTop: 56, textAlign: "center", fontSize: 15 }}>
          <a href="https://instagram.com/kawan.labs" target="_blank" rel="noopener noreferrer" style={{ color: "#000", fontWeight: 700 }}>@kawan.labs</a>
        </footer>
      </div>
    </main>
  );
}
