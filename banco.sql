-- =========================================================================
-- BANCO DE DADOS DO PAINEL DA LAURA OLIVEIRA
--
-- COMO USAR ESTE ARQUIVO:
-- 1. Entre no seu projeto em https://supabase.com
-- 2. No menu da esquerda, clique em "SQL Editor"
-- 3. Clique em "New query"
-- 4. Cole TODO o conteúdo deste arquivo, do início ao fim
-- 5. Clique em "Run" (ou aperte Ctrl+Enter)
-- 6. Deve aparecer "Success. No rows returned". Pronto, seu banco existe.
--
-- Pode rodar esse arquivo mais de uma vez sem medo: todos os comandos
-- foram escritos com "se não existir", então nada quebra ou duplica.
-- =========================================================================

-- Liga um recurso do Postgres que gera códigos únicos (uuid) sozinho.
-- É o que dá um "número de identidade" pra cada vídeo, marca, etc.
create extension if not exists pgcrypto;


-- =========================================================================
-- TABELA 1: VIDEOS
-- Os vídeos que aparecem no seu portfólio público (seções "destaques"
-- e "trabalhos"). O que tiver algo escrito no campo "destaque" (ex:
-- "2,4M views") entra na seção de destaques. Todo vídeo visível entra
-- na grade de trabalhos, filtrável por nicho.
-- =========================================================================
create table if not exists public.videos (
  id         uuid primary key default gen_random_uuid(),
  titulo     text not null,
  link       text not null,
  nicho      text not null default '',
  formato    text not null default '',
  marca      text not null default '',
  destaque   text not null default '',       -- ex: "2,4M views". Vazio = não aparece em destaques
  ordem      integer not null default 0,     -- define a ordem de exibição no site
  visivel    boolean not null default true,  -- olhinho aceso/apagado no admin
  criado_em  timestamptz not null default now()
);

-- =========================================================================
-- TABELA 2: MARCAS
-- Sua base de contatos de empresas (o seu CRM). Situações possíveis:
-- lead, conversando, cliente, parada.
-- =========================================================================
create table if not exists public.marcas (
  id             uuid primary key default gen_random_uuid(),
  nome           text not null,
  instagram      text not null default '',
  email          text not null default '',
  telefone       text not null default '',
  situacao       text not null default 'lead',
  obs            text not null default '',
  ultimo_contato date,
  criado_em      timestamptz not null default now()
);

-- =========================================================================
-- TABELA 3: CALENDARIO
-- Sua rotina de gravar, editar e postar. tipo: gravar, editar, postar.
-- status: "a fazer" ou "feito".
-- =========================================================================
create table if not exists public.calendario (
  id         uuid primary key default gen_random_uuid(),
  titulo     text not null,
  marca      text not null default '',
  tipo       text not null default 'gravar',
  data       date not null,
  status     text not null default 'a fazer',
  criado_em  timestamptz not null default now()
);

-- =========================================================================
-- TABELA 4: CAMPANHAS
-- Os trabalhos fechados com marcas. status segue o funil: Briefing,
-- Roteiro, Aprovação Roteiro, Gravação, Edição, Aprovado, Entregue.
-- pagamento: pendente ou pago.
-- =========================================================================
create table if not exists public.campanhas (
  id         uuid primary key default gen_random_uuid(),
  campanha   text not null,
  cliente    text not null default '',
  tipo       text not null default 'Conteúdo',
  status     text not null default 'Briefing',
  qtd        integer not null default 1,
  valor      numeric(10,2) not null default 0,
  prazo      date,
  pagamento  text not null default 'pendente',
  ativa      boolean not null default true,
  favorita   boolean not null default false,
  criado_em  timestamptz not null default now()
);

-- =========================================================================
-- TABELA 5: MARCADOS
-- Guarda o que você já marcou no checklist do portfólio (aba Checklist
-- do admin). Cada item do checklist tem uma "chave" de texto única.
-- =========================================================================
create table if not exists public.marcados (
  chave         text primary key,
  marcado       boolean not null default true,
  atualizado_em timestamptz not null default now()
);

-- =========================================================================
-- TABELA 6: VISITAS
-- Registro simples de quem visita o seu portfólio, pras métricas da
-- aba Portfólio do admin.
-- =========================================================================
create table if not exists public.visitas (
  id         uuid primary key default gen_random_uuid(),
  pagina     text not null default '/',
  origem     text not null default '',
  criado_em  timestamptz not null default now()
);


