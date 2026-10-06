-- Coloca o vídeo da Open English em primeiro lugar dentro do nicho
-- "Educação" (ele estava aparecendo por último).
--
-- Como rodar: cole no SQL Editor do Supabase e clique em "Run".

update public.videos
set ordem = (
  select min(ordem) - 1
  from public.videos
  where nicho = 'Educação'
)
where nicho = 'Educação' and marca = 'Open English';
