"use client";
import { useState } from "react";

const COR = { fundo: "#F2F0EB", texto: "#141210", laranja: "#E0521D", erro: "#B42A2A", borda: "#D9D5CC" };

type Etapa = "email" | "cadastro" | "reaceite" | "pronto";
type Erros = Partial<Record<"email" | "nome" | "tem_empresa" | "whatsapp" | "aceite" | "geral", string>>;

export default function Captura({ palavra, titulo }: { palavra: string; titulo: string }) {
  const [etapa, setEtapa] = useState<Etapa>("email");
  const [email, setEmail] = useState("");
  const [site, setSite] = useState("");
  const [nome, setNome] = useState("");
  const [temEmpresa, setTemEmpresa] = useState<boolean | null>(null);
  const [ramo, setRamo] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [aceite, setAceite] = useState(false);
  const [primeiro, setPrimeiro] = useState("");
  const [carregando, setCarregando] = useState(false);
  const [erros, setErros] = useState<Erros>({});

  async function enviar(dados?: Record<string, unknown>) {
    setCarregando(true);
    setErros({});
    try {
      const r = await fetch("/api/isca", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ isca: palavra, email, site, dados }),
      });
      const j = await r.json().catch(() => ({}));
      if (!r.ok) {
        setErros({ geral: j.erro || "Deu erro aqui. Tenta de novo em instantes." });
        return;
      }
      if (j.status === "cadastro") setEtapa("cadastro");
      else if (j.status === "reaceite") { setPrimeiro(j.nome || ""); setEtapa("reaceite"); }
      else { setPrimeiro(j.nome || primeiro); setEtapa("pronto"); }
    } catch {
      setErros({ geral: "Sem conexão. Confere a internet e tenta de novo." });
    } finally {
      setCarregando(false);
    }
  }

  function passoEmail(e: React.FormEvent) {
    e.preventDefault();
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email.trim())) return setErros({ email: "Coloca um e-mail válido." });
    enviar();
  }

  function passoCadastro(e: React.FormEvent) {
    e.preventDefault();
    const er: Erros = {};
    const zap = whatsapp.replace(/\D/g, "");
    if (nome.trim().length < 2) er.nome = "Coloca seu nome.";
    if (temEmpresa === null) er.tem_empresa = "Escolhe uma opção.";
    if (zap && (zap.length < 10 || zap.length > 13)) er.whatsapp = "Coloca o número com DDD.";
    if (!aceite) er.aceite = "Marca a caixa pra receber por e-mail.";
    if (Object.keys(er).length) return setErros(er);
    enviar({
      nome: nome.trim(),
      tem_empresa: temEmpresa,
      ramo: temEmpresa && ramo.trim() ? ramo.trim() : undefined,
      whatsapp: zap || undefined,
      aceite_email: true,
    });
  }

  function passoReaceite(e: React.FormEvent) {
    e.preventDefault();
    enviar({ aceite_email: aceite });
  }

  const textoAceite = `Quero receber ${titulo} e novidades do @kawan.labs por e-mail. Posso sair quando quiser.`;

  return (
    <main style={s.main}>
      <link
        rel="stylesheet"
        href="https://fonts.googleapis.com/css2?family=Anton&family=Inter+Tight:wght@400;500;600;700&display=swap"
        // @ts-ignore React 19 hoisting
        precedence="default"
      />
      <style>{css}</style>
      <div style={s.caixa}>
        <div style={s.marca}>@kawan.labs</div>

        {etapa === "email" && (
          <form onSubmit={passoEmail} noValidate style={s.form}>
            <h1 style={s.h1}>
              Receba <span style={{ color: COR.laranja }}>{titulo}</span>
            </h1>
            <p style={s.p}>Coloca seu e-mail que chega na hora.</p>
            <Campo erro={erros.email}>
              <input
                className="isca-in"
                type="email"
                inputMode="email"
                autoComplete="email"
                placeholder="seu@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoFocus
              />
            </Campo>
            <input
              type="text"
              name="site"
              tabIndex={-1}
              autoComplete="off"
              aria-hidden="true"
              value={site}
              onChange={(e) => setSite(e.target.value)}
              style={{ position: "absolute", left: -9999, width: 1, height: 1, opacity: 0 }}
            />
            <Botao carregando={carregando}>Continuar</Botao>
            {erros.geral && <Erro>{erros.geral}</Erro>}
          </form>
        )}

        {etapa === "cadastro" && (
          <form onSubmit={passoCadastro} noValidate style={s.form}>
            <h1 style={s.h1}>Falta pouco</h1>
            <p style={s.p}>Só na primeira vez. Depois é só o e-mail.</p>

            <Campo rotulo="Seu nome" erro={erros.nome}>
              <input className="isca-in" autoComplete="name" maxLength={80} value={nome} onChange={(e) => setNome(e.target.value)} autoFocus />
            </Campo>

            <Campo rotulo="Você tem empresa?" erro={erros.tem_empresa} grupo>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                {[true, false].map((v) => (
                  <button
                    key={String(v)}
                    type="button"
                    className={`isca-opt${temEmpresa === v ? " on" : ""}`}
                    onClick={() => setTemEmpresa(v)}
                  >
                    {v ? "Sim" : "Não"}
                  </button>
                ))}
              </div>
            </Campo>

            {temEmpresa && (
              <Campo rotulo="De quê?">
                <input className="isca-in" maxLength={80} placeholder="Ex.: clínica, loja, escritório" value={ramo} onChange={(e) => setRamo(e.target.value)} />
              </Campo>
            )}

            <Campo rotulo="WhatsApp com DDD (opcional)" erro={erros.whatsapp}>
              <input className="isca-in" type="tel" inputMode="tel" autoComplete="tel" placeholder="(11) 91234-5678" value={whatsapp} onChange={(e) => setWhatsapp(e.target.value)} />
            </Campo>

            <Aceite marcado={aceite} onChange={setAceite} texto={textoAceite} erro={erros.aceite} />
            <Botao carregando={carregando}>Receber</Botao>
            {erros.geral && <Erro>{erros.geral}</Erro>}
          </form>
        )}

        {etapa === "reaceite" && (
          <form onSubmit={passoReaceite} noValidate style={s.form}>
            <h1 style={s.h1}>
              Receba <span style={{ color: COR.laranja }}>{titulo}</span>
            </h1>
            <Aceite marcado={aceite} onChange={setAceite} texto={textoAceite} />
            <Botao carregando={carregando}>Receber</Botao>
            {erros.geral && <Erro>{erros.geral}</Erro>}
          </form>
        )}

        {etapa === "pronto" && (
          <div style={s.form}>
            <h1 style={s.h1}>
              Pronto{primeiro ? `, ${primeiro}` : ""}!
            </h1>
            <p style={s.p}>
              <strong>{titulo}</strong> está indo pro seu e-mail. Se não aparecer em 2 minutos, confere a aba Promoções.
            </p>
            <a href="https://instagram.com/kawan.labs" target="_blank" rel="noopener noreferrer" style={s.link}>
              Me chama no direct: @kawan.labs
            </a>
          </div>
        )}
      </div>
    </main>
  );
}

