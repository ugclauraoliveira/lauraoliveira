-- Renomeia o nicho "Casa & Decoração" para "Casa e Gastronomia".
-- Seguro de rodar independente do que já estiver no banco: pega tanto
-- quem ainda está como "Casa & Decoração" quanto "Casa e Pet" (nome
-- intermediário que não chegou a ser usado) e corrige os dois casos.
--
-- Como rodar: cole no SQL Editor do Supabase e clique em "Run".

update public.videos
set nicho = 'Casa e Gastronomia'
where nicho in ('Casa & Decoração', 'Casa e Pet');