-- =========================================================================
-- TRANCA DE SEGURANÇA (RLS = Row Level Security)
--
-- A partir daqui, ligamos a tranca em TODAS as tabelas. Depois de ligada,
-- por padrão NINGUÉM lê ou escreve nada. Só liberamos exatamente o que
-- foi pedido, regra por regra, abaixo.
--
-- Como pensar nisso: "authenticated" é qualquer pessoa que fez login
-- (e a única pessoa que vai ter login nesse projeto é você). "anon" é
-- qualquer visitante do site, sem login nenhum.
-- =========================================================================

alter table public.videos     enable row level security;
alter table public.marcas     enable row level security;
alter table public.calendario enable row level security;
alter table public.campanhas  enable row level security;
alter table public.marcados   enable row level security;
alter table public.visitas    enable row level security;


-- ---------------------------------------------------------------
-- VIDEOS
-- Regra geral: só você (logada) lê e escreve.
-- Exceção necessária: o seu portfólio público mostra os vídeos
-- marcados como "visivel = true" pra qualquer visitante, sem login.
-- Sem essa liberação pontual, o site não teria como exibir os vídeos.
-- ---------------------------------------------------------------
create policy "qualquer um le videos visiveis" on public.videos
  for select to anon, authenticated
  using (visivel = true);

create policy "laura le todos os videos" on public.videos
  for select to authenticated
  using (true);

create policy "laura cadastra videos" on public.videos
  for insert to authenticated
  with check (true);

create policy "laura edita videos" on public.videos
  for update to authenticated
  using (true) with check (true);

create policy "laura apaga videos" on public.videos
  for delete to authenticated
  using (true);


-- ---------------------------------------------------------------
-- MARCAS
-- Só você lê. Exceção pedida: qualquer visitante pode INSERIR uma
-- marca vinda do formulário de contato do site, mas sempre como
-- "lead" (não dá pra alguém de fora criar um registro já como
-- "cliente", por exemplo).
-- ---------------------------------------------------------------
create policy "formulario do site cria lead" on public.marcas
  for insert to anon, authenticated
  with check (situacao = 'lead');

create policy "laura le marcas" on public.marcas
  for select to authenticated
  using (true);

create policy "laura edita marcas" on public.marcas
  for update to authenticated
  using (true) with check (true);

create policy "laura apaga marcas" on public.marcas
  for delete to authenticated
  using (true);


-- ---------------------------------------------------------------
-- CALENDARIO — só você, sem exceção nenhuma.
-- ---------------------------------------------------------------
create policy "laura le calendario" on public.calendario
  for select to authenticated using (true);
create policy "laura cadastra calendario" on public.calendario
  for insert to authenticated with check (true);
create policy "laura edita calendario" on public.calendario
  for update to authenticated using (true) with check (true);
create policy "laura apaga calendario" on public.calendario
  for delete to authenticated using (true);


-- ---------------------------------------------------------------
-- CAMPANHAS — só você, sem exceção nenhuma.
-- ---------------------------------------------------------------
create policy "laura le campanhas" on public.campanhas
  for select to authenticated using (true);
create policy "laura cadastra campanhas" on public.campanhas
  for insert to authenticated with check (true);
create policy "laura edita campanhas" on public.campanhas
  for update to authenticated using (true) with check (true);
create policy "laura apaga campanhas" on public.campanhas
  for delete to authenticated using (true);


-- ---------------------------------------------------------------
-- MARCADOS — só você, sem exceção nenhuma.
-- ---------------------------------------------------------------
create policy "laura le marcados" on public.marcados
  for select to authenticated using (true);
create policy "laura cadastra marcados" on public.marcados
  for insert to authenticated with check (true);
create policy "laura edita marcados" on public.marcados
  for update to authenticated using (true) with check (true);
create policy "laura apaga marcados" on public.marcados
  for delete to authenticated using (true);


-- ---------------------------------------------------------------
-- VISITAS
-- Só você lê. Exceção pedida: qualquer visitante pode INSERIR uma
-- visita (é o registro automático de métricas do portfólio).
-- ---------------------------------------------------------------
create policy "qualquer um registra visita" on public.visitas
  for insert to anon, authenticated
  with check (true);

create policy "laura le visitas" on public.visitas
  for select to authenticated
  using (true);


-- =========================================================================
-- FIM DO ARQUIVO
--
-- Depois de rodar, vá até o final deste arquivo (no chat com a Laura,
-- na explicação) pra ver como TESTAR se a tranca funcionou de verdade.
-- =========================================================================
