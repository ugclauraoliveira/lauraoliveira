-- =========================================================================
-- SQL DA ABA ROTEIROS
--
-- COMO USAR: Supabase > SQL Editor > New query > cole tudo > Run.
-- Só cria coisas novas (tabelas "roteiros" e "configuracoes").
-- Não apaga nada das suas outras tabelas. Pode rodar mais de uma vez.
-- =========================================================================

-- 1) Biblioteca de roteiros: cada vídeo transcrito (ou escrito na mão) é uma linha.
create table if not exists public.roteiros (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  fonte text not null default 'manual' check (fonte in ('instagram', 'tiktok', 'youtube', 'manual')),
  url text,
  perfil text,
  de_quem text not null default 'outra' check (de_quem in ('minha', 'outra')),
  titulo text,
  transcricao text,
  legenda text,
  postado_em date,
  tags text[] not null default '{}',
  obs text,
  status text not null default 'pronto' check (status in ('processando', 'pronto', 'falhou')),
  erro text,
  segmentos jsonb
);

create index if not exists roteiros_created_at_idx on public.roteiros (created_at desc);

-- Atualiza o updated_at sozinho toda vez que uma linha muda.
create or replace function public.roteiros_marca_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists roteiros_updated_at on public.roteiros;
create trigger roteiros_updated_at
  before update on public.roteiros
  for each row execute function public.roteiros_marca_updated_at();


-- 2) Configurações do painel (chave e valor). Aqui fica a chave da Supadata.
create table if not exists public.configuracoes (
  chave text primary key,
  valor text,
  updated_at timestamptz not null default now()
);


-- 3) Segurança (RLS): só você, logada, lê e mexe. Visitante do site não vê nada.
alter table public.roteiros enable row level security;
alter table public.configuracoes enable row level security;

drop policy if exists "laura le roteiros" on public.roteiros;
drop policy if exists "laura cadastra roteiros" on public.roteiros;
drop policy if exists "laura edita roteiros" on public.roteiros;
drop policy if exists "laura apaga roteiros" on public.roteiros;

create policy "laura le roteiros" on public.roteiros
  for select to authenticated using (true);
create policy "laura cadastra roteiros" on public.roteiros
  for insert to authenticated with check (true);
create policy "laura edita roteiros" on public.roteiros
  for update to authenticated using (true) with check (true);
create policy "laura apaga roteiros" on public.roteiros
  for delete to authenticated using (true);

drop policy if exists "laura le configuracoes" on public.configuracoes;
drop policy if exists "laura cadastra configuracoes" on public.configuracoes;
drop policy if exists "laura edita configuracoes" on public.configuracoes;
drop policy if exists "laura apaga configuracoes" on public.configuracoes;

create policy "laura le configuracoes" on public.configuracoes
  for select to authenticated using (true);
create policy "laura cadastra configuracoes" on public.configuracoes
  for insert to authenticated with check (true);
create policy "laura edita configuracoes" on public.configuracoes
  for update to authenticated using (true) with check (true);
create policy "laura apaga configuracoes" on public.configuracoes
  for delete to authenticated using (true);

-- Garante que o visitante anônimo não tem acesso nenhum.
revoke all on public.roteiros from anon;
revoke all on public.configuracoes from anon;
grant select, insert, update, delete on public.roteiros to authenticated;
grant select, insert, update, delete on public.configuracoes to authenticated;

-- =========================================================================
-- FIM. Depois de rodar, abra o painel e vá na aba 📜 Roteiros.
-- =========================================================================
