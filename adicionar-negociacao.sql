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
  $$QUEM É A CRIADORA (contexto sobre a Laura)
Sou criadora de conteúdo UGC, com foco em desenvolvimento de vídeos estratégicos para marcas, priorizando performance, comunicação persuasiva e geração de resultados. Atuo na estruturação de conteúdos orientados a conversão, posicionamento e fortalecimento de marca, além da condução de negociações comerciais com foco em valorização do trabalho e aumento de ticket médio. Desenvolvo roteiros, conceitos criativos e estratégias de comunicação alinhadas aos objetivos de cada campanha, considerando etapas de funil, comportamento do público e intenção de compra. Busco respostas práticas, aplicáveis e estratégicas, voltadas ao mercado de UGC, com foco em crescimento sustentável, monetização e posicionamento de alto valor.

AULA 3 — NEGOCIAÇÃO COM MARCAS

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
  "Perfeito! Eu irei aguardar o seu retorno, como se trata de um lançamento acredito que vocês tenham urgência. Se você me retornar até amanhã, eu organizo minha agenda para te entregar o conteúdo até quinta-feira, consegue me retornar dentro desse prazo?"

12. EXEMPLO REAL DE NEGOCIAÇÃO COMPLETA (permuta virando parceria remunerada)
Esse é um exemplo real de uma negociação do início ao fechamento, pra servir de modelo de tom e estrutura:
- A marca (Nove Mídia/Lala Cella) chama pedindo portfólio pra uma curadoria de UGC. A criadora NÃO manda o portfólio de cara: primeiro agradece o contato, demonstra interesse e pergunta sobre o projeto antes de qualquer coisa ("Claro, consigo sim. Antes, você poderia me falar um pouquinho sobre o projeto?").
- Depois de entender o projeto (marca nova de roupas femininas, lançamento), manda o portfólio com contexto sobre o nicho em que atua e também manda uma referência de um trabalho recente que ainda não está no portfólio oficial.
- A marca aprova o perfil e, por ser uma marca nova com "grande potencial de crescimento", oferece permuta: envio de 6 peças de roupa em troca de 3 vídeos + 3 fotos, com todo o roteiro já pronto da marca.
- A criadora NÃO aceita a permuta direto nem recusa secamente. Resposta modelo: valida a aprovação do perfil e o potencial da marca, explica que investe continuamente em cursos, equipamentos e ferramentas pra entregar conteúdo cada vez mais profissional e estratégico — e que por isso hoje trabalha só com parcerias remuneradas. Envia a tabela de valores e abre a conversa pra estruturarem juntos um formato remunerado que seja vantajoso pros dois lados.
- A marca aceita seguir no formato remunerado (gostou do trabalho, mas quer negociar): oferece R$600 (abaixo da tabela de R$997 pros 3 vídeos) e pede pra incluir 3 fotos de capa também, usando a urgência do lançamento como argumento pro desconto.
- A criadora NÃO simplesmente aceita o desconto nem recusa. Ela reestrutura a proposta: ajusta o escopo dos vídeos pra ficar mais claro e estratégico (1 vídeo GRWM falado, 1 vídeo com foco em venda, 1 vídeo aesthetic sem fala), mantém as 3 fotos de capa pedidas, e ainda oferece 2 fotos bônus pro feed + 6 meses de uso em anúncios (ADS) — tudo isso por R$750 (um valor entre o que ela cobra e o que a marca ofereceu, mas com escopo bem definido e com itens a mais, não um desconto simples). Pede confirmação do prazo de entrega (7 dias após receber os produtos).
- A marca fecha ("Fechado!"). A criadora confirma com entusiasmo, pede os dados (nome completo, CPF, telefone, endereço de entrega, medidas) e o contrato.
Técnica usada aqui: nunca aceitar a primeira oferta (nem a permuta, nem o desconto) sem reestruturar; sempre responder desconto com ajuste de escopo + itens extras, nunca com "não" seco; usar a urgência da marca a favor (prazo de entrega combinado = profissionalismo, não pressão); fechar pedindo os próximos passos práticos (dados e contrato) assim que a marca topa.

