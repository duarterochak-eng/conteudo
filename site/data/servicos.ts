// Cards da seção #servicos da landing. Cada card abre o WhatsApp do Kawan citando o título.

export type Publico = "empresa" | "profissional";

export type Servico = { numero: string; titulo: string; descricao: string; cta: string; destaque?: boolean };

/** ?p= da URL. Qualquer coisa diferente de "profissional" vale empresa (o padrão). */
export const lerPublico = (p: unknown): Publico => (p === "profissional" ? "profissional" : "empresa");

const CTA_EMPRESA = "Quero isso na minha empresa →";
const CTA_PROFISSIONAL = "Quero isso no meu dia →";

export const SERVICOS_EMPRESA: Servico[] = [
  {
    numero: "01",
    titulo: "Atendente de WhatsApp que não deixa lead esfriar",
    descricao:
      "Responde na hora com a informação certa da sua empresa, faz follow-up sozinho em quem sumiu e te chama quando alguém está pronto pra comprar. Você entra na conversa só na hora de fechar.",
    cta: CTA_EMPRESA,
  },
  {
    numero: "02",
    titulo: "Seu Instagram no automático",
    descricao:
      "Reels e carrosséis prontos, com a sua marca, a sua história e o que já está viralizando no seu nicho. Você para de perder o domingo pensando no que postar.",
    cta: CTA_EMPRESA,
  },
  {
    numero: "03",
    titulo: "Qual IA usar (e qual é dinheiro jogado fora)",
    descricao:
      "Eu olho como a sua empresa trabalha hoje e digo, ferramenta por ferramenta: o que vale a assinatura, o que resolve de graça e o que você pode cancelar ainda hoje.",
    cta: CTA_EMPRESA,
  },
  {
    numero: "04",
    titulo: "Segundo cérebro da empresa",
    descricao:
      'Contrato, planilha, manual, conversa antiga: tudo num lugar que responde em português e mostra de onde tirou. Acaba o "isso só o fulano sabe".',
    cta: CTA_EMPRESA,
  },
  {
    numero: "05",
    titulo: "Automação sob medida",
    descricao:
      "Aquele processo chato que só a sua empresa tem. Eu mapeio, automatizo e entrego funcionando. É aqui que mora o ganho grande de tempo.",
    cta: CTA_EMPRESA,
    destaque: true,
  },
  {
    numero: "06",
    titulo: "Prazo e documento no automático",
    descricao:
      "Entrada de documento, conferência, prazo e aviso pro cliente. O que hoje depende de alguém abrir pasta e lembrar de cabeça.",
    cta: CTA_EMPRESA,
  },
];

export const SERVICOS_PROFISSIONAL: Servico[] = [
  {
    numero: "01",
    titulo: "Agenda que confirma sozinha",
    descricao:
      "Lembrete, confirmação e remarcação no WhatsApp, sem você nem a secretária lembrarem. Horário vago dói no bolso.",
    cta: CTA_PROFISSIONAL,
  },
  {
    numero: "02",
    titulo: "WhatsApp que responde e já marca",
    descricao:
      "Responde as perguntas de sempre (preço, endereço, convênio, horário) e marca direto na sua agenda. Você entra só quando é caso de verdade.",
    cta: CTA_PROFISSIONAL,
  },
  {
    numero: "03",
    titulo: "Prazo e documento no automático",
    descricao:
      "Entrada de documento, conferência, prazo e aviso pro cliente. O que hoje depende de você abrir pasta e lembrar de cabeça.",
    cta: CTA_PROFISSIONAL,
  },
  {
    numero: "04",
    titulo: "Segundo cérebro do seu escritório",
    descricao:
      "Seus modelos, laudos, contratos e anotações num lugar que responde em português e mostra de onde tirou. Você para de caçar arquivo.",
    cta: CTA_PROFISSIONAL,
  },
  {
    numero: "05",
    titulo: "Seu Instagram sem tomar seu tempo",
    descricao: "Reels e carrosséis prontos sobre a sua área, com a sua cara. Você grava e posta, não fica pensando no que dizer.",
    cta: CTA_PROFISSIONAL,
  },
];

export const SERVICOS: Record<Publico, Servico[]> = { empresa: SERVICOS_EMPRESA, profissional: SERVICOS_PROFISSIONAL };
