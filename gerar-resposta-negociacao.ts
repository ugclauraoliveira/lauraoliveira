// ============================================================
// Função "gerar-resposta-negociacao" (a consultora de negociação)
// ============================================================
// Isto NÃO roda no site. Isto roda dentro do Supabase, como uma
// "Edge Function". Cole este arquivo inteiro no painel do Supabase,
// em Edge Functions > Create a new function > nome
// "gerar-resposta-negociacao".
//
// A chave do Gemini (GEMINI_API_KEY) é lida daqui:
//    Deno.env.get("GEMINI_API_KEY")
// Ela NUNCA fica escrita neste arquivo. Você cola o valor dela
// separadamente, em Edge Functions > gerar-resposta-negociacao >
// Secrets, no painel do Supabase. É grátis: você gera essa chave em
// aistudio.google.com, sem precisar cadastrar cartão de crédito.
//
// O "manual de negociação" (o que a IA aprende a seguir) fica
// guardado na tabela configuracoes, chave "negociacao_material" —
// veja o arquivo adicionar-negociacao.sql. Quando Laura mandar mais
// aulas, esse texto é atualizado por lá, sem precisar mexer aqui.
// ============================================================

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY");

const EMAIL_AUTORIZADO = "ugclauraoliveira@gmail.com";

