-- =========================================================================
-- CORRIGE OS VÍDEOS NOVOS DO PORTFÓLIO
--
-- COMO USAR: Supabase > SQL Editor > New query > cole tudo > Run.
--
-- O que este arquivo faz, em ordem:
-- 1) Apaga os vídeos que o "novos-videos.sql" anterior cadastrou
--    (identificados pelo número de ordem, de 100 a 132). Se você
--    rodou aquele arquivo mais de uma vez sem querer, isso limpa
--    as cópias repetidas também.
-- 2) Cadastra os mesmos 33 vídeos de novo, certinho, com o nicho
--    "Casa & Decoração" escrito exatamente igual ao que já existia
--    (antes estava "Casa e Decoração", com "e" em vez de "&", por
--    isso viraram dois botões de filtro separados no site).
--
-- Nenhum vídeo cadastrado ANTES do novos-videos.sql é apagado ou
-- alterado (como o vídeo antigo da Iracema, se já existia).
-- =========================================================================

delete from public.videos where ordem >= 100 and ordem <= 132;

insert into public.videos (titulo, link, nicho, formato, marca, ordem, visivel) values
  ('TIM', 'https://youtube.com/shorts/TXHkP8cHx9Y?feature=share', 'Tech', 'Vídeo vertical 9:16', 'TIM', 100, true),
  ('Perplexity', 'https://youtube.com/shorts/uW3xVDDRrlo?feature=share', 'Tech', 'Vídeo vertical 9:16', 'Perplexity', 101, true),
  ('Waybe', 'https://youtube.com/shorts/RFllcVDbbec?feature=share', 'Tech', 'Vídeo vertical 9:16', 'Waybe', 102, true),
  ('Preveja.Me', 'https://youtube.com/shorts/7elJpGgIWMU?feature=share', 'Tech', 'Vídeo vertical 9:16', 'Preveja.Me', 103, true),
  ('Lembre.To', 'https://youtube.com/shorts/INE2mhgVGqs?feature=share', 'Tech', 'Vídeo vertical 9:16', 'Lembre.To', 104, true),
  ('Consultoria', 'https://youtube.com/shorts/glRfDI33Gl8?feature=share', 'Educação', 'Vídeo vertical 9:16', 'Consultoria', 105, true),
  ('Consultoria', 'https://youtube.com/shorts/GYaRo2svAIQ?feature=share', 'Educação', 'Vídeo vertical 9:16', 'Consultoria', 106, true),
  ('Unopar', 'https://youtube.com/shorts/XjEt38zidVw?feature=share', 'Educação', 'Vídeo vertical 9:16', 'Unopar', 107, true),
  ('Unopar', 'https://youtube.com/shorts/yp_dumh2E_A?feature=share', 'Educação', 'Vídeo vertical 9:16', 'Unopar', 108, true),
  ('Mariana Cardoso', 'https://youtube.com/shorts/8Z6qAb2TO2s?feature=share', 'Moda e Beleza', 'Vídeo vertical 9:16', 'Mariana Cardoso', 109, true),
  ('Eudora', 'https://youtube.com/shorts/6WVSTKkjxsY?feature=share', 'Moda e Beleza', 'Vídeo vertical 9:16', 'Eudora', 110, true),
  ('Eudora', 'https://youtube.com/shorts/ixKVdfh-nGU?feature=share', 'Moda e Beleza', 'Vídeo vertical 9:16', 'Eudora', 111, true),
  ('Payot', 'https://youtube.com/shorts/8Bz3kvk7ih4?feature=share', 'Moda e Beleza', 'Vídeo vertical 9:16', 'Payot', 112, true),
  ('Bearry Derm', 'https://youtube.com/shorts/YJX3obZCfow?feature=share', 'Moda e Beleza', 'Vídeo vertical 9:16', 'Bearry Derm', 113, true),
  ('Rosa Selvagem', 'https://youtube.com/shorts/h1kozKLObg0?feature=share', 'Moda e Beleza', 'Vídeo vertical 9:16', 'Rosa Selvagem', 114, true),
  ('Rosa Selvagem', 'https://youtube.com/shorts/quGK_2eH5Mc?feature=share', 'Moda e Beleza', 'Vídeo vertical 9:16', 'Rosa Selvagem', 115, true),
  ('Beyoung', 'https://youtube.com/shorts/mKaK4WeK7bs?feature=share', 'Moda e Beleza', 'Vídeo vertical 9:16', 'Beyoung', 116, true),
  ('Beyoung', 'https://youtube.com/shorts/Cq8x0Nf8_jY?feature=share', 'Moda e Beleza', 'Vídeo vertical 9:16', 'Beyoung', 117, true),
  ('Nobreak Coffee', 'https://youtube.com/shorts/A-WDndLrlms?feature=share', 'Autocuidado', 'Vídeo vertical 9:16', 'Nobreak Coffee', 118, true),
  ('Treino & Dieta', 'https://youtube.com/shorts/a4MDPBgftH0?feature=share', 'Autocuidado', 'Vídeo vertical 9:16', 'Treino & Dieta', 119, true),
  ('Jiujitsu', 'https://youtube.com/shorts/yypchCtg6lU?feature=share', 'Autocuidado', 'Vídeo vertical 9:16', 'Jiujitsu', 120, true),
  ('Massoterapia', 'https://youtube.com/shorts/GsybrzabM8g?feature=share', 'Experiência', 'Vídeo vertical 9:16', 'Massoterapia', 121, true),
  ('Passione', 'https://youtube.com/shorts/DngcbNYV3ng', 'Experiência', 'Vídeo vertical 9:16', 'Passione', 122, true),
  ('Party Games', 'https://youtube.com/shorts/6IghEMyDK44?feature=share', 'Experiência', 'Vídeo vertical 9:16', 'Party Games', 123, true),
  ('Tatames Premium', 'https://youtube.com/shorts/3q8PYr7Yf6o?feature=share', 'Experiência', 'Vídeo vertical 9:16', 'Tatames Premium', 124, true),
  ('Wisecat', 'https://youtube.com/shorts/ZqLTrkfLrww?feature=share', 'Casa & Decoração', 'Vídeo vertical 9:16', 'Wisecat', 125, true),
  ('Iracema', 'https://youtube.com/shorts/nT27VFWlgfM?feature=share', 'Casa & Decoração', 'Vídeo vertical 9:16', 'Iracema', 126, true),
  ('O Rei da Promo', 'https://youtube.com/shorts/4GoG6_1Vj9o?feature=share', 'Promoções', 'Vídeo vertical 9:16', 'O Rei da Promo', 127, true),
  ('O Rei da Promo', 'https://youtube.com/shorts/5HXE7chNznI?feature=share', 'Promoções', 'Vídeo vertical 9:16', 'O Rei da Promo', 128, true),
  ('Fazolli', 'https://youtube.com/shorts/1kVlhWVlPuk?feature=share', 'Promoções', 'Vídeo vertical 9:16', 'Fazolli', 129, true),
  ('Fazolli', 'https://youtube.com/shorts/QP9p6Dh2W6A?feature=share', 'Promoções', 'Vídeo vertical 9:16', 'Fazolli', 130, true),
  ('O Rei da Promo', 'https://youtube.com/shorts/C_lMPojVx1Q?feature=share', 'Promoções', 'Vídeo vertical 9:16', 'O Rei da Promo', 131, true),
  ('O Rei da Promo', 'https://youtube.com/shorts/41Q7KaLV7ZI?feature=share', 'Promoções', 'Vídeo vertical 9:16', 'O Rei da Promo', 132, true);
