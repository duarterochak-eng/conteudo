# conteudo

Plataforma de produção de carrosséis para o Instagram: gera o roteiro, monta as imagens no template, você revisa conversando e aprova.

## Como subir

1. **Banco:** no Supabase (projeto novo), SQL Editor → cole e rode `sql/001_schema.sql`.
2. **Storage:** crie dois buckets **públicos**: `carrosseis` (saída) e `poses` (avatar).
3. **Vercel:** importe este repositório e preencha as variáveis:

| Variável | O que é |
|---|---|
| `SUPABASE_URL` | https://SEU-REF.supabase.co |
| `SUPABASE_SERVICE_KEY` | service_role key |
| `APP_PASSWORD` | senha de acesso ao site |
| `ANTHROPIC_API_KEY` | opcional; se existir, usa Claude Haiku |
| `GROQ_API_KEY` | usado quando não há chave da Anthropic |
| `CLAUDE_MODEL` | opcional (padrão `claude-haiku-4-5`) |
| `GROQ_MODEL` | opcional (padrão `llama-3.3-70b-versatile`) |
| `N8N_LEAD_WEBHOOK_URL` | webhook do n8n que envia o e-mail da isca (`/api/isca`) |
| `N8N_LEAD_SECRET` | segredo enviado no header `x-lead-secret` para o webhook |

4. **Deploy.** Abra o endereço, digite a senha.

## Poses do avatar

Suba os PNGs recortados no bucket `poses` e cadastre cada um:

```sql
insert into avatar_poses (name, tags, storage_path, style) values
  ('apontando', '{apontando,atencao}', 'apontando.png', 'left:250px;top:250px;width:600px'),
  ('joinha',    '{cta,positivo}',      'joinha.png',    'right:-150px;bottom:0;width:640px');
```

O campo `name` é o que o roteiro usa em `photo`. O `style` posiciona a foto no slide.

## Como funciona

- `lib/spec.ts` — o formato do carrossel (JSON). É a fonte da verdade.
- `lib/template.ts` — transforma o JSON em HTML do template (fundo claro, laranja no grifo).
- `app/api/carousel` — tema → roteiro (JSON) pelo LLM.
- `app/api/render` — JSON → 7 PNGs 1080x1350 no Storage, gravando uma nova versão.
- `app/api/edit` — JSON + instrução ("aumenta o texto do slide 3") → JSON novo.
- `app/carrossel/[id]` — revisão: slides, chat e aprovação.

Toda edição vira versão nova e fica registrada em `editorial_events`, que é a base do aprendizado das suas preferências.

## Iscas (captura de lead)

Página pública `/isca/PALAVRA` (sem senha) para o "Comenta PALAVRA" do Instagram. Lê a tabela `iscas` (`ativa = true`).

- Começa pelo e-mail: se o lead já existe, só envia; se não, pede nome, empresa, WhatsApp (opcional) e aceite.
- Descadastrado: pede só o reaceite (opcional) e envia.
- `/api/isca` grava em `leads` e `lead_iscas` e faz POST no `N8N_LEAD_WEBHOOK_URL` com `{ lead_isca_id, email, nome, isca, titulo, url_entrega, assunto_email }` e header `x-lead-secret`. Timeout de 8 s; se falhar, o pedido fica sem `enviada_em` para reenvio. Mesmo lead + isca em menos de 10 min não reenvia.
- `/tabela-ia` também é público (arquivo estático em `public/tabela-ia/`).

## Limites conhecidos

- O render roda numa função da Vercel (limite de 60s). 7 slides levam de 10 a 20s.
- Sem pose cadastrada, os slides saem sem foto.
- Publicação no Instagram é manual: baixe os PNGs e agende pelo Meta Business Suite.
