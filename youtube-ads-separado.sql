-- =========================================================================
-- SEPARAR "YouTube Ads" DE "Destaques"
--
-- COMO USAR: Supabase > SQL Editor > New query > cole tudo > Run.
--
-- Até agora, a aba "YouTube Ads" do site mostrava os mesmos vídeos
-- marcados como "Destaque". Esse SQL cria uma coluna nova, separada,
-- só pra essa aba — assim um vídeo pode aparecer em Destaques, em
-- YouTube Ads, nos dois, ou em nenhum, sem depender um do outro.
--
-- Depois de rodar esse SQL, no painel admin (aba Portfólio, editar
-- vídeo) vai aparecer um novo campo "Selo na aba YouTube Ads".
-- Preenchendo ele (ex: "2,3M views"), o vídeo passa a aparecer só
-- na aba YouTube Ads, mesmo sem estar marcado como Destaque.
-- =========================================================================

alter table public.videos add column if not exists youtube_ads text not null default '';

-- Exemplo pra adicionar o vídeo que você pediu (o link do youtu.be/EEHiCG6aWLs)
-- já marcado pra aparecer só na aba YouTube Ads. Se preferir, pode ignorar
-- esse insert e adicionar o vídeo pelo painel admin, aba Portfólio.
insert into public.videos (titulo, link, youtube_ads, formato) values
  ('Vídeo em destaque', 'https://youtu.be/EEHiCG6aWLs', 'SEU NÚMERO', 'Vídeo vertical 9:16');
