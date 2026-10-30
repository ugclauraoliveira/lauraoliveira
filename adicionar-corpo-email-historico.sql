-- =========================================================================
-- ADICIONAR CORPO DO E-MAIL NO HISTÓRICO
--
-- COMO USAR: Supabase > SQL Editor > New query > cole tudo > Run.
--
-- Adiciona uma coluna na tabela email_envios pra guardar o conteúdo
-- (HTML) de cada e-mail que foi enviado, pra você poder clicar numa
-- linha do histórico, na aba Prospecção, e ver o e-mail que foi mandado.
-- Envios antigos (de antes dessa coluna existir) ficam sem esse conteúdo,
-- mas continuam aparecendo normalmente no histórico.
--
-- Pode rodar esse arquivo mais de uma vez sem medo.
-- =========================================================================

alter table public.email_envios add column if not exists corpo_html text;
