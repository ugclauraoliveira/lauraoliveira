-- =========================================================================
-- PERMITIR REMOVER UM DESCADASTRO (tabela email_optout)
--
-- COMO USAR: Supabase > SQL Editor > New query > cole tudo > Run.
--
-- O prospeccao.sql já criou a tabela email_optout com permissão pra você
-- ler e adicionar. Esta aqui só acrescenta a permissão de APAGAR uma
-- linha, usada pelo botão "remover" na aba Prospecção (caso você
-- adicione um e-mail por engano e queira desfazer).
-- =========================================================================

create policy "laura remove descadastros" on public.email_optout
  for delete to authenticated using (true);
