-- =========================================================================
-- ADICIONAR NEGOCIAÇÃO
--
-- COMO USAR: Supabase > SQL Editor > New query > cole tudo > Run.
--
-- Cria a tabela "negociacoes_historico": guarda cada mensagem de marca que
-- você colou e a resposta que a IA sugeriu, pra você poder olhar depois.
--
-- Também guarda, na tabelinha "configuracoes" (a mesma do Financeiro e do
-- Instagram), o "manual de negociação" que a IA usa como guia pra escrever
-- as respostas — o conteúdo da Aula 3 que você me mandou. Quando você
-- mandar mais aulas, eu atualizo esse mesmo texto.
--
-- Pode rodar esse arquivo mais de uma vez sem medo: ele apaga e recria só
-- as regras de segurança, nunca o seu histórico.
-- =========================================================================

create table if not exists public.negociacoes_historico (
  id                 uuid primary key default gen_random_uuid(),
  marca              text not null default '',
  mensagem_recebida  text not null default '',
  resposta_sugerida  text not null default '',
  criado_em          timestamptz not null default now()
);

alter table public.negociacoes_historico enable row level security;

drop policy if exists "laura le negociacoes_historico" on public.negociacoes_historico;
create policy "laura le negociacoes_historico" on public.negociacoes_historico
  for select to authenticated using (true);

drop policy if exists "laura cadastra negociacoes_historico" on public.negociacoes_historico;
create policy "laura cadastra negociacoes_historico" on public.negociacoes_historico
  for insert to authenticated with check (true);

drop policy if exists "laura apaga negociacoes_historico" on public.negociacoes_historico;
create policy "laura apaga negociacoes_historico" on public.negociacoes_historico
  for delete to authenticated using (true);

insert into public.configuracoes (chave, valor) values (
  'negociacao_material',
  $$AULA 3 — NEGOCIAÇÃO COM MARCAS

1. PREPARAÇÃO ANTES DA PROPOSTA
- Pesquise sobre a marca: público, produtos, campanhas anteriores, tom de comunicação.
- Entenda os objetivos e necessidades reais da marca.
- Prepare dados do portfólio: métricas, resultados, cases.
- Defina valor e limites antes de responder. Conhecimento é poder.

2. ESTRUTURE A RESPOSTA ESTRATEGICAMENTE
- Comece valorizando a marca e mostrando alinhamento com os objetivos dela.
- Apresente uma visão geral do que você entrega: solução completa, não apenas vídeo.
- Destaque diferenciais e resultados esperados.
- Evite falar preço isoladamente — o valor vem primeiro.

3. LINGUAGEM E POSTURA AO NEGOCIAR
- Use tom confiante e colaborativo.
- Faça perguntas abertas: "Como podemos atingir juntos esse objetivo?"
- Direcione a decisão com opções limitadas, sem parecer autoritária.
- Antecipe objeções e mostre alternativas sem reduzir preço.
- Segurança não é impor, é conduzir com intenção.

4. FOLLOW-UP E FECHAMENTO ESTRATÉGICO
- Confirme entendimento da marca sobre o que será entregue.
- Reforce o valor do trabalho antes de fechar qualquer número.
- Mantenha comunicação clara e profissional até o fechamento.
- Crie oportunidade de relacionamento contínuo (métricas, próximas campanhas, pacotes futuros).

5. O FLUXO DA NEGOCIAÇÃO (passo a passo)
1) Diagnóstico — Atenção: pesquise o público, tom de voz, posicionamento e campanhas anteriores da marca. Identifique dores e oportunidades. Não fale preço antes de conhecer o cenário completo.
2) Apresentação de valor — Interesse: mostre resultados já entregues no nicho, destaque diferenciais, conecte entregas aos objetivos da marca, evite falar preço antes da marca perceber o valor.
3) Condução da conversa — Desejo: antecipe interesses ocultos da marca. Use ancoragem de valor (mostre primeiro pacotes mais completos, pra as outras opções parecerem acessíveis). Direcione decisões de forma sutil, com escolhas limitadas ("podemos fazer A ou B"). Transforme objeções em oportunidades de reforçar benefícios.
4) Proposta — Ação: estruture pacotes estratégicos completos com entregas, formatos e prazos claros. Evite falar preço isoladamente; conecte ao valor apresentado. Ofereça alternativas dentro do seu posicionamento.
5) Tratamento de objeções e fechamento: objeção não é rejeição, é sinal de interesse com dúvida ou insegurança. Investigue antes de responder. Reforce valor e resultado antes de qualquer ajuste. Reformule a objeção em oportunidade. Conduza o fechamento com clareza (entregas, prazos, próximos passos). O fechamento não acontece quando você abaixa o preço, mas quando a marca entende o valor e se sente segura para avançar. Existe diferença grande entre "vender" e "comprar".