function Campo({ rotulo, erro, grupo, children }: { rotulo?: string; erro?: string; grupo?: boolean; children: React.ReactNode }) {
  // grupo: div em vez de label, senão clicar no rótulo aciona o botão "Sim"
  const Tag = grupo ? "div" : "label";
  return (
    <Tag style={{ display: "grid", gap: 6 }}>
      {rotulo && <span style={{ fontWeight: 600, fontSize: 15 }}>{rotulo}</span>}
      {children}
      {erro && <Erro>{erro}</Erro>}
    </Tag>
  );
}

function Aceite({ marcado, onChange, texto, erro }: { marcado: boolean; onChange: (v: boolean) => void; texto: string; erro?: string }) {
  return (
    <div style={{ display: "grid", gap: 6 }}>
      <label style={{ display: "flex", gap: 10, alignItems: "flex-start", fontSize: 14, lineHeight: 1.4, cursor: "pointer" }}>
        <input type="checkbox" checked={marcado} onChange={(e) => onChange(e.target.checked)} style={{ width: 20, height: 20, marginTop: 1, accentColor: COR.laranja, flexShrink: 0 }} />
        <span>{texto}</span>
      </label>
      {erro && <Erro>{erro}</Erro>}
    </div>
  );
}

function Botao({ carregando, children }: { carregando: boolean; children: React.ReactNode }) {
  return (
    <button type="submit" className="isca-btn" disabled={carregando}>
      {carregando ? "Enviando…" : children}
    </button>
  );
}

function Erro({ children }: { children: React.ReactNode }) {
  return <span role="alert" style={{ color: COR.erro, fontSize: 14 }}>{children}</span>;
}

const s: Record<string, React.CSSProperties> = {
  main: {
    minHeight: "100dvh",
    background: COR.fundo,
    color: COR.texto,
    fontFamily: "'Inter Tight', system-ui, sans-serif",
    padding: "32px 20px",
    display: "flex",
    justifyContent: "center",
  },
  caixa: { width: "100%", maxWidth: 440, display: "grid", gap: 24, alignContent: "start", paddingTop: "6vh" },
  marca: { fontWeight: 600, fontSize: 14, letterSpacing: 0.3 },
  form: { display: "grid", gap: 18, position: "relative" },
  h1: { fontFamily: "Anton, Impact, sans-serif", fontWeight: 400, fontSize: 40, lineHeight: 1.2, margin: 0, textTransform: "uppercase" },
  p: { fontSize: 17, lineHeight: 1.5, margin: 0 },
  link: { color: COR.texto, fontWeight: 600, fontSize: 16, textDecorationColor: COR.laranja, textUnderlineOffset: 4 },
};

const css = `
  body { margin: 0; background: ${COR.fundo}; }
  .isca-in { width: 100%; box-sizing: border-box; font: inherit; font-size: 17px; padding: 14px 16px; border: 1.5px solid ${COR.borda}; border-radius: 12px; background: #fff; color: ${COR.texto}; outline: none; }
  .isca-in:focus { border-color: ${COR.texto}; }
  .isca-btn { font: inherit; font-weight: 700; font-size: 17px; padding: 16px; border: 0; border-radius: 12px; background: ${COR.texto}; color: #fff; cursor: pointer; }
  .isca-btn:disabled { opacity: .6; cursor: wait; }
  .isca-opt { font: inherit; font-weight: 600; font-size: 17px; padding: 16px; border: 1.5px solid ${COR.borda}; border-radius: 12px; background: #fff; color: ${COR.texto}; cursor: pointer; }
  .isca-opt.on { border-color: ${COR.laranja}; background: ${COR.laranja}; color: #fff; }
`;
