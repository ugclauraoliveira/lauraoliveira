-- Atualiza o link do vídeo da Passione para o novo vídeo reenviado
-- (o anterior estava como "Não listado" no YouTube, o que impedia
-- a miniatura de aparecer no site).
--
-- Como rodar: cole no SQL Editor do Supabase e clique em "Run".

update public.videos
set link = 'https://youtube.com/shorts/i-lAmowVfOI'
where marca = 'Passione' or titulo = 'Passione';
