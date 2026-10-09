-- Agrupa todos os vídeos da Preveja lado a lado, dentro do nicho
-- "Tech & Apps". Eles passam a ficar juntos a partir da posição onde
-- estava o primeiro vídeo da Preveja, mantendo a ordem dos outros
-- vídeos do nicho.
--
-- Como rodar: cole no SQL Editor do Supabase e clique em "Run".

with ancora as (
  select min(ordem) as valor
  from public.videos
  where nicho = 'Tech & Apps' and marca ilike 'preveja%'
),
atual as (
  select
    v.id,
    case when v.marca ilike 'preveja%' then a.valor else v.ordem end as chave_principal,
    v.ordem as chave_secundaria
  from public.videos v, ancora a
  where v.nicho = 'Tech & Apps'
),
nova_ordem as (
  select id, row_number() over (order by chave_principal, chave_secundaria) * 10 as valor
  from atual
)
update public.videos v
set ordem = n.valor
from nova_ordem n
where v.id = n.id;
