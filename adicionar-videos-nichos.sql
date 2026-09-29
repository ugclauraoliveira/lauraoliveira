-- Adiciona 4 vídeos novos no portfólio, cada um no FINAL do seu nicho.
-- A "ordem" é calculada automaticamente (maior ordem já usada nesse nicho + 1),
-- então cada vídeo entra depois de todos os outros do mesmo nicho.
--
-- Como rodar: cole tudo no SQL Editor do Supabase e clique em "Run".

insert into public.videos (titulo, link, nicho, formato, marca, ordem)
values (
  'Chilli Beans',
  'https://youtube.com/shorts/T2ngCkLB8XU?feature=share',
  'Moda e Beleza',
  'Vídeo vertical 9:16',
  'Chilli Beans',
  (select coalesce(max(ordem), 0) + 1 from public.videos where nicho = 'Moda e Beleza')
);

insert into public.videos (titulo, link, nicho, formato, marca, ordem)
values (
  'Go Coffee',
  'https://youtube.com/shorts/5iCULzSoLOs?feature=share',
  'Experiência',
  'Vídeo vertical 9:16',
  'Go Coffee',
  (select coalesce(max(ordem), 0) + 1 from public.videos where nicho = 'Experiência')
);

insert into public.videos (titulo, link, nicho, formato, marca, ordem)
values (
  'Friskies',
  'https://youtube.com/shorts/2QL4iwySW6M?feature=share',
  'Casa e Pet',
  'Vídeo vertical 9:16',
  'Friskies',
  (select coalesce(max(ordem), 0) + 1 from public.videos where nicho = 'Casa e Pet')
);

insert into public.videos (titulo, link, nicho, formato, marca, ordem)
values (
  'Glasu | Suvinil',
  'https://youtube.com/shorts/TxDCXYPZ9oI?feature=share',
  'Casa e Pet',
  'Vídeo vertical 9:16',
  'Glasu | Suvinil',
  (select coalesce(max(ordem), 0) + 1 from public.videos where nicho = 'Casa e Pet')
);
