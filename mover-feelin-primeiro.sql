-- Move o vídeo da Feelin (que estava por último) para primeiro lugar,
-- dentro do nicho "Autocuidado". Mantém a ordem dos outros vídeos.
--
-- Como rodar: cole no SQL Editor do Supabase e clique em "Run".

with atual as (
  select
    id,
    case
      when marca = 'Feelin' then (
        select min(ordem) - 1 from public.videos
        where nicho = 'Autocuidado'
      )
      else ordem::numeric
    end as chave_ordem
  from public.videos
  where nicho = 'Autocuidado'
),
nova_ordem as (
  select id, row_number() over (order by chave_ordem) * 10 as valor
  from atual
)
update public.videos v
set ordem = n.valor
from nova_ordem n
where v.id = n.id;
