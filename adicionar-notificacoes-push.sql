-- =========================================================================
-- ADICIONAR NOTIFICAÇÕES PUSH (celular)
--
-- COMO USAR: Supabase > SQL Editor > New query > cole tudo > Run.
--
-- O que isso faz:
-- 1) Cria a tabela "push_subscriptions": guarda uma "chave de endereço"
--    do seu celular/navegador, criada quando você aperta "Ativar
--    notificações" no Dashboard. É por isso que o aviso consegue chegar
--    até você mesmo com o site fechado: o Supabase manda direto pro
--    sistema do seu celular, sem precisar que nada esteja aberto.
-- 2) Adiciona uma coluna em "lembretes" pra saber quais já foram avisados
--    por notificação (assim ela não te avisa 10 vezes seguidas).
-- 3) Liga as extensões pg_cron e pg_net, que fazem o Supabase, sozinho,
--    de 15 em 15 minutos, checar se tem lembrete pra avisar e chamar a
--    função "enviar-notificacoes" (criada separadamente, nas Edge
--    Functions).
--
-- Pode rodar esse arquivo mais de uma vez sem medo, mesmo que já tenha
-- rodado antes: ele apaga e recria só as regras e o agendamento, nunca
-- os seus dados.
-- =========================================================================

create table if not exists public.push_subscriptions (
  id         uuid primary key default gen_random_uuid(),
  endpoint   text not null unique,
  p256dh     text not null,
  auth       text not null,
  criado_em  timestamptz not null default now()
);

alter table public.push_subscriptions enable row level security;

drop policy if exists "laura le push_subscriptions" on public.push_subscriptions;
create policy "laura le push_subscriptions" on public.push_subscriptions
  for select to authenticated using (true);

drop policy if exists "laura cadastra push_subscriptions" on public.push_subscriptions;
create policy "laura cadastra push_subscriptions" on public.push_subscriptions
  for insert to authenticated with check (true);

drop policy if exists "laura atualiza push_subscriptions" on public.push_subscriptions;
create policy "laura atualiza push_subscriptions" on public.push_subscriptions
  for update to authenticated using (true) with check (true);

drop policy if exists "laura apaga push_subscriptions" on public.push_subscriptions;
create policy "laura apaga push_subscriptions" on public.push_subscriptions
  for delete to authenticated using (true);

alter table public.lembretes add column if not exists notificado_push_em timestamptz;

create extension if not exists pg_cron;
create extension if not exists pg_net;

do $$
begin
  perform cron.unschedule('verificar-lembretes-push');
exception when others then
  null; -- ainda não existia agendamento nenhum, sem problema
end $$;

select cron.schedule(
  'verificar-lembretes-push',
  '*/15 * * * *',
  $$
  select net.http_post(
    url := 'https://znkvmwhpnnbfelwmiqzo.supabase.co/functions/v1/enviar-notificacoes',
    headers := '{"Content-Type":"application/json","apikey":"sb_publishable_NwP4wKU63LHC6uKIxcxcCw_c9lu66ju","Authorization":"Bearer sb_publishable_NwP4wKU63LHC6uKIxcxcCw_c9lu66ju"}'::jsonb,
    body := '{}'::jsonb
  );
  $$
);
