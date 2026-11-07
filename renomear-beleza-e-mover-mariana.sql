-- 1) Renomeia o nicho "Moda e Beleza" para só "Beleza" (muda o botão de
--    filtro e o título da seção na aba trabalhos).
update public.videos
set nicho = 'Beleza'
where nicho = 'Moda e Beleza';

-- 2) Move o vídeo da Mariana Cardoso (que estava em primeiro) para o
--    último lugar dentro desse nicho, mantendo a ordem dos outros.
--
-- Como rodar: cole tudo no SQL Editor do Supabase e clique em "Run".

with atual as (
  select
    id,
    case
      when trim(marca) ilike 'mariana%cardoso%' then (
        select max(ordem) + 1 from public.videos where nicho = 'Beleza'
      )
      else ordem::numeric
    end as chave_ordem
  from public.videos
  where nicho = 'Beleza'
),
nova_ordem as (
  select id, row_number() over (order by chave_ordem) * 10 as valor
  from atual
)
update public.videos v
set ordem = n.valor
from nova_ordem n
where v.id = n.id;
