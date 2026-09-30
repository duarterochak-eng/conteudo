# Como atualizar a Tabela das IAs

Página: `/tabela-ia` (link fixo da DM). Dados: **`site/data/tabela-ia.json`**, a única coisa que muda no dia a dia. A página, o CSS e as contas ficam em `site/app/tabela-ia/` e `site/lib/tabela.ts`: não mexer numa atualização semanal.

Quem atualiza: a rotina semanal do Claude (segunda, 06:25 de Cuiabá) ou o Kawan à mão. Nos dois casos o caminho é o mesmo: **branch → PR → preview na Vercel → merge**. Nada vai direto para o `main`.

## Regras que não se negociam

1. **Nada sem fonte aberta nesta rodada.** Toda afirmação (preço, plano, modelo, limite) vem de uma página que você abriu agora. Se não conseguiu abrir, não muda o texto, **não atualiza o `verificado_em`** daquela linha e lista no PR em "Não consegui conferir".
2. **Fonte oficial primeiro** (OpenAI, Anthropic, Banco Central). Blog ou notícia de terceiro só quando não existir a oficial, e o PR avisa qual linha depende dela.
3. **Afirmação da própria empresa não vira fato.** "Segundo a OpenAI…", "segundo a Anthropic…". Só tira o "segundo" quando teste independente confirmar.
4. **Sem dólar no texto, sem nota de benchmark, sem "token".** O build reprova (`US$`, `$ 10`, `USD`, "10 dólares", GDPval, SWE-bench etc.). O preço em reais é calculado pela página a partir dos campos numéricos.
5. **Nada de conta inventada.** Sem "custa R$ X por conversa" e sem estimativa que dependa de premissa nossa. Só preço público e a conta do câmbio.
6. **Não inventar número, data, modelo ou plano.** Na dúvida, deixa como está e avisa no PR.
7. **Não mergear, não dar push no `main`, não forçar push.** Quem aprova é o Kawan, no merge.

## Passo a passo (semanal)

1. `git checkout main && git pull`, depois `git checkout -b tabela/AAAA-MM-DD` (data de hoje).
2. `cd site && npm install && npm run tabela:check` (tem que passar antes de mexer).
3. **Câmbio.** Cotação PTAX de venda do último dia útil (notícia do dia serve; o site do Banco Central costuma bloquear leitura automática). Atualiza `cambio.brl_por_usd`, `cambio.data` e `cambio.fontes`. Confirma se o IOF do cartão no exterior segue em 3,5% (`cambio.iof`, fração: 0.035).
4. **Novidades.** Procura o que saiu desde `atualizada_em`:
   - OpenAI: https://openai.com/news · https://chatgpt.com/pricing · https://help.openai.com/en/articles/9793128-about-chatgpt-pro-tiers
   - Anthropic: https://www.anthropic.com/news · https://claude.com/pricing · https://platform.claude.com/docs/en/about-claude/pricing
   - Modelo novo, modelo aposentado, mudança de preço, plano novo, limite novo, mudança de onde cada modelo aparece (chat, Work, Codex, Chrome).
5. **Reconfere cada linha do JSON** contra a fonte dela (`fontes`): preço do plano, `preco_entrada_usd` do modelo, `onde`, `descricao`. Corrigiu algo? Vira item em `mudancas` com `tipo: "correcao"`. Confirmou sem mudança? Só atualiza o `verificado_em` daquela linha.
6. **Escolhas por tarefa** (`tarefas`): só troca a escolha se a fonte oficial disser que o modelo novo faz aquele tipo de trabalho igual ou melhor por preço igual ou menor. É decisão editorial: entra no PR em "Decisões para o Kawan". Na dúvida, mantém e cita a opção no PR.
7. **`mudancas`**: um item por acontecimento visível (modelo novo, plano novo, preço mudou, correção, modelo saiu). Título curto (até 80 caracteres), detalhe de 1 ou 2 frases, fonte. Mantém no máximo 20 itens; apaga os mais velhos (o histórico fica no git).
8. **Datas.** `verificada_em` = hoje (America/Cuiaba). `atualizada_em` = hoje **só se algo visível mudou**. `verificado_em` de cada linha que você reconferiu = hoje.
9. `npm run tabela:check` e `npm run build` (dentro de `site/`). Os dois têm que passar. Se o build reprovar, o erro diz a linha do JSON: corrige o JSON, nunca o validador.
10. Commit só do JSON (e deste arquivo, se o processo mudou), push da branch, PR para `main` com o texto abaixo.

