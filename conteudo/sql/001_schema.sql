-- Esquema do sistema de conteúdo (rode no SQL Editor do projeto novo).
-- A tabela sources você já criou. Este arquivo cria o resto.

create extension if not exists vector;

-- PROVAS: única fonte de números e cases que podem ser publicados
create table if not exists proofs (
  id uuid primary key default gen_random_uuid(),
  kind text check (kind in ('numero','case','depoimento','print')),
  claim text not null,
  evidence_path text,
  can_publish boolean default true,
  created_at timestamptz default now()
);

-- PAUTAS
create table if not exists pautas (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  keyword text,
  angle jsonb,
  mode text check (mode in ('resultado','experimento','demonstracao','analise')),
  proof_ids uuid[] default '{}',
  missing_proof text,
  similar_to jsonb,
  status text not null default 'proposta'
    check (status in ('proposta','aprovada','rejeitada','expirada','em_producao','usada')),
  decided_at timestamptz,
  reject_tags text[],
  reject_reason text,
  expires_at timestamptz default now() + interval '10 days',
  created_at timestamptz default now()
);
create index if not exists pautas_status_idx on pautas (status, created_at desc);

-- CARROSSÉIS
create table if not exists carousels (
  id uuid primary key default gen_random_uuid(),
  pauta_id uuid references pautas(id),
  current_version int,
  status text not null default 'gerando'
    check (status in ('gerando','em_revisao','editando','aprovado','publicado','medido','arquivado')),
  caption text,
  slot_date date,
  approved_at timestamptz,
  published_at timestamptz,
  permalink text,
  created_at timestamptz default now()
);

-- VERSÕES (imutáveis: o histórico do que a IA fez e do que você pediu)
create table if not exists carousel_versions (
  id uuid primary key default gen_random_uuid(),
  carousel_id uuid not null references carousels(id) on delete cascade,
  version int not null,
  spec jsonb not null,
  png_paths text[],
  origin text not null check (origin in ('gerado','edicao_chat','edicao_manual','revert')),
  created_at timestamptz default now(),
  unique (carousel_id, version)
);

-- CHAT DE REVISÃO
create table if not exists review_messages (
  id uuid primary key default gen_random_uuid(),
  carousel_id uuid not null references carousels(id) on delete cascade,
  slide_index int,
  role text not null check (role in ('user','assistant')),
  content text not null,
  created_at timestamptz default now()
);

-- EVENTOS EDITORIAIS (base do aprendizado)
create table if not exists editorial_events (
  id uuid primary key default gen_random_uuid(),
  entity text not null check (entity in ('pauta','carousel')),
  entity_id uuid not null,
  event text not null,
  slide_index int,
  instruction text,
  diff jsonb,
  categories text[],
  created_at timestamptz default now()
);

-- REGRAS EDITORIAIS (memória que você aprova)
create table if not exists editorial_rules (
  id uuid primary key default gen_random_uuid(),
  scope text check (scope in ('pauta','roteiro','visual')),
  rule text not null,
  kind text check (kind in ('preferir','evitar','limite')),
  evidence_count int default 0,
  status text not null default 'sugerida' check (status in ('sugerida','ativa','descartada')),
  created_at timestamptz default now()
);

-- POSES DO AVATAR (bucket "poses")
create table if not exists avatar_poses (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,          -- usado no campo "photo" do carrossel
  tags text[] default '{}',
  storage_path text not null,         -- caminho dentro do bucket "poses"
  style text,                         -- css opcional: "left:250px;top:250px;width:600px"
  uses int default 0,
  active boolean default true,
  created_at timestamptz default now()
);

-- CALENDÁRIO DA SEMANA
create table if not exists calendar_slots (
  id uuid primary key default gen_random_uuid(),
  date date not null unique,
  format text not null check (format in ('carrossel','reels_simples','reels_trabalhado')),
  content_type text,
  carousel_id uuid references carousels(id),
  status text not null default 'vazio'
    check (status in ('vazio','pauta_aprovada','gerado','revisado','agendado','publicado','pulado'))
);

-- MÉTRICAS
create table if not exists post_metrics (
  id uuid primary key default gen_random_uuid(),
  carousel_id uuid references carousels(id),
  horizon text check (horizon in ('24h','7d','30d')),
  reach int, likes int, comments int, saves int, shares int,
  profile_visits int, follows int, keyword_comments int,
  collected_at timestamptz default now(),
  unique (carousel_id, horizon)
);

-- Acesso só pela service_role (o site e o n8n). Sem acesso público.
do $$
declare t text;
begin
  foreach t in array array['proofs','pautas','carousels','carousel_versions','review_messages',
    'editorial_events','editorial_rules','avatar_poses','calendar_slots','post_metrics']
  loop
    execute format('alter table %I enable row level security', t);
  end loop;
end $$;
