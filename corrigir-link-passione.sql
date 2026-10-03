-- Corrige o link do vídeo da Passione, que estava com o ID errado
-- (por isso a capa aparecia como aquela imagem cinza genérica do
-- YouTube, em vez da miniatura real do vídeo).
--
-- Como rodar: cole no SQL Editor do Supabase e clique em "Run".

update public.videos
set link = 'https://youtube.com/shorts/DngcbNYV3ng?feature=share'
where marca = 'Passione' or titulo = 'Passione';