## Como o JSON funciona (o que costuma dar dúvida)

- **Salário** (1x, 20x, 40x, 100x) = `preco_entrada_usd` do modelo ÷ o do `modelo_base` (hoje a GPT-6 Luna). O campo guarda o preço de entrada da API em dólar por milhão de tokens; **nunca aparece em dólar na página**. Modelo sem preço de API (os GPT-5.6) aparece só nos planos: não coloque `preco_entrada_usd` se não tiver fonte.
- **Preço do plano**: `preco_brl_mes` quando a empresa cobra em reais (ChatGPT Go), `preco_usd_mes` quando cobra em dólar (a página converte com câmbio + IOF e mostra "~R$"). Nunca os dois. `a_partir_de: true` quando o preço é o piso ("a partir de").
- **`status`**: `atual` ou `anterior`. Quando uma versão nova substitui a antiga, a antiga vira `anterior` (fica opaca na página) e sai de `equipe` e `tarefas` (o build reprova modelo `anterior` nesses dois lugares). Duas ou três semanas depois, some do arquivo se nada mais apontar para ela.
- **`desde`**: data de lançamento. Modelo `atual` com até 10 dias ganha a etiqueta "novo" sozinho.
- **`plano_minimo`**: o plano mais barato em que o modelo aparece. É o preço mostrado nas tarefas do tipo `app`.
- **`tarefas[].tipo`**: `app` mostra o preço do plano; `automacao` mostra o salário (x a Luna). Cada tarefa tem uma escolha por provedor: `modelo` (da lista) ou `rotulo` + `plano` + `pill` + `fontes` (produto sem modelo próprio, como o "Claude no Chrome"; a fonte aparece embaixo do preço). `nota` troca o texto pequeno embaixo do preço; `plano` força outro plano que não o `plano_minimo`.
- **`pill`**: cor do selo do modelo. `laranja` (base), `claro`, `preto` (analista), `cinza` (o mais caro).
- **`equipe`**: os 4 crachás do topo. Sempre 4, sempre modelos atuais.
- **Prazos que o build cobra**: nenhuma linha pode ter `verificado_em` mais de 21 dias antes da `verificada_em` da página, o câmbio no máximo 14, e nenhuma data pode estar no futuro. Se a rotina parar, o build vai reclamar na próxima mexida e a página mostra "última conferência há N dias" depois de 10 dias sem conferir.
- **Tom**: português simples para dono de empresa. Funcionária, salário, crachá. Sem jargão. Frases curtas.

## Texto do PR

Título: `Tabela das IAs: conferência de DD/MM`

```
## Resumo
<2 linhas: o que muda na página, ou "Sem mudanças: só as datas de conferência. Pode dar merge sem olhar.">

## Mudou
- <item> ([fonte](url))

## Conferido, sem mudança
<lista curta: câmbio, IOF, preços dos planos X, Y, Z, modelos A, B>

## Não consegui conferir
<linha do JSON + motivo (site bloqueou, fora do ar…). Se vazio, escreva "Nada.">

## Decisões para o Kawan
<troca de escolha em tarefa, fonte de terceiro, afirmação só da própria empresa. Se vazio, "Nenhuma.">

## Como aprovar
1. Abre o preview (Vercel, logado): https://kawanlabs-git-<branch-com-hifens>-duarterochak-3587s-projects.vercel.app/tabela-ia
2. Se estiver certo: **Merge pull request**. Publica em ~1 minuto.
3. Se não quiser publicar: fecha o PR. A página no ar continua a última boa.
```

## Se der errado

- **Build reprovou no PR**: a Vercel não publica e a página no ar continua a última boa. Lê o erro, corrige o JSON.
- **Publicou algo errado**: reverte o PR no GitHub (botão *Revert*) ou, na Vercel, *Rollback* para o deploy anterior. O git guarda cada versão da tabela.
- **Página mostra o aviso de tabela velha**: a conferência semanal não foi mergeada. Rode a rotina à mão e faça o merge.