13. EXEMPLO: PREÇO POR UNIDADE x CONDIÇÃO PROMOCIONAL POR VOLUME
- Ao apresentar valor, informe o preço avulso por conteúdo (ex: R$397 o vídeo) e, junto, ofereça uma condição promocional melhor por unidade se a marca fechar um pacote fechado de mais produções de uma vez (ex: fechando no mínimo 3 produções, cada uma sai por R$290). Isso aumenta o ticket total sem parecer que você está "baixando o preço" de graça — é uma troca: mais volume fechado por um valor menor por peça.
- Sempre detalhe, junto da proposta: prazo de entrega (em dias úteis, contado a partir da data de fechamento do contrato), padrão de qualidade (ex: alta resolução) e os direitos de uso do material (por quanto tempo pode ser usado em anúncios/ADS, e que no feed orgânico o uso costuma ser por tempo indeterminado).
- Mostre flexibilidade e profissionalismo no roteiro: "Vocês podem me mandar o roteiro que gostariam que eu seguisse, ou eu crio e envio para aprovação."
- Quando a marca pede tempo pra decidir internamente ("vamos analisar com o time"), responda com cordialidade, sem pressionar, e aguarde. Pode oferecer um pequeno incentivo condicionado a uma resposta rápida — não é desconto, é agilidade na entrega — pra gerar leve urgência sem parecer ansiosa: "Caso consigam retorno até amanhã, consigo incluir a entrega de uma das produções ainda essa semana."
- Assim que fechar, já defina um marco concreto de entrega ("te envio o primeiro vídeo até sexta") — isso transmite organização e controle do processo.
- Feche a conversa de forma simples e calorosa, agradecendo e desejando um bom dia/continuidade, sem alongar depois que o "sim" já veio.

14. TENTAR CONVENCER x CONDUZIR A NEGOCIAÇÃO (postura geral — a mais importante)
Tentar convencer (evite): explica demais, justifica o próprio valor de novo e de novo, tenta provar que "vale a pena", insiste para a marca aceitar, fica dependente da aprovação dela, fala mais do que deveria.
Conduzir a negociação (faça isso): apresenta valor com clareza (uma vez só, sem repetir se justificando), direciona a conversa com estratégia, cria cenários e opções estruturadas (pacotes), mantém controle sem pressão, leva a marca à decisão com segurança, demonstra que não precisa fechar aquela marca mas quer.

15. SIMULAÇÃO: QUANDO A MARCA INSISTE EM PERMUTA (mesmo depois da resposta profissional)
Marca: "No momento estamos priorizando permuta, obrigada."
Forma condutora (aceitar a permuta, mas reduzindo o escopo da entrega): "Entendo perfeitamente. Então, para esse formato em permuta, conseguimos trabalhar com uma entrega um pouco mais simples, como conteúdos mais diretos ou stories. O que acha? [envie um exemplo de conteúdo simples como referência]. Quando se trata de conteúdos mais estratégicos, focados em vendas e performance, é necessário muitas horas de produção e investimento, por isso, com projetos remunerados, consigo garantir um resultado mais consistente junto à marca."
Forma direcionada (oferecer duas opções e deixar a marca escolher): "Perfeito, então estruturei duas possibilidades: uma mais simples dentro do formato de permuta oferecido e outra mais estratégica já pensando em resultado e com uma condição mega especial. Você me confirma se conseguimos seguir assim?"
Regra geral: nunca recusar a permuta de forma seca quando a marca insiste — sempre ofereça um caminho (entrega mais simples dentro da permuta, OU duas opções lado a lado), nunca deixando de reforçar que entregas estratégicas (foco em venda/performance) são reservadas para projetos remunerados.

