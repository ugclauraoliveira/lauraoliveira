-- =========================================================================
-- ADICIONAR PROPOSTAS (gerador de proposta + link público pro cliente)
--
-- COMO USAR: Supabase > SQL Editor > New query > cole tudo > Run.
--
-- Cria duas tabelas:
-- 1) servicos_padrao: os seus modelos de serviço salvos (ex: "Vídeo UGC"),
--    pra você não digitar a descrição e o valor toda vez.
-- 2) propostas: cada proposta que você monta, com um "token" (um código
--    aleatório e difícil de adivinhar) que vira o link que o cliente abre.
--
-- IMPORTANTE SOBRE SEGURANÇA, leia esta parte:
-- A tabela "propostas" tem RLS ligado e SÓ VOCÊ, logada, consegue ler ou
-- escrever nela diretamente. Isso significa que o link público do cliente
-- NÃO lê a tabela diretamente. Em vez disso, criamos uma função especial
-- chamada "obter_proposta_publica": ela recebe o código da proposta (o
-- token que está no link) e devolve SÓ aquela proposta, nunca a lista
-- inteira. É assim que o cliente consegue ver a proposta dele sem login,
-- sem que isso abra as suas outras propostas (com nomes, valores e
-- telefones de outros clientes) pra qualquer pessoa.
-- =========================================================================

create table if not exists public.servicos_padrao (
  id         uuid primary key default gen_random_uuid(),
  nome       text not null,
  descricao  text not null default '',
  valor      numeric(10,2) not null default 0,
  ordem      integer not null default 0,
  criado_em  timestamptz not null default now()
);

create table if not exists public.propostas (
  id               uuid primary key default gen_random_uuid(),
  token            text not null unique default encode(gen_random_bytes(16), 'hex'),
  cliente_nome     text not null,
  cliente_whatsapp text not null default '',
  itens            jsonb not null default '[]'::jsonb,  -- [{"descricao":"...", "valor":100}]
  desconto         numeric(10,2) not null default 0,
  total            numeric(10,2) not null default 0,
  prazo_entrega    text not null default '',
  formas_pagamento text not null default '',
  como_funciona    text not null default '',             -- um passo por linha
  observacoes      text not null default '',
  validade_dias    integer not null default 7,
  status           text not null default 'enviada',      -- enviada, aceita, recusada
  criado_em        timestamptz not null default now(),
  atualizado_em    timestamptz not null default now()
);

alter table public.servicos_padrao enable row level security;
create policy "laura le servicos padrao" on public.servicos_padrao
  for select to authenticated using (true);
create policy "laura cadastra servicos padrao" on public.servicos_padrao
  for insert to authenticated with check (true);
create policy "laura edita servicos padrao" on public.servicos_padrao
  for update to authenticated using (true) with check (true);
create policy "laura apaga servicos padrao" on public.servicos_padrao
  for delete to authenticated using (true);

alter table public.propostas enable row level security;
create policy "laura le propostas" on public.propostas
  for select to authenticated using (true);
create policy "laura cadastra propostas" on public.propostas
  for insert to authenticated with check (true);
create policy "laura edita propostas" on public.propostas
  for update to authenticated using (true) with check (true);
create policy "laura apaga propostas" on public.propostas
  for delete to authenticated using (true);

-- A "portinha" pro cliente ver a proposta dele, sem login e sem enxergar
-- as outras. Veja a explicação completa no comentário lá em cima.
create or replace function public.obter_proposta_publica(token_busca text)
returns setof public.propostas
language sql
security definer
set search_path = public
as $$
  select * from public.propostas where token = token_busca limit 1;
$$;

grant execute on function public.obter_proposta_publica(text) to anon, authenticated;
