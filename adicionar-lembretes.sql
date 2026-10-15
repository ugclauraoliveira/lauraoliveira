-- =========================================================================
-- ADICIONAR LEMBRETES (usado no Dashboard e, mais pra frente, na aba
-- dedicada de Lembretes)
--
-- COMO USAR: Supabase > SQL Editor > New query > cole tudo > Run.
-- =========================================================================

create table if not exists public.lembretes (
  id         uuid primary key default gen_random_uuid(),
  titulo     text not null,
  data       date not null,
  hora       time,                          -- opcional
  vinculo    text not null default '',       -- cliente ou campanha ligada, texto livre
  prioridade text not null default 'normal', -- baixa, normal, alta
  concluido  boolean not null default false,
  criado_em  timestamptz not null default now()
);

alter table public.lembretes enable row level security;

create policy "laura le lembretes" on public.lembretes
  for select to authenticated using (true);
create policy "laura cadastra lembretes" on public.lembretes
  for insert to authenticated with check (true);
create policy "laura edita lembretes" on public.lembretes
  for update to authenticated using (true) with check (true);
create policy "laura apaga lembretes" on public.lembretes
  for delete to authenticated using (true);
