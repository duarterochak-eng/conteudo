import type { CSSProperties, ReactNode } from "react";
import type { Metadata } from "next";
import { preconnect } from "react-dom";
import raw from "@/data/tabela-ia.json";
import {
  DIAS_PARA_AVISO,
  apelido,
  diasSemConferir,
  ehNovo,
  fmtCambio,
  fmtData,
  fmtDiaMes,
  fmtIof,
  fmtMult,
  fmtPreco,
  fontesDoRodape,
  isoDia,
  montarPick,
  multiplo,
  parseTabela,
  precoPlano,
  rotuloFonte,
  type Mudanca,
} from "@/lib/tabela";
import "./tabela.css";

// Conteúdo só muda com deploy (o JSON vai junto no build). A revalidação existe para o
// "há N dias sem conferir" e a etiqueta "novo" acompanharem o calendário sem ninguém mexer.
export const revalidate = 43200;

export const metadata: Metadata = {
  title: "Tabela das IAs",
  description: "Qual IA contratar pra cada tarefa. Conferida toda semana.",
  robots: { index: false, follow: false },
};

const FONTES_URL = "https://fonts.googleapis.com/css2?family=Anton&family=Inter+Tight:wght@400;500;600;700&display=swap";

const TAGS: Record<Mudanca["tipo"], string> = { novo: "Novo", plano: "Plano", preco: "Preço", correcao: "Correção", saiu: "Saiu" };

const ICONES: Record<string, ReactNode> = {
  cafe: (
    <>
      <path d="M28 44h52v34a20 20 0 0 1-20 20H48a20 20 0 0 1-20-20z" />
      <path d="M80 52h8a12 12 0 0 1 0 24h-8" />
      <path d="M44 18c-4 6 4 10 0 16M60 18c-4 6 4 10 0 16" />
    </>
  ),
  fone: (
    <>
      <path d="M24 70V58a36 36 0 0 1 72 0v12" />
      <rect x="16" y="62" width="18" height="28" rx="7" />
      <rect x="86" y="62" width="18" height="28" rx="7" />
      <path d="M95 90c0 12-12 18-30 18" />
    </>
  ),
  grafico: (
    <>
      <rect x="18" y="16" width="84" height="88" rx="8" />
      <path d="M34 84V66M52 84V50M70 84V60M88 84V38" />
      <path d="M34 44l18-10 18 8 18-14" stroke="#E0521D" />
    </>
  ),
  tela: (
    <>
      <rect x="12" y="18" width="96" height="64" rx="6" />
      <path d="M44 102h32M60 82v20" />
      <path d="M58 36v32l9-9 7 14 7-3-7-14h13z" fill="#E0521D" />
    </>
  ),
};

function Icone({ nome }: { nome: string }) {
  return (
    <svg viewBox="0 0 120 120" width="72" height="72" fill="none" stroke="currentColor" strokeWidth="6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {ICONES[nome]}
    </svg>
  );
}

/** Até 2 fontes da linha, com o nome do veículo. */
function Fontes({ urls }: { urls: string[] }) {
  return (
    <span className="src">
      {urls.slice(0, 2).map((u, i) => (
        <span key={u}>
          {i > 0 && " · "}
          <a href={u} target="_blank" rel="noopener noreferrer">
            {rotuloFonte(u)}
            <span aria-hidden="true"> ↗</span>
          </a>
        </span>
      ))}
    </span>
  );
}

function ListaMudancas({ itens }: { itens: Mudanca[] }) {
  return (
    <ul className="mud">
      {itens.map((m) => (
        <li key={`${m.data}-${m.titulo}`}>
          <details>
            <summary>
              <span className="dt">{fmtDiaMes(m.data)}</span>
              <span className={`tag tag-${m.tipo}`}>{TAGS[m.tipo]}</span>
              <span className="tt">{m.titulo}</span>
            </summary>
            <div className="tx">
              <p>{m.detalhe}</p>
              <Fontes urls={m.fontes} />
            </div>
          </details>
        </li>
      ))}
    </ul>
  );
}

