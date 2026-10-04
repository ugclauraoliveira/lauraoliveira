-- =========================================================================
-- ADICIONAR NICHO NA TABELA MARCAS
--
-- COMO USAR: Supabase > SQL Editor > New query > cole tudo > Run.
--
-- O que esse arquivo faz:
-- 1) Cria a coluna "nicho" na tabela marcas (texto livre, pode ficar em branco).
-- 2) Preenche sozinho o nicho de toda marca que já tem pelo menos um vídeo
--    publicado no portfólio, copiando o nicho desse vídeo (ex: se a marca
--    "Wix Studio" tem um vídeo marcado como "Tech & Apps", ela já nasce
--    com esse nicho preenchido, sem você digitar nada).
-- 3) Marcas sem nenhum vídeo cadastrado ficam com nicho em branco. Pra essas,
--    use o botão "Sugerir nichos" na aba Marcas do admin, ou preencha na mão.
-- =========================================================================

alter table public.marcas add column if not exists nicho text not null default '';

update public.marcas m
set nicho = v.nicho
from (
  select distinct on (lower(trim(marca))) lower(trim(marca)) as marca_normalizada, nicho
  from public.videos
  where marca is not null and trim(marca) <> ''
    and nicho is not null and trim(nicho) <> ''
  order by lower(trim(marca)), ordem asc
) v
where lower(trim(m.nome)) = v.marca_normalizada
  and trim(coalesce(m.nicho, '')) = '';