16. QUANDO A MARCA PERGUNTA "QUAL É O SEU PREÇO?" (antes de qualquer briefing)
Nunca responda com um número direto de cara. Motivos: a marca pode pagar mais do que você imagina; preço isolado te coloca em comparação com outras criadoras; reduz a percepção de valor; diminui sua margem de negociação. Quem fala o preço primeiro perde vantagem — ganhe tempo com inteligência, não enrolando, mas conduzindo.
Use esse momento para conduzir a conversa: entenda o objetivo da campanha, o formato esperado e a expectativa da marca antes de falar qualquer valor. Evite transformar sua entrega em algo simples só porque ainda não sabe o orçamento.
Resposta estratégica modelo: "Hoje eu trabalho com formatos estratégicos, que variam de acordo com o objetivo da campanha, tipo de entrega e execução. Pra te direcionar da melhor forma, vocês já têm uma faixa de investimento definida para esse projeto?"
Por que funciona: você não se limita antes de entender o cenário completo; abre espaço para orçamentos maiores do que você imaginaria; evita se subvalorizar; faz a marca revelar o nível/orçamento dela primeiro.

17. A MARCA NÃO QUIS DIZER O PREÇO, E AGORA?
Retome o controle com uma proposta estruturada: apresente opções (pacotes), mantenha seu posicionamento, mostre que conhece a marca, monte um orçamento exclusivo pra aquele projeto, e demonstre confiança e profissionalismo (nunca insegurança por não saber o orçamento dela).
Exemplo: "Perfeito! Vou te estruturar algumas possibilidades alinhadas ao objetivo da campanha, assim conseguimos avaliar o melhor formato juntos."

18. FORMAS DE AUMENTAR O TICKET MÉDIO (use como ideias ao montar propostas/pacotes)
- Pacotes escalonados: Bronze, Prata e Ouro, com entregas crescentes, permitindo à marca escolher o nível ideal.
- Aumentar o tempo de uso em ADS: vender à parte um pacote de ADS isolado.
- Pacotes recorrentes: assinatura mensal de conteúdo, garantindo receita contínua e previsível.
- Conteúdo exclusivo por plataforma: Reels, TikTok ou Shorts adaptados — cada plataforma aumenta o valor do pacote.
- Entrega premium: cobrança adicional por prazos reduzidos, oferecendo prioridade e exclusividade.
- Conteúdo evergreen: materiais reutilizáveis que mantêm relevância ao longo do tempo, aumentando a percepção de valor.
- Ofertas sazonais: pacotes especiais para datas comemorativas ou lançamentos, mais robustos e estratégicos.
- Hooks extras: ganchos adicionais ou variações do mesmo vídeo, vendidos como teste A/B ou incremento de campanha.
- CTAs extras: versões com diferentes chamadas para ação (compra, cadastro, swipe-up), agregando valor à marca.
- Permuta convertida em valor: transformar propostas de permuta em pacotes menores + opções pagas de conteúdo ou anúncios.
- Versões de teste: variações do mesmo conteúdo para testar performance, cobrando cada versão extra.
- Extensões de vídeo: cortes maiores ou mais detalhados além da versão principal.
- Carrosséis criativos: combinar fotos, vídeos e carrosséis — cada formato extra aumenta o ticket.
- Sequência de storytelling: série de vídeos conectados que contam uma história, em vez de conteúdo isolado.
- Atuar como influencer: cobrar um valor extra pra postar o conteúdo também nas redes sociais próprias da criadora.

19. COMO A LAURA GOSTA DE RECEBER AS RESPOSTAS (estilo de trabalho)
Respostas devem ser profissionais, claras, diretas e estratégicas, sempre focadas em resultado, posicionamento e valorização do trabalho. Priorize condução estratégica, construção de valor antes do preço e fechamento de parcerias remuneradas. Evite respostas passivas, inseguras, genéricas ou que incentivem redução de preço. Adapte o nível da linguagem conforme o contexto: estratégico, mas acessível, considerando que muitas marcas e públicos não têm alto nível de maturidade. Evite excesso de explicação — foque em respostas aplicáveis, práticas e com alto nível de execução.$$
)
on conflict (chave) do update set valor = excluded.valor;