6. SER RUDE x SER PROFISSIONAL
Rude: responde seco ou defensivo, demonstra impaciência/irritação, foca em "ganhar" a conversa, reage emocionalmente a objeções, interrompe ou ignora o ponto da marca, tenta impor decisão/pressionar, quebra o relacionamento no primeiro conflito.
Profissional: mantém clareza, objetividade e respeito; sustenta o posicionamento sem agressividade; conduz com segurança e estratégia; foca em solução e resultado; escuta antes de responder; valida o ponto da marca sem concordar automaticamente; usa linguagem estratégica e colaborativa; direciona a decisão com inteligência, não pressão; preserva o relacionamento mesmo sem fechamento.

7. EXEMPLOS PRÁTICOS
Objeção de preço:
  Rude: "Não me interessa, está abaixo do valor que eu ofereço."
  Profissional: "Agradeço sua proposta 😊 Hoje trabalho com valores alinhados à estratégia e qualidade que entrego, mas adoraria encontrar uma forma de viabilizar algo que funcione para ambos. O que acha de (inclua a proposta)?"
Marca demora para responder:
  Rude: "Você conseguiu ver minha proposta?"
  Profissional: "Oi! Passando para saber se conseguiu analisar a proposta. Estou finalizando a agenda de produções desse mês e adoraria incluir a (nome da marca) nela. Consegue me dar um retorno ainda hoje?"
Comparação com outro criador:
  Rude: "Entendi, tudo bem, então pode fechar com ela."
  Profissional: "Entendo a comparação. Mas gostaria de ressaltar que cada criadora tem um posicionamento e uma forma de entrega. O meu trabalho hoje é mais focado em estratégia e resultado, pensando não só no conteúdo em si, mas em como ele pode performar e gerar impacto para a marca. Por isso, o posicionamento acaba sendo diferente."
Pedido fora do escopo:
  Rude: "Isso não está incluso."
  Profissional: "Claro, podemos incluir sim. Incluindo X no escopo, o investimento pela entrega é de Y adicional."

8. FRASES PROIBIDAS x FRASES MÁGICAS (sempre troque)
  "Não faço isso." → "O que consigo oferecer nesse formato é..."
  "Não posso." → "O que consigo viabilizar é..."
  "O preço é / Custa R$500." → "O investimento para esse formato é de R$500."
  "Quanto vocês podem pagar?" → "Qual é o orçamento destinado a essa ação?"
  "Meu mínimo é R$X." → "Para esse formato, trabalho a partir de R$X."
  "Não trabalho por comissão." → "Minha criação envolve um investimento fixo de produção, além da comissão, quando aplicável."
  "NÃO" não é proibido — é a forma como você constrói a frase depois do "não" que importa.

9. PERMUTA (produto/serviço em troca de divulgação, sem pagamento)
Entendendo a permuta:
  - A marca não é obrigada a pagar: cada empresa tem estratégia e orçamento diferente.
  - Existem marcas que trabalham só com permuta ou valores baixos — isso faz parte do mercado.
  - Permuta não é desvalorização, é uma modalidade de parceria.
  - Vale a pena quando o produto/serviço é relevante pra você, ou quando você quer entrar/validar um novo nicho.
  - O erro não é aceitar permuta, é não ter estratégia ao aceitar e aceitar sem negociar.
