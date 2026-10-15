-- =========================================================================
-- ADICIONAR FINANCEIRO
--
-- COMO USAR: Supabase > SQL Editor > New query > cole tudo > Run.
--
-- Cria duas tabelas:
-- 1) lancamentos: cada entrada de dinheiro (recebido ou a receber).
--    Quando você parcela um valor, cada parcela vira uma linha própria,
--    assim dá pra marcar cada uma como paga sem mexer nas outras.
-- 2) configuracoes: uma tabelinha bem simples de "chave e valor", usada
--    pra guardar a sua meta mensal (e, se um dia precisar, outras
--    configurações do painel, sem precisar criar tabela nova pra cada uma).
-- =========================================================================

create table if not exists public.lancamentos (
  id               uuid primary key default gen_random_uuid(),
  cliente          text not null default '',
  descricao        text not null default '',
  valor            numeric(10,2) not null default 0,
  vencimento       date not null,
  status           text not null default 'a receber', -- a receber, pago
                                                        -- ("atrasado" não é um status salvo: é calculado
                                                        -- sozinho quando o vencimento já passou e ainda
                                                        -- está "a receber", igual já funciona em Campanhas)
  forma_pagamento  text not null default '',
  parcela_rotulo   text not null default '',            -- ex: "Parcela 1/2"
  proposta_id      uuid references public.propostas(id) on delete set null,
  criado_em        timestamptz not null default now()
);

create table if not exists public.configuracoes (
  chave  text primary key,
  valor  text not null default ''
);

alter table public.lancamentos enable row level security;
create policy "laura le lancamentos" on public.lancamentos
  for select to authenticated using (true);
create policy "laura cadastra lancamentos" on public.lancamentos
  for insert to authenticated with check (true);
create policy "laura edita lancamentos" on public.lancamentos
  for update to authenticated using (true) with check (true);
create policy "laura apaga lancamentos" on public.lancamentos
  for delete to authenticated using (true);

alter table public.configuracoes enable row level security;
create policy "laura le configuracoes" on public.configuracoes
  for select to authenticated using (true);
create policy "laura cadastra configuracoes" on public.configuracoes
  for insert to authenticated with check (true);
create policy "laura edita configuracoes" on public.configuracoes
  for update to authenticated using (true) with check (true);
