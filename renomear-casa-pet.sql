-- Renomeia o nicho "Casa & Decoração" para "Casa e Pet".
-- Seguro de rodar mesmo que você já tenha cadastrado o Friskies e o
-- Glasu | Suvinil com o nome antigo: essa atualização pega todos os
-- vídeos que ainda estiverem como "Casa & Decoração" e corrige.
--
-- Como rodar: cole no SQL Editor do Supabase e clique em "Run".

update public.videos
set nicho = 'Casa e Pet'
where nicho = 'Casa & Decoração';
