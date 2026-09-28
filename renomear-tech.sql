-- =========================================================================
-- RENOMEAR NICHO "Tech" PARA "Tech & Apps"
--
-- COMO USAR: Supabase > SQL Editor > New query > cole tudo > Run.
--
-- O código do site já está pronto pra colocar "Tech & Apps" como o
-- primeiro nicho na aba Trabalhos. Só falta esse nicho existir com
-- esse nome exato na tabela "videos" — hoje ele ainda está salvo
-- como "Tech", por isso aparece por último e com o nome errado.
-- =========================================================================

update public.videos
set nicho = 'Tech & Apps'
where nicho = 'Tech';
