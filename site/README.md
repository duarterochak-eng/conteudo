# site

Site público do @kawan.labs (sem senha). Projeto separado na Vercel, Root Directory = `site`.

- `/` → redireciona para https://instagram.com/kawan.labs
- `/isca/PALAVRA` → captura de lead do "Comenta PALAVRA" (tabela `iscas`, `ativa = true`)
- `/api/isca` → grava em `leads` e `lead_iscas` e chama o webhook do n8n
- `/tabela-ia/index.html` → tabela das IAs (arquivo estático)

## Como funciona a isca

- Começa pelo e-mail: se o lead já existe, só envia; se não, pede nome, empresa, WhatsApp (opcional) e aceite.
- Descadastrado: pede só o reaceite (opcional) e envia.
- POST no `N8N_LEAD_WEBHOOK_URL` com `{ lead_isca_id, email, nome, isca, titulo, url_entrega, assunto_email }` e header `x-lead-secret`. Timeout de 8 s; se falhar, o pedido fica sem `enviada_em` para reenvio. Mesmo lead + isca em menos de 10 min não reenvia.

## Variáveis na Vercel

| Variável | O que é |
|---|---|
| `SUPABASE_URL` | https://dpchdhvosgdlvqvszoin.supabase.co |
| `SUPABASE_SERVICE_KEY` | service_role key (mesma do projeto `conteudo`) |
| `N8N_LEAD_WEBHOOK_URL` | webhook do n8n que envia o e-mail da isca |
| `N8N_LEAD_SECRET` | segredo enviado no header `x-lead-secret` |
