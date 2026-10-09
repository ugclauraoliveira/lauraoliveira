-- Agrupa todos os vídeos da Preveja lado a lado, dentro do nicho
-- "Tech & Apps". Eles passam a ficar juntos a partir da posição onde
-- estava o primeiro vídeo da Preveja, mantendo a ordem dos outros
-- vídeos do nicho.
--
-- Versão 2: usa "contém Preveja" em vez de "começa com Preveja" e
-- ignora espaços extras, pra funcionar mesmo se o nome da marca
-- estiver cadastrado de um jeito um pouco diferente (ex: "Preveja .me").
--
-- Como rodar: cole no SQL Editor do Supabase e clique em "Run".

with ancora as (
  select min(ordem) as valor
  from public.videos
  where nicho = 'Tech & Apps' and trim(marca) ilike '%preveja%'
),
atual as (
  select
    v.id,
    case when trim(v.marca) ilike '%preveja%' then a.valor else v.ordem end as chave_principal,
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

-- Se depois de rodar isso os vídeos continuarem separados, rode essa
-- consulta e me manda o resultado — ela mostra o texto exato que está
-- salvo no campo "marca" de cada vídeo da Preveja:
--
-- select titulo, marca, nicho, ordem from public.videos
-- where nicho = 'Tech & Apps' order by ordem;
