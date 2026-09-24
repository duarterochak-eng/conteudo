import { NextResponse } from "next/server";
import { db } from "@/lib/supabase";
import { askJson } from "@/lib/llm";
import { Spec } from "@/lib/spec";
import { lint, normalizar } from "@/lib/lint";

export const runtime = "nodejs";
export const maxDuration = 120;

const SYSTEM = `Você escreve carrosséis de Instagram para um perfil que fala com DONOS DE PEQUENAS E MÉDIAS EMPRESAS sobre IA aplicada à operação (atendimento, vendas, cobrança, processos).

SAÍDA: apenas o JSON, sem texto fora dele, neste formato:
{"slug":"kebab-case","keyword":"PALAVRA","handle":"@kawan","caption":"...","slides":[...]}

TIPOS DE SLIDE
- {"type":"cover","title":"...","giant":"PALAVRA","eyebrow":"...","tag":"...","size":118}
- {"type":"statement","label":"01 / O PROBLEMA","title":"...","body":"...","size":110, + UM visual opcional}
- {"type":"step","label":"02 / SINAL 1","title":"...","body":"...","size":112, + UM visual}
- {"type":"cta","eyebrow":"Quer o material?","sub":"Te mando no direct:","deliver":["...","...","..."]}

VISUAIS (escolha UM por slide; a imagem precisa PROVAR a frase do título, não enfeitar)
- chat: [{"side":"lead"|"me","who":"Cliente · 09:48","text":"..."}] 2 a 3 balões. Use para mostrar a conversa real (demora, resposta pronta).
- compare: {"before":{"title":"Parece que é","items":[...]},"after":{"title":"Na verdade é","items":[...]}} 3 itens de até 4 palavras em cada lado. Use para reenquadrar ou antes/depois.
- repete: {"data":[["Nome","João Silva"],["Telefone","(66) 99123-4567"],["Pedido","Orçamento #231"]],"systems":["WhatsApp","Planilha","CRM","E-mail"]}. Use para mostrar o mesmo dado digitado em vários lugares.
- ficha: {"title":"Auto Peças Silva","icon":"crm","state":"ruim"|"ok","rows":[["Último contato","-"],["Status","-"],["Próximo passo","não definido"]]}. Use para mostrar um cadastro/CRM/pedido vazio (ruim) ou em dia (ok).
- flow + flow_on + flow_icons: ["WhatsApp","IA","CRM","Alerta"], flow_on 1, flow_icons ["whatsapp","ia","crm","alerta"]. Use para mostrar como a solução anda sozinha. Ícones: whatsapp, ia, crm, alerta, planilha, email, cliente, relogio, doc, agenda, dinheiro, check.
- items: 2 a 3 frases de CONTEÚDO (a pergunta real, a regra exata). Use por último, quando nenhum visual acima servir.
- Nomes e números dentro de chat/ficha/repete são exemplos ilustrativos de empresa pequena (nome comum, DDD 66), nunca resultado.

ESTRUTURA PADRÃO: TESE (7 slides) - use sempre, exceto se o tema pedir literalmente um passo a passo
1. capa: reenquadramento que contraria o senso comum ("Não falta funcionário. Sobra retrabalho.").
2. statement "01 / O PROBLEMA": a tese em uma frase, de preferência com compare (o que parece x o que é).
3-5. step "02 / SINAL 1", "03 / SINAL 2", "04 / SINAL 3": três causas ou sinais. Os três títulos seguem o MESMO molde de frase (ex.: "O mesmo dado digitado 4 vezes", "Retorno que depende da memória", "CRM que ninguém atualiza"). Cada um com um visual DIFERENTE.
6. step "05 / O QUE MUDA": a solução como fluxo com ícones (flow + flow_icons), corpo dizendo onde o dono entra.
7. cta.

ESTRUTURA ALTERNATIVA: PASSO A PASSO (só quando o tema é "como fazer X")
capa · problema · 4 passos (label "02 / PASSO 1"...) · cta, cada passo com um visual.

REGRAS DE ESCRITA
- Os exemplos deste prompt são só referência de formato. NUNCA copie títulos, frases ou nomes deles; escreva do zero para o TEMA.
- O corpo NUNCA repete o título com outras palavras. Ele acrescenta: a cena, o porquê ou onde o dono entra.
- Slide com visual: título de até 7 palavras e corpo de até 15 palavras (ou vazio). O visual é o protagonista.
- Capa: marque 1 a 2 palavras do título com <em>...</em>.
- Português do Brasil, direto, frases curtas, sem emoji.
- Capa: no máximo 9 palavras, com tensão ou resultado concreto ("Seu WhatsApp vende enquanto você dorme"), nunca título de apostila.
- <em>palavra</em> = laranja. <mark>palavra</mark> = grifo. No máximo 2 por slide.
- Fale com quem tem empresa pequena (loja, clínica, oficina, escritório de contabilidade), não com entusiasta de IA.

PALAVRA-CHAVE (keyword)
- Uma palavra comum em português, 4 a 8 letras, fácil de digitar no celular: AGENTE, ROTEIRO, FLUXO, PROMO.
- Proibido juntar siglas ou palavras (nada de IAWHATS, AUTOIA).

SLIDES DE SINAL/PASSO (step): NUNCA só título e corpo
- Cada slide traz UM visual da lista VISUAIS.
- Varie: no carrossel inteiro use pelo menos 3 visuais diferentes. Se o tema envolve atendimento ou WhatsApp, pelo menos 1 é chat.
- Corpo: 8 a 25 palavras (pode ficar vazio quando o visual já explica), com um exemplo concreto de empresa pequena ("numa clínica, o agente confirma a consulta na véspera").
- Título: frase concreta e curta. Em PASSO A PASSO, verbo + objeto ("Escreva as 10 perguntas que mais chegam"). Nunca vago ("Monitore e ajuste", "Teste e ajuste").

CONTEÚDO QUE ENSINA (o erro mais comum é slide que só dá ordem)
- Cada slide precisa entregar algo que o leitor não sabia ou pode copiar: a mensagem pronta, a regra exata, a cena real.
- items são CONTEÚDO, nunca rótulo de categoria. Proibido item tipo "Ajuste tom", "Horário de início", "Dias de pausa".
- Linguagem de dono de loja, não de manual: nada de "horário de cobertura", "escalonamento", "fluxo de encaminhamento", "FAQ".

EXEMPLO RUIM (não faça):
{"type":"step","title":"Defina o horário de cobertura","body":"Escolha até que horas o agente deve responder antes de encaminhar para o humano.","items":["09h às 18h","Inclua sábado","Exclua feriados"]}
Por que é ruim: título de manual, itens são rótulos, ninguém aprende nada.

EXEMPLO BOM:
{"type":"step","title":"Decida o que acontece às 22h","body":"Dúvida simples o agente resolve na hora. Pedido e reclamação viram recado para você de manhã.","chat":[{"side":"lead","who":"Cliente · 22:14","text":"Vocês têm filtro pro Gol 2012?"},{"side":"me","who":"Agente","text":"Temos sim. Quer que eu separe pra você retirar amanhã a partir das 8h?"}]}

EXEMPLO RUIM (não faça):
{"type":"step","title":"Teste e ajuste as respostas","body":"Simule perguntas reais e corrija frases que geram dúvidas.","items":["Teste 5 perguntas","Ajuste tom","Atualize a FAQ"]}

EXEMPLO BOM:
{"type":"step","title":"Teste com as perguntas chatas","body":"Mande você mesmo as perguntas que mais dão trabalho. Se a resposta te deixaria sem graça com o cliente, reescreva a instrução.","items":["\"Faz mais barato?\"","\"Tem pra hoje?\"","\"Isso é robô?\""]}

LIMITES DE ESPAÇO (o slide é 1080x1350; passou disso, corta)
- Título de passo: no máximo 6 palavras.
- items: 2 a 3 itens, cada um com no máximo 6 palavras. Com items, corpo de no máximo 20 palavras.
- flow: 3 a 4 etapas, cada uma com 1 a 2 palavras ("Mensagem", "Agente", "Você").
- chat: 2 a 3 balões, cada um com no máximo 18 palavras.

PARA QUEM É (o dono, não o técnico)
- O dono de PME decide e acompanha; ele não configura API, token nem integração.
- Proibido ensinar passo técnico: "ative a API", "solicite acesso", "configure o webhook", "gere o token". Troque pela decisão do dono: "defina o horário", "escolha o que o agente responde", "decida quando ele te chama".

PRECISÃO TÉCNICA (o público confia em quem não enrola)
- Ninguém "treina o modelo". Diga "escreva as instruções", "dê exemplos de respostas", "conecte ao seu catálogo".
- Nada de "revolucionar", "potencializar", "alavancar", "no mundo de hoje", "a IA chegou".
- Cite ferramentas reais só quando fizer sentido (WhatsApp Business, planilha, Claude, n8n) e sem prometer o que elas não fazem.

PROVAS
- NUNCA invente número, cliente, case ou resultado. Só use números que vierem em PROVAS.
- Sem prova, a prova é a demonstração: mostre COMO fica (conversa no chat, fluxo, lista pronta) em vez de afirmar que funciona. Pode usar "como eu montaria" ou "exemplo:".
- Exemplo ilustrativo é permitido desde que não soe como resultado real (sem "meu cliente", sem porcentagem).

CTA E LEGENDA
- deliver: 2 a 3 itens concretos que você mandaria no direct ("modelo das 10 respostas", "fluxo pronto para copiar").
- A legenda repete o gancho, traz 3 a 5 bullets curtos e fecha com "Comenta PALAVRA que eu te mando ...".`;

