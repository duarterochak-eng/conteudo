"use client";
import { useState } from "react";
import IconeWhatsapp from "./icone-whatsapp";
import {
  DOR_ROTULO,
  DOR_VALORES,
  TAMANHO_ROTULO,
  TAMANHO_VALORES,
  linkWhatsapp,
  normalizarWhatsapp,
  whatsappValido,
  type Dor,
  type Tamanho,
} from "@/lib/lead";

const COR = { fundo: "#F2F0EB", texto: "#141210", laranja: "#E0521D", erro: "#B42A2A", borda: "#D9D5CC", suave: "#6F6961" };

type Etapa = "email" | "cadastro" | "reaceite" | "pronto";
type Conversa = "oferecer" | "pedido" | "nao";
type Erros = Partial<Record<"email" | "nome" | "tem_empresa" | "tamanho" | "dor" | "conversar" | "whatsapp" | "aceite" | "geral", string>>;

/** Textos da capa. Sem isso vale o padrão das iscas ("Receba {titulo}"). */
export type Capa = { antes: string; destaque: string; sub: string; botao: string };

const ERRO_GERAL = "Deu erro aqui. Tenta de novo em instantes.";
const SEM_CONEXAO = "Sem conexão. Confere a internet e tenta de novo.";

export default function Captura({ palavra, titulo, capa }: { palavra: string; titulo: string; capa?: Capa }) {
  const [etapa, setEtapa] = useState<Etapa>("email");
  const [email, setEmail] = useState("");
  const [site, setSite] = useState("");
  const [nome, setNome] = useState("");
  const [temEmpresa, setTemEmpresa] = useState<boolean | null>(null);
  const [ramo, setRamo] = useState("");
  const [tamanho, setTamanho] = useState<Tamanho | null>(null);
  const [dor, setDor] = useState<Dor | null>(null);
  const [querConversar, setQuerConversar] = useState<boolean | null>(null);
  const [whatsapp, setWhatsapp] = useState("");
  const [aceite, setAceite] = useState(false);
  const [primeiro, setPrimeiro] = useState("");
  const [urlEntrega, setUrlEntrega] = useState("");
  const [conversa, setConversa] = useState<Conversa>("nao");
  const [temWhatsapp, setTemWhatsapp] = useState(false);
  const [pedindoZap, setPedindoZap] = useState(false);
  const [zapConversa, setZapConversa] = useState("");
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
        setErros({ geral: j.erro || ERRO_GERAL });
        return;
      }
      if (j.status === "cadastro") setEtapa("cadastro");
      else if (j.status === "reaceite") { setPrimeiro(j.nome || ""); setEtapa("reaceite"); }
      else {
        setPrimeiro(j.nome || primeiro);
        setUrlEntrega(j.url || "");
        setConversa(j.conversar === "oferecer" || j.conversar === "pedido" ? j.conversar : "nao");
        setTemWhatsapp(!!j.tem_whatsapp);
        setEtapa("pronto");
      }
    } catch {
      setErros({ geral: SEM_CONEXAO });
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
    const zap = normalizarWhatsapp(whatsapp);
    if (nome.trim().length < 2) er.nome = "Coloca seu nome.";
    if (temEmpresa === null) er.tem_empresa = "Escolhe uma opção.";
    if (temEmpresa) {
      if (!tamanho) er.tamanho = "Escolhe uma opção.";
      if (!dor) er.dor = "Escolhe uma opção.";
      if (querConversar === null) er.conversar = "Escolhe uma opção.";
    }
    if (whatsapp.trim() && !whatsappValido(zap)) er.whatsapp = "Coloca o número com DDD.";
    else if (temEmpresa && querConversar && !zap) er.whatsapp = "Coloca seu WhatsApp com DDD pra eu te chamar.";
    if (!aceite) er.aceite = "Marca a caixa pra receber por e-mail.";
    if (Object.keys(er).length) return setErros(er);
    enviar({
      nome: nome.trim(),
      tem_empresa: temEmpresa,
      ramo: temEmpresa && ramo.trim() ? ramo.trim() : undefined,
      tamanho: temEmpresa ? tamanho : undefined,
      maior_dor: temEmpresa ? dor : undefined,
      quer_conversar: temEmpresa ? querConversar : undefined,
      whatsapp: zap || undefined,
      aceite_email: true,
    });
  }

  function passoReaceite(e: React.FormEvent) {
    e.preventDefault();
    enviar({ aceite_email: aceite });
  }

  // botão "Quero conversar" da tela Pronto (lead que já tinha cadastro)
  async function pedirConversa(e?: React.FormEvent) {
    e?.preventDefault();
    const zap = normalizarWhatsapp(zapConversa);
    if (!temWhatsapp && !whatsappValido(zap)) return setErros({ whatsapp: "Coloca o número com DDD." });
    setCarregando(true);
    setErros({});
    try {
      const r = await fetch("/api/isca/conversar", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email, isca: palavra, whatsapp: zap || undefined }),
      });
      const j = await r.json().catch(() => ({}));
      if (!r.ok) {
        setErros({ geral: j.erro || ERRO_GERAL });
        return;
      }
      setConversa("pedido");
    } catch {
      setErros({ geral: SEM_CONEXAO });
    } finally {
      setCarregando(false);
    }
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
              {capa ? capa.antes : "Receba"} <span style={{ color: COR.laranja }}>{capa ? capa.destaque : titulo}</span>
            </h1>
            <p style={s.p}>{capa ? capa.sub : "Coloca seu e-mail que chega na hora."}</p>
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
            <Botao carregando={carregando}>{capa ? capa.botao : "Continuar"}</Botao>
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
              <Opcoes<boolean>
                colunas={2}
                valor={temEmpresa}
                onChange={setTemEmpresa}
                itens={[
                  { valor: true, rotulo: "Sim" },
                  { valor: false, rotulo: "Não" },
                ]}
              />
            </Campo>

            {temEmpresa && (
              <>
                <Campo rotulo="De quê?">
                  <input className="isca-in" maxLength={80} placeholder="Ex.: clínica, loja, escritório" value={ramo} onChange={(e) => setRamo(e.target.value)} />
                </Campo>

                <Campo rotulo="Quantas pessoas trabalham aí?" erro={erros.tamanho} grupo>
                  <Opcoes<Tamanho>
                    colunas={2}
                    valor={tamanho}
                    onChange={setTamanho}
                    itens={TAMANHO_VALORES.map((v) => ({ valor: v, rotulo: TAMANHO_ROTULO[v] }))}
                  />
                </Campo>

                <Campo rotulo="O que mais come o seu tempo hoje?" erro={erros.dor} grupo>
                  <Opcoes<Dor>
                    colunas={1}
                    valor={dor}
                    onChange={setDor}
                    itens={DOR_VALORES.map((v) => ({ valor: v, rotulo: DOR_ROTULO[v] }))}
                  />
                </Campo>

                <Campo rotulo="Quer conversar comigo sobre automatizar isso?" erro={erros.conversar} grupo>
                  <Opcoes<boolean>
                    colunas={2}
                    valor={querConversar}
                    onChange={setQuerConversar}
                    itens={[
                      { valor: true, rotulo: "Sim, quero conversar" },
                      { valor: false, rotulo: "Agora não" },
                    ]}
                  />
                </Campo>
              </>
            )}

            <Campo rotulo={temEmpresa && querConversar ? "WhatsApp com DDD" : "WhatsApp com DDD (opcional)"} erro={erros.whatsapp}>
              <input className="isca-in" type="tel" inputMode="tel" autoComplete="tel" placeholder="(11) 91234-5678" value={whatsapp} onChange={(e) => setWhatsapp(e.target.value)} />
              {temEmpresa && querConversar && <span style={s.suave}>É por esse número que eu te chamo.</span>}
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
            {urlEntrega ? (
              <>
                <a href={urlEntrega} className="isca-btn" style={{ textAlign: "center", textDecoration: "none" }}>
                  {palavra === "TABELA" || palavra === "BIO" ? "Abrir a tabela das IAs" : `Abrir ${titulo}`}
                </a>
                <p style={s.p}>Também te mandei por e-mail. Se não chegar em 1 minuto, olha o Spam ou Promoções.</p>
              </>
            ) : (
              <p style={s.p}>
                <strong>{titulo}</strong> está indo pro seu e-mail. Se não aparecer em 2 minutos, confere a aba Promoções.
              </p>
            )}

            {conversa === "oferecer" && (
              <div style={s.cartao}>
                <strong style={{ fontSize: 17 }}>Tem empresa? Dá pra falar comigo direto.</strong>
                {!pedindoZap ? (
                  <button type="button" className="isca-opt" disabled={carregando} onClick={() => (temWhatsapp ? pedirConversa() : setPedindoZap(true))}>
                    Quero conversar sobre automatizar minha empresa
                  </button>
                ) : (
                  <form onSubmit={pedirConversa} noValidate style={s.form}>
                    <Campo rotulo="WhatsApp com DDD" erro={erros.whatsapp}>
                      <input className="isca-in" type="tel" inputMode="tel" autoComplete="tel" placeholder="(11) 91234-5678" value={zapConversa} onChange={(e) => setZapConversa(e.target.value)} autoFocus />
                    </Campo>
                    <Botao carregando={carregando}>Quero conversar</Botao>
                  </form>
                )}
                {erros.geral && <Erro>{erros.geral}</Erro>}
              </div>
            )}
            {conversa === "pedido" && (
              <p style={s.p}>
                <strong>Recebi seu pedido de conversa.</strong> Eu te chamo no WhatsApp em breve.
              </p>
            )}
          </div>
        )}

        <Contato palavra={palavra} instagram={etapa === "pronto"} />
      </div>
    </main>
  );
}

