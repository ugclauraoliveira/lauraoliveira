-- =========================================================================
-- ADICIONAR "FAVORITA" NA TABELA MARCAS
--
-- COMO USAR: Supabase > SQL Editor > New query > cole tudo > Run.
--
-- Cria a coluna que guarda quais marcas você fixou com a estrela na
-- aba Marcas do admin. Toda marca começa sem estrela (false).
-- =========================================================================

alter table public.marcas add column if not exists favorita boolean not null default false;
