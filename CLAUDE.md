# CLAUDE.md — conteudo

Sistema de produção de carrosséis para o Instagram do Kawan (@kawan): IA aplicada à operação de pequenas e médias empresas. Gera o roteiro, monta as imagens no template da marca, o Kawan revisa conversando e aprova. Publicação no Instagram é manual.

Responda sempre em português, curto e direto.

## Princípios (obrigatórios)

- Caixa primeiro. Resolver o problema real antes de virar plataforma. Sem overengineering.
- Mudanças cirúrgicas. Nada de refatoração grande sem pedido.
- SQL de produção nunca é executado automaticamente: entregue o SQL e espere o Kawan rodar.
- Considere o impacto em produção antes de mexer: todo push no `main` publica na Vercel.
- Não invente número, cliente ou resultado em conteúdo gerado.

## Onde fica cada coisa

O app Next.js fica em `conteudo/` (é o root directory na Vercel).

| Arquivo | Papel |
|---|---|
| `lib/spec.ts` | Formato do carrossel (zod). Fonte da verdade: a imagem é só o render deste JSON |
| `lib/template.ts` | JSON → HTML do template (1080×1350). Cores, fontes, visuais (chat, compare, ficha, flow, items, repete) |
| `lib/llm.ts` | Fila de modelos: `LLM_ORDER` (padrão groq,gemini,openrouter). Nova tentativa em 429/503, prazo por provedor |
| `lib/lint.ts` | Revisor automático do roteiro: cópia do exemplo do prompt, jargão, limites de texto, emoji |
| `app/api/carousel` | Tema → roteiro (prompt SYSTEM) → lint → 1 nova tentativa no mesmo modelo |
| `app/api/render` | JSON → 7 PNGs (Chromium) → Storage → nova versão |
| `app/api/edit` | Ajuste por instrução (slide ou carrossel inteiro) |
| `app/api/diag` | Testa cada modelo e lista os modelos Gemini disponíveis |
| `app/carrossel/[id]/revisao.tsx` | Tela de revisão: slides, chat, botões de ajuste rápido, aprovar |
| `sql/001_schema.sql` | Schema. `carousel_versions.origin` aceita só: gerado, edicao_chat, edicao_manual, revert |

## Infra

- Vercel: projeto `conteudo` (prj_wLsLoS2fhe7vpyExUfF3E8Xm2Arn, team_UF6sjp2W3MkxvJVyVikjehlT). URL: conteudo-ruddy.vercel.app (com senha).
- Supabase: projeto dpchdhvosgdlvqvszoin (separado da Mydra). Buckets `carrosseis` e `poses`.
- Variáveis na Vercel: SUPABASE_URL, SUPABASE_SERVICE_KEY, APP_PASSWORD, GROQ_API_KEY, GROQ_MODEL, GEMINI_API_KEY, GEMINI_MODELS, OPENROUTER_API_KEY, OPENROUTER_MODELS, LLM_ORDER. Sem ANTHROPIC_API_KEY por enquanto (custo).
- Só modelos grátis. Em 24/09: Groq gpt-oss-120b e Nemotron Super estáveis; Gemini 3.8 e GLM/Qwen grátis caem por lotação.

## Template (aprovado, não mudar sem pedido)

Fundo off-white #F2F0EB, texto preto, laranja #E0521D só em grifo e destaque. Título Anton, corpo Inter. 7 slides. A fonte embutida não tem emoji nem alguns símbolos: o `specToHtml` remove/troca antes do render. Título com line-height 1.2 (menos que isso, o acento colide com a linha de cima).

## Regras editoriais que afetam o código

- Carrossel semanal termina em "Salva pra aplicar" / "Manda pro seu sócio". "Comenta PALAVRA" só no premium (`cta.mode = "comenta"`).
- Formatos: tese, passo a passo, mensagem pronta, o que muda (notícia), bastidor, erros comuns. Ver o contrato da pauta.
- O carrossel desenvolve o tema a favor, nunca contra.
- Exemplos no prompt são copiados pelo modelo: prefira descrever a regra a dar exemplo concreto, e registre no `lint.ts` qualquer exemplo que ainda exista.

## Documentos do projeto (vivem no projeto do Claude, não no repo)

- `plataforma/contrato-pauta.md`: o que uma pauta carrega (tema, pilar, formato, origem, referência, matéria-prima, CTA) e o cardápio de formatos.
- `plataforma/roadmap.md`: fases (coleta automática, central de conteúdo, agenda, regras, métricas).
- `plataforma/memoria-editorial.md`: como o sistema aprende com decisões, edições e resultado.
- `plataforma/pista-rapida.md`: notícia do dia (radar diário, vaga de quarta).
- `proximos-conteudos/linha-editorial.md`: oferta, camadas (reels, carrossel, premium), pilares, calendário.

## Próximos passos combinados (24/09)

1. Gerador de roteiro recebe a pauta completa (contrato) e escolhe a estrutura pelo formato.
2. Regras do lint por formato (ex.: "API" é válido em notícia sobre API; `[colchetes]` são válidos em "mensagem pronta").
3. Layout próprio por formato (mensagem pronta: balão grande; o que muda: data gigante).
4. Coleta noturna (n8n + Apify) alimentando a pauta.
