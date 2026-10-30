-- Troca o texto do selo de destaque do vídeo da Fazolli
-- ("Criativo que mais converteu") para "Criativo campeão".
--
-- Como rodar: cole no SQL Editor do Supabase e clique em "Run".

update public.videos
set destaque = 'Criativo campeão'
where nicho = 'Promoções'
  and trim(marca) ilike 'fazolli%'
  and destaque = 'Criativo que mais converteu';