Quando NÃO aceitar permuta:
  - Quando não há alinhamento com seu nicho ou posicionamento.
  - Quando o produto não agrega valor real para você.
  - Quando a marca exige muito e entrega pouco.
  - Quando não existe potencial de visibilidade, portfólio ou crescimento.
  - Quando você já tem experiência suficiente para cobrar.
  - Quando a proposta desrespeita seu nível atual de posicionamento.
Como responder quando a marca oferece permuta:
  - Agradeça e valide o convite da marca.
  - Demonstre interesse, mas não aceite imediatamente.
  - Reforce seu posicionamento profissional.
  - Direcione a conversa para possibilidade de parceria paga.
  - Mantenha abertura sem se desvalorizar.
O que NÃO responder: "Obrigada, eu não trabalho com permuta. Aqui está minha tabela de preços para você conferir meus pacotes, se aceitar fechar de forma remunerada, podemos seguir com a parceria." (seco demais, fecha a porta)
Exemplo de resposta correta: "Muito obrigada pelo contato e pelo interesse na parceria, fiquei muito feliz e vou amar trabalhar com a (nome da marca). Tenho certeza que podemos construir algo incrível juntos. No entanto, tenho feito um investimento contínuo em estratégia, produção e qualidade de entrega dos meus conteúdos, garantindo resultados mais consistentes para as marcas, por isso, hoje tenho trabalhado somente com parcerias remuneradas, focadas em estratégia e entrega de resultados, o que me permite manter a qualidade e evolução do meu trabalho em cada projeto. Minha agenda de produção deste mês está quase fechada, mas vou adorar incluir a (nome da marca) nesse planejamento, caso consigamos alinhar um formato remunerado que faça sentido para ambos os lados. Essa campanha é para uma ação específica como um lançamento de produto, destinado a alguma data especial ou pra um produto específico?"
  Por que essa resposta funciona: valida/elogia e mostra interesse pela marca; dá clareza de valor (investimento contínuo, qualidade); cria urgência e escassez (agenda quase fechada); mostra parceria e cumplicidade ("buscar formato que funcione para ambos"); mostra entendimento de necessidade e abre a conversa pra continuar (pergunta sobre o objetivo da campanha).

10. FORMAS DE CONVERTER UMA PROPOSTA DE BAIXO VALOR
Você ganha a negociação quando aumenta as vantagens oferecidas inicialmente, mesmo que continue sendo uma permuta. Exemplos:
  - A marca ofereceu 1 produto e você fechou 2 produtos.
  - A marca ofereceu 3 meses grátis e você fechou 1 ano grátis.
  - A marca ofereceu um produto de menor valor e você fechou um produto de maior valor.
  - A marca ofereceu apenas o produto e você fechou permuta por ele + R$150 por ADS.
  - A marca ofereceu uma parceria pontual e você fechou uma parceria recorrente.
  - A marca ofereceu uma condição padrão e você fechou uma condição exclusiva.
  - A marca propôs um orçamento que não se alinha com o seu e você fechou um gerenciamento de campanha.
  - A marca ofereceu um valor baixo por um conteúdo estratégico e você fechou um conteúdo simples.
  - A marca quer um vídeo para reels e você fecha um story.

11. RESPOSTAS PASSIVAS QUE NÃO GERAM FECHAMENTO (evite)
  "Fico à disposição" / "Qualquer coisa me avisa" / "Me diga como prefere" / "Se tiver interesse, me fala"
  Por que prejudicam: não direcionam a decisão da marca, passam insegurança e falta de liderança, deixam o controle totalmente com o cliente, diminuem a percepção de valor e autoridade.
Substitua por respostas com ação + perguntas estratégicas:
  "Vou organizar uma sugestão de formato pra vocês. Você já tem alguma referência de vídeo que gostaria de seguir para essa produção?"
  "Vou formular um orçamento especial pra você, sobre a campanha — o foco principal é no lançamento de um produto, um produto que já existe ou reconhecimento de marca?"
  "Perfeito! Eu irei aguardar o seu retorno, como se trata de um lançamento acredito que vocês tenham urgência. Se você me retornar até amanhã, eu organizo minha agenda para te entregar o conteúdo até quinta-feira, consegue me retornar dentro desse prazo?"$$
)
on conflict (chave) do update set valor = excluded.valor;
