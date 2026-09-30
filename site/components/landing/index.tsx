import type { CSSProperties, ReactNode } from "react";
import Image from "next/image";
import CapturaLead, { type Capa } from "@/components/captura-lead";
import IconeWhatsapp from "@/app/isca/[palavra]/icone-whatsapp";
import { SERVICOS, type Publico } from "@/data/servicos";
import type { Isca } from "@/lib/iscas";
import { linkWhatsapp } from "@/lib/lead";
import { PorPublico, PublicoProvider } from "./publico";
import { Revelar } from "./revelar";
import TogglePublico from "./toggle-publico";
import "./landing.css";

/** public/kawan.jpg existe? Definido no build (next.config.mjs). Sem a foto, o quem sou mostra a inicial. */
export const TEM_FOTO = process.env.TEM_FOTO_KAWAN === "1";

const HERO: Record<Publico, { eyebrow: string; antes: string; grifo: string; depois: string; sub: string }> = {
  // \u00A0: o grifo e o "eu automatizo" não quebram no meio
  empresa: {
    eyebrow: "Automação com IA para empresas",
    antes: "O que você faz ",
    grifo: "na\u00A0mão",
    depois: " todo dia, eu\u00A0automatizo",
    sub: "Eu testo IA na prática e coloco pra rodar dentro da sua empresa. Sem projeto de seis meses, sem palestra: coisa funcionando.",
  },
  profissional: {
    eyebrow: "Automação com IA para quem atende sozinho",
    antes: "Você atende. A\u00A0parte ",
    grifo: "chata",
    depois: " eu\u00A0automatizo",
    sub: "Médico, advogado, dentista, contador, arquiteto: quem vive de agenda, prazo e WhatsApp. Projeto menor, escopo enxuto, feito pra quem não tem equipe pra delegar.",
  },
};

/** Abertura do "como eu trabalho". Só no modo profissional. */
const ABERTURA_PROFISSIONAL =
  "Aqui não tem time de dez pessoas nem processo escrito. Tem você, a agenda e o celular tocando. Então a automação tem que ser pequena, entrar rápido e não te dar trabalho novo.";

const PASSOS = [
  { numero: "01", titulo: "Eu testo antes", texto: "Se não funcionar, eu falo que não funcionou. Sem enrolar." },
  {
    numero: "02",
    titulo: "Entrego rodando",
    texto: "Não é consultoria em PDF. É automação ligada, funcionando na sua operação, com você vendo rodar.",
  },
  {
    numero: "03",
    titulo: "Você vê o número",
    texto: "A gente mede o que mudou: tempo, resposta, venda. Sem achismo e sem relatório bonito.",
  },
];

const CAPA_TABELA: Capa = {
  eyebrow: "De graça, chega na hora",
  antes: "A tabela das IAs",
  sub: "Qual IA usar pra cada coisa, o que vale pagar e o que resolve de graça. Eu atualizo toda vez que testo uma nova.",
  botao: "Quero a tabela",
};

const CONTATO: Record<Publico, { titulo: string; texto: string }> = {
  empresa: {
    titulo: "Me conta o que trava aí",
    texto: "Manda uma mensagem falando do seu negócio. Se der pra automatizar, eu falo como. Se não der, eu falo também.",
  },
  profissional: {
    titulo: "Me conta como é o seu dia",
    texto: "Manda uma mensagem falando da sua rotina. Se der pra automatizar, eu falo como. Se não der, eu falo também.",
  },
};

const ZAP_CONTATO = "Oi Kawan! Vi a landing e quero conversar sobre automação com IA.";

const indice = (i: number) => ({ "--i": i }) as CSSProperties;

/** As duas versões saem do servidor; o toggle só escolhe qual aparece. */
const porPublico = (versao: (p: Publico) => ReactNode) => (
  <PorPublico empresa={versao("empresa")} profissional={versao("profissional")} />
);

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

function Hero() {
  return (
    <section className="lp-wrap lp-hero">
      <TogglePublico />
      {porPublico((p) => (
        <>
          <p className="lp-eyebrow">{HERO[p].eyebrow}</p>
          <h1 className="lp-h1">
            {HERO[p].antes}
            <span className="lp-grifo">{HERO[p].grifo}</span>
            {HERO[p].depois}
          </h1>
          <p className="lp-sub">{HERO[p].sub}</p>
        </>
      ))}
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

function ComoTrabalho() {
  return (
    <section className="lp-faixa">
      <div className="lp-wrap lp-secao">
        <h2 className="lp-h2">Como eu trabalho</h2>
        <PorPublico empresa={null} profissional={<p className="lp-intro">{ABERTURA_PROFISSIONAL}</p>} />
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

function Servicos({ comToggle }: { comToggle?: boolean }) {
  return (
    <section id="servicos" className="lp-wrap lp-secao">
      <h2 className="lp-h2">O que dá pra automatizar</h2>
      <p className="lp-intro">Escolhe o que faz sentido pra você e me chama no WhatsApp. A conversa começa pelo seu caso.</p>
      {comToggle && (
        <div className="lp-servicos-toggle">
          <TogglePublico />
        </div>
      )}
      <Revelar grade className="lp-grade">
        {porPublico((p) =>
          SERVICOS[p].map((s, i) => (
            <div key={`${p}-${s.numero}`} style={indice(i)}>
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
          )),
        )}
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
          <h2 className="lp-h2">Quem tá do outro lado</h2>
          <p className="lp-quem-sub">Kawan, 22 anos, Mato Grosso</p>
          <p className="lp-texto">
            Trabalho com automação há 4 anos e testo IA na prática todo dia. O que funciona eu mostro. O que não funciona eu falo que não funciona.
          </p>
          <p className="lp-texto">
            Sou pai do Luka. Meu tempo é curto igual ao seu, então eu não vendo projeto de seis meses: eu entrego coisa rodando.
          </p>
          <p className="lp-texto">
            <strong>Não sou agência. Você fala comigo, eu construo, você vê funcionando.</strong>
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
          {porPublico((p) => (
            <>
              <h2 className="lp-h2">{CONTATO[p].titulo}</h2>
              <p className="lp-intro">{CONTATO[p].texto}</p>
            </>
          ))}
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

/** Página inteira da raiz. publico: só o valor inicial (?p=). isca null: o bloco #tabela mostra só o WhatsApp. */
export function Landing({ publico, isca }: { publico: Publico; isca: Isca | null }) {
  return (
    <PublicoProvider inicial={publico}>
      <div className="lp">
        <Header />
        <main>
          <Hero />
          <ComoTrabalho />
          <Servicos />
          <Tabela isca={isca} />
          <QuemSou />
          <Contato />
        </main>
        <Rodape />
      </div>
    </PublicoProvider>
  );
}

/** Embaixo da tela Pronto de /isca/PALAVRA: sem hero e sem #tabela. O toggle fica no topo dos serviços. */
export function SecoesPosEntrega({ publico }: { publico: Publico }) {
  return (
    <PublicoProvider inicial={publico}>
      <div className="lp">
        <Servicos comToggle />
        <QuemSou />
        <Contato />
        <Rodape />
      </div>
    </PublicoProvider>
  );
}
