-- Move o vídeo da Waybe para o último lugar dentro do nicho "Tech & Apps".
-- Reorganiza a ordem de todos os vídeos desse nicho mantendo a sequência
-- atual dos outros, só reposicionando a Waybe pro final.
--
-- Como rodar: cole no SQL Editor do Supabase e clique em "Run".

with atual as (
  select
    id,
    case
      when marca ilike 'waybe%' then (
        select max(ordem) from public.videos
        where nicho = 'Tech & Apps'
      ) + 0.5
      else ordem::numeric
    end as chave_ordem
  from public.videos
  where nicho = 'Tech & Apps'
),
nova_ordem as (
  select id, row_number() over (order by chave_ordem) * 10 as valor
  from atual
)
update public.videos v
set ordem = n.valor
from nova_ordem n
where v.id = n.id;
