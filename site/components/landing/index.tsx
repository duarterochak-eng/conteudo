import type { CSSProperties } from "react";
import Image from "next/image";
import CapturaLead, { type Capa } from "@/components/captura-lead";
import IconeWhatsapp from "@/app/isca/[palavra]/icone-whatsapp";
import { SERVICOS, type Publico } from "@/data/servicos";
import type { Isca } from "@/lib/iscas";
import { linkWhatsapp } from "@/lib/lead";
import { Revelar } from "./revelar";
import TogglePublico from "./toggle-publico";
import "./landing.css";

/** public/kawan.jpg existe? Definido no build (next.config.mjs). Sem a foto, o quem sou mostra a inicial. */
export const TEM_FOTO = process.env.TEM_FOTO_KAWAN === "1";

const HEADLINE: Record<Publico, { antes: string; grifo: string; depois: string }> = {
  // \u00A0: o grifo e o "eu automatizo" não quebram no meio
  empresa: { antes: "O que você faz ", grifo: "na\u00A0mão", depois: " todo dia, eu\u00A0automatizo" },
  profissional: { antes: "Você atende. ", grifo: "O\u00A0resto", depois: " eu\u00A0automatizo" },
};

const CONTEXTO: Record<Publico, string> = {
  empresa:
    "Na maioria das empresas o tempo não some num problema grande. Some em responder a mesma pergunta, cobrar quem sumiu e procurar arquivo. É isso que eu tiro das costas da sua equipe.",
  profissional:
    "Quem trabalha por conta perde o dia confirmando horário, respondendo preço e caçando documento. É tempo que não vira atendimento. É isso que eu tiro da sua mão.",
};

const PASSOS = [
  {
    numero: "01",
    titulo: "Entendo como você trabalha hoje",
    texto: "Uma conversa pra achar onde o tempo vaza: tarefa repetida, retrabalho, o que depende de alguém lembrar.",
  },
  {
    numero: "02",
    titulo: "Automatizo o que mais pesa",
    texto: "Começo pelo que devolve mais tempo e monto a automação com IA em volta do seu jeito de trabalhar.",
  },
  {
    numero: "03",
    titulo: "Entrego funcionando",
    texto: "Você vê rodando no seu dia a dia real. O que precisar de ajuste, eu ajusto com o uso.",
  },
];

const CAPA_TABELA: Capa = {
  antes: "A tabela das IAs",
  destaque: "de graça",
  sub: "Qual IA contratar pra cada tarefa, conferida toda semana. Coloca seu e-mail que chega na hora.",
  botao: "Quero a tabela",
};

const ZAP_CONTATO = "Oi Kawan! Vi a landing e quero conversar sobre automação com IA.";

const indice = (i: number) => ({ "--i": i }) as CSSProperties;

function Header() {
  return (
    <header className="lp-wrap lp-header">
      <span className="lp-logo">
        kawan<span>.</span>labs
      </span>
      <a href="#tabela" className="lp-btn-sec">
        Tabela das IAs
      </a>
    </header>
  );
}

function Hero({ publico }: { publico: Publico }) {
  const h = HEADLINE[publico];
  return (
    <section className="lp-wrap lp-hero">
      <TogglePublico publico={publico} />
      <p className="lp-eyebrow">Automação com IA na prática</p>
      <h1 className="lp-h1">
        {h.antes}
        <span className="lp-grifo">{h.grifo}</span>
        {h.depois}
      </h1>
      <p className="lp-sub">Eu acho a tarefa repetida que come o seu dia e coloco a IA pra fazer por você.</p>
      <div className="lp-hero-ctas">
        <a href="#servicos" className="lp-btn">
          Ver o que dá pra automatizar
        </a>
        <a href="#tabela" className="lp-link">
          ou pega a tabela das IAs de graça
        </a>
      </div>
    </section>
  );
}

function ComoTrabalho({ publico }: { publico: Publico }) {
  return (
    <section className="lp-faixa">
      <div className="lp-wrap lp-secao">
        <h2 className="lp-h2">Como eu trabalho</h2>
        <p className="lp-intro">{CONTEXTO[publico]}</p>
        <Revelar grade className="lp-passos">
          {PASSOS.map((p, i) => (
            <div key={p.numero} className="lp-passo" style={indice(i)}>
              <span className="lp-num lp-num-grande">{p.numero}</span>
              <h3 className="lp-h3">{p.titulo}</h3>
              <p>{p.texto}</p>
            </div>
          ))}
        </Revelar>
      </div>
    </section>
  );
}