/** Botão direto pro WhatsApp do Kawan, com mensagem pronta que já diz de onde a pessoa veio. */
function Contato({ palavra, instagram }: { palavra: string; instagram?: boolean }) {
  const href = linkWhatsapp(`Oi Kawan! Vim pelo Instagram (${palavra}) e queria conversar sobre IA na minha empresa.`);
  return (
    <div style={s.contato}>
      <span style={s.contatoTexto}>Prefere falar direto?</span>
      <a href={href} target="_blank" rel="noopener noreferrer" className="isca-zap">
        <IconeWhatsapp />
        Me chama no WhatsApp
      </a>
      {instagram && (
        <a href="https://instagram.com/kawan.labs" target="_blank" rel="noopener noreferrer" style={s.link}>
          Ou siga @kawan.labs no Instagram
        </a>
      )}
    </div>
  );
}

function Opcoes<T extends string | boolean>({
  itens,
  valor,
  onChange,
  colunas,
}: {
  itens: { valor: T; rotulo: string }[];
  valor: T | null;
  onChange: (v: T) => void;
  colunas: 1 | 2;
}) {
  return (
    <div style={{ display: "grid", gridTemplateColumns: `repeat(${colunas}, 1fr)`, gap: 10 }}>
      {itens.map((i) => (
        <button
          key={String(i.valor)}
          type="button"
          className={`isca-opt${valor === i.valor ? " on" : ""}`}
          aria-pressed={valor === i.valor}
          onClick={() => onChange(i.valor)}
        >
          {i.rotulo}
        </button>
      ))}
    </div>
  );
}

