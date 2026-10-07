-- 1) Cria a coluna "youtube_ads" que ainda faltava no seu banco (por isso
--    o admin estava dando erro "Could not find the 'youtube_ads' column"
--    ao tentar adicionar qualquer vídeo novo). É seguro rodar mesmo que
--    a coluna já exista.
alter table public.videos add column if not exists youtube_ads text not null default '';

-- 2) Adiciona o vídeo da Seedz no nicho "Casa e Gastronomia", em primeiro
--    lugar (ordem menor que todos os outros vídeos desse nicho).
--
-- Como rodar: cole tudo no SQL Editor do Supabase e clique em "Run".

insert into public.videos (titulo, link, nicho, formato, marca, ordem)
values (
  'Seedz',
  'https://youtube.com/shorts/dC4j8oDi-bQ?si=bDEtZItrYcIPaAIB',
  'Casa e Gastronomia',
  'Vídeo vertical 9:16',
  'Seedz',
  (select coalesce(min(ordem), 0) - 1 from public.videos where nicho = 'Casa e Gastronomia')
);