export default function TabelaIA() {
  preconnect("https://fonts.googleapis.com");
  preconnect("https://fonts.gstatic.com", { crossOrigin: "anonymous" });

  const t = parseTabela(raw);
  const hoje = isoDia(new Date());
  const base = t.modelos.find((m) => m.id === t.modelo_base)!;
  const porId = (id: string) => t.modelos.find((m) => m.id === id)!;
  const maxMult = Math.max(...t.modelos.filter((m) => m.status === "atual").map((m) => multiplo(m, base) ?? 0));
  const mudancas = [...t.mudancas].sort((a, b) => b.data.localeCompare(a.data));
  const dias = diasSemConferir(t, hoje);
  const nProv = { "--n": t.provedores.length } as CSSProperties;

  return (
    <div className="tb">
      <link rel="stylesheet" href={FONTES_URL} precedence="default" />

      <main className="wrap">
        <div className="top">
          <span className="lab">Tabela · conferida em {fmtData(t.verificada_em)}</span>
          <span className="lab">
            <b>@kawan.labs</b>
          </span>
        </div>

        {dias > DIAS_PARA_AVISO && (
          <p className="aviso" role="note">
            Última conferência em {fmtData(t.verificada_em)}, há {dias} dias. Preço e modelo mudam rápido: confere no site oficial antes de assinar.
          </p>
        )}

        <header className="hero">
          <h1 className="disp">
            Qual IA <mark>contratar</mark> pra cada tarefa
          </h1>
          <p>
            Os modelos mais usados do ChatGPT e do Claude, tratados como funcionários: cada um é bom numa coisa e cobra um salário diferente. Contratar o errado é pagar
            até {maxMult.toLocaleString("pt-BR")} vezes mais pelo mesmo serviço.
          </p>
        </header>

        <section id="mudou">
          <div className="sh">
            <h2 className="disp">
              Últimas <mark>mudanças</mark>
            </h2>
            <span className="lab">Conferida toda semana</span>
          </div>
          <ListaMudancas itens={mudancas.slice(0, 3)} />
          {mudancas.length > 3 && (
            <details className="mais">
              <summary>Ver mudanças anteriores ({Math.min(mudancas.length - 3, 17)})</summary>
              <ListaMudancas itens={mudancas.slice(3, 20)} />
            </details>
          )}
        </section>

        <div className="team" aria-label="A equipe">
          {t.equipe.map((e) => {
            const m = porId(e.modelo);
            return (
              <article key={e.modelo} className={`badge${e.destaque ? " or" : ""}`}>
                <div className="strip">
                  <span>Crachá</span>
                  <span>{e.cargo}</span>
                </div>
                <div className="ic">
                  <Icone nome={e.icone} />
                </div>
                <div className="bd">
                  <div className="nm">{m.nome}</div>
                  <div className="sal">
                    <b>{fmtMult(multiplo(m, base)!)}</b>
                    <span>{m.id === base.id ? "salário base" : `a ${apelido(base)}`}</span>
                  </div>
                  <div className="where">{e.onde}</div>
                  <div className="no">{e.nao}</div>
                </div>
              </article>
            );
          })}
        </div>

        <section id="quadro">
          <div className="sh">
            <h2 className="disp">
              O quadro <mark>completo</mark>
            </h2>
            <span className="lab">Salário = quantas vezes o preço da {base.nome}</span>
          </div>
          <div className="teams">
            {t.provedores.map((p) => (
              <div className="teamcol" key={p.id}>
                <div className="th">
                  <b>{p.nome}</b>
                  <span>{p.empresa}</span>
                </div>
                {t.modelos
                  .filter((m) => m.provedor === p.id)
                  .map((m) => {
                    const x = multiplo(m, base);
                    return (
                      <div key={m.id} className={`m${m.status === "anterior" ? " old" : ""}`}>
                        <span className="n">
                          {m.nome}
                          {ehNovo(m, hoje) && <span className="novo">novo</span>}
                        </span>
                        <span className="c">{m.cargo}</span>
                        <span className={`x${m.id === base.id ? " base" : ""}`}>
                          {x === null ? "—" : fmtMult(x)}
                          <small>{x === null ? "só no app" : m.id === base.id ? "base" : ""}</small>
                        </span>
                        <span className="d">{m.descricao}</span>
                        <span className="w">
                          {m.onde ? `${m.onde} ` : ""}
                          <Fontes urls={m.fontes} />
                        </span>
                      </div>
                    );
                  })}
              </div>
            ))}
          </div>
        </section>

        <section id="tarefas">
          <div className="sh">
            <h2 className="disp">
              Tarefa por <mark>tarefa</mark>
            </h2>
            <span className="lab">No app: preço do plano · Na automação: salário</span>
          </div>
          <div className="tbl" style={nProv}>
            <div className="row2 hd">
              <span>Tarefa da empresa</span>
              {t.provedores.map((p) => (
                <span key={p.id}>No {p.nome}</span>
              ))}
            </div>
            {t.tarefas.map((tf) => (
              <div className="row2" key={tf.id}>
                <span className="task">
                  {tf.tarefa}
                  {tf.sub && <small>{tf.sub}</small>}
                </span>
                {t.provedores.map((p) => {
                  const k = montarPick(t, tf, p.id);
                  return (
                    <span className="pick" data-side={`No ${p.nome}`} key={p.id}>
                      <span className={`pill p-${k.pill}`}>{k.nome}</span>
                      <span className="cost">
                        {k.custo}
                        <small>{k.sub}</small>
                      </span>
                      {k.fontes && <Fontes urls={k.fontes} />}
                    </span>
                  );
                })}
              </div>
            ))}
          </div>
        </section>

        <section id="precos">
          <div className="sh">
            <h2 className="disp">
              Quanto custa em <mark>real</mark>
            </h2>
          </div>
          <div className="prices">
            {t.provedores.map((p) => (
              <div className="receipt" key={p.id}>
                <h3>Planos do {p.nome}</h3>
                {t.planos
                  .filter((pl) => pl.provedor === p.id)
                  .map((pl) => {
                    const gratis = precoPlano(pl, t.cambio).valor === 0;
                    return (
                      <div className="line" key={pl.id}>
                        <span>
                          {pl.nome}
                          <small>
                            {pl.detalhe} <Fontes urls={pl.fontes} />
                          </small>
                        </span>
                        <b className={gratis ? "or" : undefined}>
                          {pl.a_partir_de && <i>a partir de</i>}
                          {fmtPreco(pl, t.cambio)}
                          {!gratis && <em>/mês</em>}
                        </b>
                      </div>
                    );
                  })}
              </div>
            ))}
          </div>
          <p className="note">
            Conta aproximada: dólar a {fmtCambio(t.cambio)} (cotação do Banco Central de {fmtData(t.cambio.data)}) mais {fmtIof(t.cambio)} de IOF do cartão, sobre o preço do plano
            mensal. O que é cobrado em reais não passa por conversão. Os modelos de cada plano mudam rápido: confere no app antes de assinar.
          </p>
        </section>

        <section id="regra">
          <div className="sh">
            <h2 className="disp">
              Regra de <mark>bolso</mark>
            </h2>
          </div>
          <div className="rule" style={{ "--n": t.regras.length } as CSSProperties}>
            {t.regras.map((r) => (
              <div className="step" key={r.titulo}>
                <span className="k">{r.titulo}</span>
                <p>{r.texto}</p>
              </div>
            ))}
          </div>
        </section>

        <section>
          <div className="cta">
            <span className="lab" style={{ color: "#BDB6AB" }}>
              O segredo
            </span>
            <h2 className="disp">
              Não escolhe uma. Monta a <mark>equipe</mark>.
            </h2>
            <p>{t.cta.texto}</p>
            <a className="h" href="https://ig.me/m/kawan.labs" target="_blank" rel="noopener noreferrer">
              Me chama no direct: @kawan.labs
            </a>
          </div>
        </section>

        <footer>
          <span>
            Fontes:{" "}
            {fontesDoRodape(t).map((f, i) => (
              <span key={f.rotulo}>
                {i > 0 && " · "}
                <a href={f.url} target="_blank" rel="noopener noreferrer">
                  {f.rotulo}
                </a>
              </span>
            ))}
          </span>
          <span>
            Salário = preço público por uso (o que uma automação paga, via API) em relação à {base.nome}. Modelo sem preço de API aparece só nos planos.
          </span>
          <span>
            Atualizada em {fmtData(t.atualizada_em)} · conferida em {fmtData(t.verificada_em)}. Cada linha tem a fonte ao lado; onde a fonte é de terceiros, vale conferir no site da empresa.
          </span>
        </footer>
      </main>
    </div>
  );
}