const CABECALHOS_CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function respostaJson(corpo: unknown, status = 200) {
  return new Response(JSON.stringify(corpo), {
    status,
    headers: { ...CABECALHOS_CORS, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: CABECALHOS_CORS });
  }
  if (req.method !== "POST") {
    return respostaJson({ erro: "Método não permitido." }, 405);
  }

  // 1) Só aceita quem estiver logada como a Laura.
  const cabecalhoAuth = req.headers.get("Authorization") || "";
  const token = cabecalhoAuth.replace("Bearer ", "").trim();
  if (!token) {
    return respostaJson({ erro: "Não autenticado." }, 401);
  }

  const respostaUsuario = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
    headers: { Authorization: `Bearer ${token}`, apikey: SUPABASE_ANON_KEY },
  });
  if (!respostaUsuario.ok) {
    return respostaJson({ erro: "Sessão inválida, faça login de novo." }, 401);
  }
  const usuario = await respostaUsuario.json();
  if (usuario.email !== EMAIL_AUTORIZADO) {
    return respostaJson({ erro: "Só a conta autorizada pode gerar respostas." }, 403);
  }

  if (!GEMINI_API_KEY) {
    return respostaJson(
      { erro: "A chave do Gemini ainda não foi configurada (segredo GEMINI_API_KEY faltando)." },
      500,
    );
  }

  // 2) Lê o que foi pedido.
  let corpoPedido: any;
  try {
    corpoPedido = await req.json();
  } catch {
    return respostaJson({ erro: "Corpo do pedido inválido." }, 400);
  }

  const marca = String(corpoPedido.marca || "").trim();
  const mensagemTexto = String(corpoPedido.mensagem || "").trim();
  const imagemBase64 = corpoPedido.imagemBase64 ? String(corpoPedido.imagemBase64) : null;
  const imagemMimeType = corpoPedido.imagemMimeType ? String(corpoPedido.imagemMimeType) : null;

  if (!mensagemTexto && !imagemBase64) {
    return respostaJson({ erro: "Cole o texto da marca ou envie um print." }, 400);
  }

  // 3) Busca o manual de negociação guardado em configuracoes.
  const respostaConfig = await fetch(
    `${SUPABASE_URL}/rest/v1/configuracoes?select=valor&chave=eq.negociacao_material`,
    { headers: { apikey: SUPABASE_SERVICE_ROLE_KEY, Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}` } },
  );
  const configData = respostaConfig.ok ? await respostaConfig.json() : [];
  const manual = (configData[0] && configData[0].valor) || "";

  if (!manual) {
    return respostaJson(
      { erro: "O manual de negociação ainda não foi cadastrado (rode o adicionar-negociacao.sql)." },
      500,
    );
  }

  // 4) Monta o pedido para a IA (Gemini).
  const instrucoes = `Você é uma assistente de negociação para Laura Oliveira, criadora de conteúdo (UGC). Uma marca mandou uma mensagem durante uma negociação de parceria/publicidade, e você precisa sugerir a MELHOR resposta que Laura pode mandar de volta, seguindo à risca o manual de negociação abaixo (ensinado em cursos que ela fez, incluindo como ela mesma gosta de usar IA pra isso). Responda sempre em português do Brasil, na primeira pessoa (como se fosse a própria Laura escrevendo). Priorize condução estratégica, construção de valor antes do preço e fechamento de parcerias remuneradas. Evite respostas passivas, inseguras, genéricas ou que incentivem redução de preço. Use as "frases mágicas" do manual em vez das frases proibidas. Evite excesso de explicação — foque em respostas aplicáveis e práticas.

Gere SEMPRE 3 variações da resposta, pra Laura escolher a que preferir:
- "direta": mais curta e objetiva, direto ao ponto.
- "amigavel": mais calorosa, com emojis quando fizer sentido, mantendo o profissionalismo.
- "firme": mais segura de si, sustentando o posicionamento sem abrir mão de valor.
As 3 variações devem ser respostas completas e prontas pra copiar e enviar, só mudando o tom — nunca mude o conteúdo estratégico da resposta (os números, as condições, os próximos passos têm que ser consistentes entre as 3).

Devolva SOMENTE um JSON válido, neste formato exato, sem nenhum texto antes ou depois, sem markdown:
{"direta": "...", "amigavel": "...", "firme": "..."}

MANUAL DE NEGOCIAÇÃO:
${manual}`;

  const partes: any[] = [{ text: `${instrucoes}\n\n---\nMarca envolvida: ${marca || "não informada"}\nMensagem recebida da marca:\n${mensagemTexto || "(o texto da mensagem está na imagem anexada)"}` }];

  if (imagemBase64 && imagemMimeType) {
    partes.push({ inline_data: { mime_type: imagemMimeType, data: imagemBase64 } });
  }

  let variacoes: { direta?: string; amigavel?: string; firme?: string } = {};
  try {
    const respostaGemini = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_API_KEY}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ role: "user", parts: partes }],
          generationConfig: { responseMimeType: "application/json" },
        }),
      },
    );
    const dadosGemini = await respostaGemini.json().catch(() => ({}) as any);
    if (!respostaGemini.ok) {
      const mensagemErro = (dadosGemini && dadosGemini.error && dadosGemini.error.message) || `Erro HTTP ${respostaGemini.status}`;
      return respostaJson({ erro: `Falha ao consultar a IA: ${mensagemErro}` }, 502);
    }
    const textoBruto = dadosGemini?.candidates?.[0]?.content?.parts?.map((p: any) => p.text || "").join("") || "";
    variacoes = JSON.parse(textoBruto);
  } catch (erro) {
    return respostaJson({ erro: "Não consegui falar com a IA: " + String(erro instanceof Error ? erro.message : erro) }, 502);
  }

  if (!variacoes.direta && !variacoes.amigavel && !variacoes.firme) {
    return respostaJson({ erro: "A IA não devolveu nenhuma resposta. Tente de novo." }, 502);
  }

  // 5) Grava no histórico (não trava a resposta se der erro aqui).
  await fetch(`${SUPABASE_URL}/rest/v1/negociacoes_historico`, {
    method: "POST",
    headers: {
      apikey: SUPABASE_SERVICE_ROLE_KEY,
      Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
      "Content-Type": "application/json",
      Prefer: "return=minimal",
    },
    body: JSON.stringify({
      marca,
      mensagem_recebida: mensagemTexto || "[enviado como print]",
      resposta_sugerida: JSON.stringify(variacoes),
    }),
  }).catch(() => {});

  return respostaJson({ variacoes });
});
