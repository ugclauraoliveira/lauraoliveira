-- =========================================================================
-- SQL DA ABA PROSPECÇÃO
--
-- COMO USAR: Supabase > SQL Editor > New query > cole tudo > Run.
-- Só acrescenta colunas e tabelas novas. Não apaga nada da tabela
-- "marcas" nem de nenhuma outra tabela sua. Pode rodar mais de uma
-- vez sem medo.
-- =========================================================================

-- 1) Três colunas novas na tabela "marcas" (a mesma da sua aba Marcas).

-- Marca a marca pra entrar no próximo disparo. Fica salva no banco,
-- então marcar hoje e disparar amanhã não perde a seleção.
alter table public.marcas
  add column if not exists selecionada boolean not null default false;

-- Quando foi o último e-mail de PROSPECÇÃO mandado pra essa marca.
-- É diferente do campo "Último contato" que você já preenche à mão:
-- esse aqui é automático, só o carteiro de e-mails mexe nele.
alter table public.marcas
  add column if not exists ultimo_envio_em timestamptz;

-- Qual foi o assunto do último e-mail de prospecção enviado (informativo).
alter table public.marcas
  add column if not exists ultimo_envio_assunto text;


-- 2) Tabela que registra CADA e-mail enviado, um por linha.
-- Sem isso, se um disparo parar no meio, não dá pra saber quem recebeu.
create table if not exists public.email_envios (
  id uuid primary key default gen_random_uuid(),
  email text not null,
  assunto text not null,
  status text not null check (status in ('ok', 'erro')),
  erro text,
  resend_id text,
  criado_em timestamptz not null default now()
);

alter table public.email_envios enable row level security;

create policy "laura le envios" on public.email_envios
  for select to authenticated using (true);
create policy "laura registra envios" on public.email_envios
  for insert to authenticated with check (true);


-- 3) Tabela de descadastro: quem respondeu SAIR entra aqui e nunca
-- mais recebe e-mail, em nenhum disparo futuro.
create table if not exists public.email_optout (
  id uuid primary key default gen_random_uuid(),
  email text not null unique,
  criado_em timestamptz not null default now()
);

alter table public.email_optout enable row level security;

create policy "laura le descadastros" on public.email_optout
  for select to authenticated using (true);
create policy "laura registra descadastros" on public.email_optout
  for insert to authenticated with check (true);

-- =========================================================================
-- FIM. Depois de rodar, volte no chat e me avise.
-- =========================================================================