/**
 * POST /api/carousel  { tema, keyword?, provas?[], slot_date? }
 * Cria o carrossel, gera o spec com o LLM e devolve para o front mandar renderizar.
 */
export async function POST(req: Request) {
  try {
    const { tema, keyword, provas, slot_date } = await req.json();

    const { data: poses } = await db.from("avatar_poses").select("name,tags").eq("active", true);
    const nomes = (poses || []).map((p: any) => `${p.name} (${(p.tags || []).join(", ")})`).join(" · ") || "nenhuma";

    const user = `TEMA: ${tema}
PALAVRA-CHAVE SUGERIDA: ${keyword || "escolha uma, curta e em CAIXA ALTA"}
PROVAS DISPONÍVEIS: ${provas?.length ? provas.join(" | ") : "nenhuma"}
POSES DISPONÍVEIS (campo photo): ${nomes}`;

    let spec = normalizar(Spec.parse(await askJson(SYSTEM, user)));
    let avisos = lint(spec);
    if (avisos.length) {
      // 1 nova tentativa com os erros apontados. Se piorar, fica com a primeira.
      console.log("[lint] 1a versao:", avisos.join(" / "));
      try {
        const fix = `${user}

VOCÊ JÁ GEROU ESTE JSON:
${JSON.stringify(spec)}

ELE QUEBRA ESTAS REGRAS. Corrija TODAS e devolva o JSON completo:
- ${avisos.join("\n- ")}`;
        const spec2 = normalizar(Spec.parse(await askJson(SYSTEM, fix)));
        const avisos2 = lint(spec2);
        if (avisos2.length < avisos.length) { spec = spec2; avisos = avisos2; }
      } catch (e: any) { console.error("[lint] retry falhou", e?.message || e); }
      if (avisos.length) console.log("[lint] sobrou:", avisos.join(" / "));
    }

    const { data: pauta } = await db
      .from("pautas")
      .insert({ title: tema, keyword: spec.keyword, status: "em_producao", mode: provas?.length ? "resultado" : "demonstracao" })
      .select("id")
      .single();

    const { data: car } = await db
      .from("carousels")
      .insert({ pauta_id: pauta?.id, status: "gerando", caption: spec.caption, slot_date: slot_date || null })
      .select("id")
      .single();

    return NextResponse.json({ ok: true, carousel_id: car?.id, spec, avisos });
  } catch (e: any) {
    return NextResponse.json({ erro: String(e?.message || e) }, { status: 500 });
  }
}
