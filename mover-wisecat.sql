-- Move o vídeo da Wisecat para entre Piracanjuba e Friskies, dentro do
-- nicho "Casa e Gastronomia". Reorganiza a ordem de todos os vídeos
-- desse nicho mantendo a sequência atual dos outros, só reposicionando
-- a Wisecat.
--
-- Como rodar: cole no SQL Editor do Supabase e clique em "Run".

with atual as (
  select
    id,
    case
      when marca = 'Wisecat' then (
        select ordem from public.videos
        where nicho = 'Casa e Gastronomia' and marca = 'Piracanjuba'
        limit 1
      ) + 0.5
      else ordem::numeric
    end as chave_ordem
  from public.videos
  where nicho = 'Casa e Gastronomia'
),
nova_ordem as (
  select id, row_number() over (order by chave_ordem) * 10 as valor
  from atual
)
update public.videos v
set ordem = n.valor
from nova_ordem n
where v.id = n.id;
