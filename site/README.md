# site

Site público do @kawan.labs (sem senha). Projeto separado na Vercel, Root Directory = `site`.

- `/` → landing (`components/landing/`): hero, toggle empresa/profissional (`?p=empresa|profissional`), como eu trabalho, serviços (`data/servicos.ts`, cada card abre o WhatsApp citando o serviço), captura da isca `BIO` no bloco `#tabela`, quem sou e contato. Sem a `BIO` ativa (ou com o Supabase fora/lento, 3 s), a landing sai igual e o `#tabela` mostra só o WhatsApp
- `/isca/PALAVRA` → captura de lead do "Comenta PALAVRA" (tabela `iscas`, `ativa = true`). Só o formulário na tela; serviços, quem sou e contato aparecem embaixo depois da entrega. O fluxo de captura fica em `components/captura-lead.tsx` (variante `hero` aqui, `secao` na landing)
- Foto do quem sou: `public/kawan.jpg` (também vira og:image da raiz). Sem o arquivo, a landing mostra a inicial; o build detecta sozinho (`next.config.mjs`)
- `/api/isca` → grava em `leads` e `lead_iscas` e chama o webhook do n8n
- `/api/isca/conversar` → botão "Quero conversar" da tela Pronto (lead que já tinha cadastro)
- `/tabela-ia` → tabela das IAs, lida de `data/tabela-ia.json` (ver "Tabela das IAs" abaixo). `/tabela-ia/index.html` continua abrindo a mesma página, por causa dos links já enviados

## Como funciona a isca

- Começa pelo e-mail: se o lead já existe, só envia; se não, pede nome, empresa, WhatsApp (opcional) e aceite.
- Quem marca que tem empresa responde mais 4 perguntas: de quê (ramo), quantas pessoas (`tamanho`), o que mais come o tempo (`maior_dor`) e se quer conversar (`quer_conversar`). Se quiser conversar, o WhatsApp vira obrigatório. Sem empresa, só entra na lista.
- Descadastrado: pede só o reaceite (opcional) e envia.
- POST no `N8N_LEAD_WEBHOOK_URL` com `{ lead_isca_id, email, nome, isca, titulo, url_entrega, assunto_email }` e header `x-lead-secret`. Timeout de 8 s; se falhar, o pedido fica sem `enviada_em` para reenvio. Mesmo lead + isca em menos de 10 min não reenvia (pedido que falhou, sem `enviada_em`, não conta).
- Tela "Pronto": botão da entrega + link direto para o WhatsApp do Kawan (`WHATSAPP_KAWAN` em `lib/lead.ts`, com mensagem pronta que cita a isca). O mesmo link aparece em todas as telas do formulário.

## Lead quente

Lead quente = tem empresa + `quer_conversar = true`. Vira quente de três jeitos: no cadastro (`origem: "cadastro"`), numa atualização (`"atualizacao"`) ou pelo botão "Quero conversar sobre automatizar minha empresa" da tela Pronto, que aparece para quem já tem cadastro com empresa e ainda não pediu (`"botao"`, via `/api/isca/conversar`).

- A virada `false → true` é um único `UPDATE ... WHERE quer_conversar = false`. Só quem virou o lead avisa, então clique duplo, aba repetida ou nova isca não geram aviso repetido.
- O aviso é um POST no `N8N_LEAD_QUENTE_WEBHOOK_URL` (header `x-lead-secret`, timeout de 8 s), disparado depois da resposta com `after()`. Corpo: `{ nome, email, whatsapp, ramo, tamanho, maior_dor, isca, origem }`, com `whatsapp` só em dígitos com DDI 55 e `tamanho`/`maior_dor` em texto legível.
- Se o n8n estiver fora ou a variável não existir, só loga (id do lead, nunca o e-mail ou o telefone). O lead já está salvo com `quer_conversar = true` e `quer_conversar_em`, então nenhum pedido se perde: `select nome, email, whatsapp, ramo, tamanho, maior_dor, quer_conversar_em from leads where quer_conversar order by quer_conversar_em desc` lista todos os leads quentes.
- WhatsApp é normalizado no servidor e no navegador (`lib/lead.ts`): só dígitos, DDI 55 quando vier DDD + número, válido com 12 ou 13 dígitos.

## Variáveis na Vercel

| Variável | O que é |
|---|---|
| `SUPABASE_URL` | https://dpchdhvosgdlvqvszoin.supabase.co |
| `SUPABASE_SERVICE_KEY` | service_role key (mesma do projeto `conteudo`) |
| `N8N_LEAD_WEBHOOK_URL` | webhook do n8n que envia o e-mail da isca |
| `N8N_LEAD_QUENTE_WEBHOOK_URL` | webhook do n8n que avisa o Kawan no WhatsApp quando um lead fica quente (`.../webhook/lead-quente`). Sem ela o site funciona; só não avisa |
| `N8N_LEAD_SECRET` | segredo enviado no header `x-lead-secret` nos dois webhooks |

Colunas que o código usa em `leads`: `tamanho`, `maior_dor`, `quer_conversar`, `quer_conversar_em`. Rodar o SQL delas **antes** de publicar: sem as colunas, a captura responde erro 500. A isca `BIO` também precisa existir em `iscas` (senão o `#tabela` da landing mostra só o WhatsApp).

## Tabela das IAs

- Dados: `data/tabela-ia.json` (única coisa que muda no dia a dia). Página: `app/tabela-ia/`. Formato, contas e travas: `lib/tabela.ts`.
- O build reprova se o JSON estiver errado (modelo que não existe, data no futuro, `US$`, nota de benchmark, linha sem conferir há mais de 21 dias…). Na Vercel isso mantém o deploy anterior no ar.
- `npm run tabela:check` valida só o JSON, em segundos.
- Atualização: branch → PR → preview da Vercel → merge. Passo a passo (e o texto do PR) em `data/ATUALIZAR.md`. A rotina semanal do Claude segue esse arquivo.
- Se a tabela ficar mais de 10 dias sem conferência, a própria página avisa o leitor.
