-- =========================================================================
-- ADICIONAR INSTAGRAM
--
-- COMO USAR: Supabase > SQL Editor > New query > cole tudo > Run.
--
-- Cria duas tabelas:
-- 1) instagram_metricas: cada vez que você atualizar seus números (seguidores,
--    alcance, interações), vira uma linha aqui com a data. É o que desenha o
--    gráfico de evolução na aba Instagram. Se você registrar duas vezes no
--    mesmo dia, a segunda vez só atualiza a primeira (não duplica linha).
-- 2) ideias_conteudo: seu banco de ideias de vídeo/post (título, descrição,
--    formato, status e data prevista).
--
-- O "melhor post das últimas 2 semanas" não precisa de tabela nova: ele é
-- guardado na tabelinha "configuracoes" que já existe desde o Financeiro.
--
-- Pode rodar esse arquivo mais de uma vez sem medo, mesmo que já tenha
-- rodado antes: ele apaga e recria só as regras de segurança, nunca os
-- seus dados.
-- =========================================================================

create table if not exists public.instagram_metricas (
  id          uuid primary key default gen_random_uuid(),
  data        date not null unique,
  seguidores  integer not null default 0,
  alcance     integer not null default 0,
  interacoes  integer not null default 0,
  criado_em   timestamptz not null default now()
);

create table if not exists public.ideias_conteudo (
  id            uuid primary key default gen_random_uuid(),
  titulo        text not null,
  descricao     text not null default '',
  formato       text not null default '',           -- Reels, Carrossel, Stories, Feed, Outro
  status        text not null default 'ideia',       -- ideia, roteirizado, gravado, publicado
  data_prevista date,
  criado_em     timestamptz not null default now()
);

alter table public.instagram_metricas enable row level security;

drop policy if exists "laura le instagram_metricas" on public.instagram_metricas;
create policy "laura le instagram_metricas" on public.instagram_metricas
  for select to authenticated using (true);

drop policy if exists "laura cadastra instagram_metricas" on public.instagram_metricas;
create policy "laura cadastra instagram_metricas" on public.instagram_metricas
  for insert to authenticated with check (true);

drop policy if exists "laura edita instagram_metricas" on public.instagram_metricas;
create policy "laura edita instagram_metricas" on public.instagram_metricas
  for update to authenticated using (true) with check (true);

drop policy if exists "laura apaga instagram_metricas" on public.instagram_metricas;
create policy "laura apaga instagram_metricas" on public.instagram_metricas
  for delete to authenticated using (true);

alter table public.ideias_conteudo enable row level security;

drop policy if exists "laura le ideias_conteudo" on public.ideias_conteudo;
create policy "laura le ideias_conteudo" on public.ideias_conteudo
  for select to authenticated using (true);

drop policy if exists "laura cadastra ideias_conteudo" on public.ideias_conteudo;
create policy "laura cadastra ideias_conteudo" on public.ideias_conteudo
  for insert to authenticated with check (true);

drop policy if exists "laura edita ideias_conteudo" on public.ideias_conteudo;
create policy "laura edita ideias_conteudo" on public.ideias_conteudo
  for update to authenticated using (true) with check (true);

drop policy if exists "laura apaga ideias_conteudo" on public.ideias_conteudo;
create policy "laura apaga ideias_conteudo" on public.ideias_conteudo
  for delete to authenticated using (true);
