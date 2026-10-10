-- Exclui o vídeo duplicado da Seedz no nicho "Casa e Gastronomia",
-- mantendo o que está em primeiro lugar.
--
-- Como rodar: cole no SQL Editor do Supabase e clique em "Run".

delete from public.videos
where id = (
  select id from public.videos
  where nicho = 'Casa e Gastronomia' and marca = 'Seedz'
  order by ordem desc
  limit 1
);
