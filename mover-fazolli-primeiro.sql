-- Move os vídeos da Fazolli para o começo da fila, dentro do nicho
-- "Promoções". Mantém a ordem entre os dois vídeos da Fazolli e a
-- ordem dos outros vídeos do nicho.
--
-- Como rodar: cole no SQL Editor do Supabase e clique em "Run".

with atual as (
  select
    id,
    case
      when trim(marca) ilike 'fazolli%' then (
        select min(ordem) - 1 from public.videos where nicho = 'Promoções'
      )
      else ordem::numeric
    end as chave_principal,
    ordem as chave_secundaria
  from public.videos
  where nicho = 'Promoções'
),
nova_ordem as (
  select id, row_number() over (order by chave_principal, chave_secundaria) * 10 as valor
  from atual
)
update public.videos v
set ordem = n.valor
from nova_ordem n
where v.id = n.id;
