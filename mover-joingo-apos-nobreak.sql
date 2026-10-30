-- Move os dois vídeos da Joingo pra logo depois do vídeo da Nobreak
-- Coffee, dentro do nicho "Autocuidado". Mantém a ordem dos outros
-- vídeos e a ordem entre os dois vídeos da Joingo entre si.
--
-- Como rodar: cole no SQL Editor do Supabase e clique em "Run".

with ancora as (
  select ordem as valor
  from public.videos
  where nicho = 'Autocuidado' and trim(marca) ilike '%nobreak%'
  limit 1
),
atual as (
  select
    v.id,
    case when trim(v.marca) ilike 'joingo%' then a.valor else v.ordem end as chave_principal,
    (trim(v.marca) ilike 'joingo%')::int as eh_joingo,
    v.ordem as chave_secundaria
  from public.videos v, ancora a
  where v.nicho = 'Autocuidado'
),
nova_ordem as (
  select id, row_number() over (order by chave_principal, eh_joingo, chave_secundaria) * 10 as valor
  from atual
)
update public.videos v
set ordem = n.valor
from nova_ordem n
where v.id = n.id;

-- Se der erro "more than one row returned" na âncora, é porque tem mais
-- de um vídeo com "nobreak" no nome da marca; nesse caso me avisa.