function Campo({ rotulo, erro, grupo, children }: { rotulo?: string; erro?: string; grupo?: boolean; children: React.ReactNode }) {
  // grupo: div em vez de label, senão clicar no rótulo aciona o primeiro botão
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
  contato: { display: "grid", gap: 12, paddingTop: 20, borderTop: `1px solid ${COR.borda}` },
  contatoTexto: { fontSize: 15, color: COR.suave },
  suave: { fontSize: 14, color: COR.suave },
  cartao: { display: "grid", gap: 12, padding: 16, border: `1.5px solid ${COR.borda}`, borderRadius: 12, background: "#fff" },
  link: { fontSize: 15, color: COR.texto, fontWeight: 600, textDecorationColor: COR.laranja, textUnderlineOffset: 4 },
};

const css = `
  body { margin: 0; background: ${COR.fundo}; }
  .isca-in { width: 100%; box-sizing: border-box; font: inherit; font-size: 17px; padding: 14px 16px; border: 1.5px solid ${COR.borda}; border-radius: 12px; background: #fff; color: ${COR.texto}; outline: none; }
  .isca-in:focus { border-color: ${COR.texto}; }
  .isca-btn { font: inherit; font-weight: 700; font-size: 17px; padding: 16px; border: 0; border-radius: 12px; background: ${COR.texto}; color: #fff; cursor: pointer; }
  .isca-btn:disabled { opacity: .6; cursor: wait; }
  .isca-opt { font: inherit; font-weight: 600; font-size: 17px; padding: 16px; border: 1.5px solid ${COR.borda}; border-radius: 12px; background: #fff; color: ${COR.texto}; cursor: pointer; }
  .isca-opt:disabled { opacity: .6; cursor: wait; }
  .isca-opt.on { border-color: ${COR.laranja}; background: ${COR.laranja}; color: #fff; }
  .isca-zap { display: flex; align-items: center; justify-content: center; gap: 10px; font: inherit; font-weight: 700; font-size: 17px; padding: 14px 16px; border: 1.5px solid ${COR.borda}; border-radius: 12px; background: #fff; color: ${COR.texto}; text-decoration: none; }
  .isca-zap:hover { border-color: #25D366; }
`;