function Servicos({ publico, comToggle }: { publico: Publico; comToggle?: boolean }) {
  return (
    <section id="servicos" className="lp-wrap lp-secao">
      <h2 className="lp-h2">O que dá pra automatizar</h2>
      <p className="lp-intro">Escolhe o que faz sentido pra você e me chama no WhatsApp. A conversa começa pelo seu caso.</p>
      {comToggle && (
        <div className="lp-servicos-toggle">
          <TogglePublico publico={publico} />
        </div>
      )}
      <Revelar grade className="lp-grade">
        {SERVICOS[publico].map((s, i) => (
          <div key={`${publico}-${s.numero}`} style={indice(i)}>
            <a
              href={linkWhatsapp(`Vi a landing e quero falar sobre: ${s.titulo}`)}
              target="_blank"
              rel="noopener noreferrer"
              className={s.destaque ? "lp-card lp-card-destaque" : "lp-card"}
            >
              <span className="lp-num">{s.numero}</span>
              <h3 className="lp-h3">{s.titulo}</h3>
              <p>{s.descricao}</p>
              <span className="lp-card-cta">{s.cta}</span>
            </a>
          </div>
        ))}
      </Revelar>
    </section>
  );
}

function BotaoWhatsapp({ texto, className }: { texto: string; className: string }) {
  return (
    <a href={linkWhatsapp(texto)} target="_blank" rel="noopener noreferrer" className={className}>
      <IconeWhatsapp />
      Me chama no WhatsApp
    </a>
  );
}

function Tabela({ isca }: { isca: Isca | null }) {
  return (
    <section id="tabela" className="lp-wrap lp-secao">
      <Revelar>
        {isca ? (
          <CapturaLead isca={isca.palavra} titulo={isca.titulo} variante="secao" capa={CAPA_TABELA} />
        ) : (
          // sem a isca BIO (desligada ou banco fora do ar): só o WhatsApp
          <div className="lp-escuro">
            <span>Prefere falar direto?</span>
            <BotaoWhatsapp texto={ZAP_CONTATO} className="lp-zap-escuro" />
          </div>
        )}
      </Revelar>
    </section>
  );
}

function QuemSou() {
  return (
    <section className="lp-wrap lp-secao">
      <Revelar className="lp-quem">
        {TEM_FOTO ? (
          <Image src="/kawan.jpg" alt="Kawan" width={440} height={440} sizes="(min-width: 960px) 220px, 88px" className="lp-foto" />
        ) : (
          <span className="lp-foto lp-foto-inicial" aria-hidden="true">
            K
          </span>
        )}
        <div>
          <h2 className="lp-h2">Prazer, eu sou o{"\u00A0"}Kawan</h2>
          <p className="lp-texto">
            Trabalho com IA aplicada à operação de pequenas e médias empresas: atendimento, vendas, conteúdo e aquele processo que ninguém aguenta mais fazer na mão.
          </p>
          <p className="lp-texto">
            Não vendo ferramenta da moda. O que eu entrego é tempo de volta: a tarefa repetida passa a rodar sozinha e as pessoas ficam com o que precisa de gente.
          </p>
          <p className="lp-texto">
            No @kawan.labs eu testo na prática e mostro o que funciona e o que é barulho. Aqui, eu faço isso no seu negócio.
          </p>
        </div>
      </Revelar>
    </section>
  );
}

function Contato() {
  return (
    <section id="contato" className="lp-faixa">
      <div className="lp-wrap lp-secao">
        <Revelar className="lp-contato">
          <h2 className="lp-h2">Me conta o que toma o seu tempo</h2>
          <p className="lp-intro">Manda uma mensagem contando como é o seu dia hoje. Eu respondo e te digo o que dá pra automatizar primeiro.</p>
          <BotaoWhatsapp texto={ZAP_CONTATO} className="lp-btn lp-btn-zap" />
        </Revelar>
      </div>
    </section>
  );
}

function Rodape() {
  return (
    <footer className="lp-wrap lp-rodape">
      <span>
        kawan<span className="lp-ponto">.</span>labs
      </span>
      <a href="https://instagram.com/kawan.labs" target="_blank" rel="noopener noreferrer">
        @kawan.labs no Instagram
      </a>
    </footer>
  );
}

/** Página inteira da raiz. isca null: o bloco #tabela mostra só o WhatsApp. */
export function Landing({ publico, isca }: { publico: Publico; isca: Isca | null }) {
  return (
    <div className="lp">
      <Header />
      <main>
        <Hero publico={publico} />
        <ComoTrabalho publico={publico} />
        <Servicos publico={publico} />
        <Tabela isca={isca} />
        <QuemSou />
        <Contato />
      </main>
      <Rodape />
    </div>
  );
}

/** Embaixo da tela Pronto de /isca/PALAVRA: sem hero e sem #tabela. O toggle fica no topo dos serviços. */
export function SecoesPosEntrega({ publico }: { publico: Publico }) {
  return (
    <div className="lp">
      <Servicos publico={publico} comToggle />
      <QuemSou />
      <Contato />
      <Rodape />
    </div>
  );
}
