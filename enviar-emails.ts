// ============================================================
// Função "enviar-emails" (o carteiro)
// ============================================================
// Isto NÃO roda no site. Isto roda dentro do Supabase, como uma
// "Edge Function". Cole este arquivo inteiro no painel do Supabase,
// em Edge Functions > Create a new function > nome "enviar-emails".
//
// A chave do Resend (RESEND_API_KEY) é lida daqui:
//    Deno.env.get("RESEND_API_KEY")
// Ela NUNCA fica escrita neste arquivo. Você cola o valor dela
// separadamente, em Edge Functions > enviar-emails > Secrets,
// no painel do Supabase.
// ============================================================

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");

// Enquanto você não tiver um domínio verificado no Resend, os e-mails
// só chegam na sua própria caixa. Depois de verificar seu domínio,
// troque o segredo FROM_EMAIL (painel do Supabase) para algo como
// "Laura Oliveira <contato@seudominio.com>", sem precisar mexer neste código.
const FROM_EMAIL = Deno.env.get("FROM_EMAIL") || "Laura Oliveira <onboarding@resend.dev>";

// Só esta conta pode disparar e-mails por aqui.
const EMAIL_AUTORIZADO = "ugclauraoliveira@gmail.com";

const LIMITE_DESTINATARIOS_POR_CHAMADA = 250;
const PAUSA_ENTRE_ENVIOS_MS = 200; // cerca de 5 e-mails por segundo, ritmo seguro do Resend

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

function primeiroNome(nomeCompleto: string) {
  return (nomeCompleto || "").trim().split(/\s+/)[0] || "";
}

// Troca {{nome}} pelo primeiro nome da marca e {{marca}} pelo nome completo.
function aplicarVariaveis(texto: string, nomeMarca: string) {
  return (texto || "")
    .split("{{marca}}").join(nomeMarca || "")
    .split("{{nome}}").join(primeiroNome(nomeMarca));
}

function pausa(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
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
    return respostaJson({ erro: "Este envio só pode ser feito pela conta autorizada." }, 403);
  }

  if (!RESEND_API_KEY) {
    return respostaJson(
      { erro: "A chave do Resend ainda não foi configurada (segredo RESEND_API_KEY faltando)." },
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

  const destinatariosRecebidos = Array.isArray(corpoPedido.destinatarios) ? corpoPedido.destinatarios : [];
  const assunto = String(corpoPedido.assunto || "").trim();
  const corpoHtmlModelo = String(corpoPedido.corpoHtml || "");

  if (!assunto || !corpoHtmlModelo) {
    return respostaJson({ erro: "Faltou assunto ou o corpo do e-mail." }, 400);
  }
  if (destinatariosRecebidos.length === 0) {
    return respostaJson({ erro: "Nenhum destinatário foi enviado." }, 400);
  }
  if (destinatariosRecebidos.length > LIMITE_DESTINATARIOS_POR_CHAMADA) {
    return respostaJson(
      { erro: `No máximo ${LIMITE_DESTINATARIOS_POR_CHAMADA} destinatários por chamada.` },
      400,
    );
  }

  // Se duas marcas tiverem o mesmo e-mail (ex: mesma agência), manda uma vez só.
  const emailsVistos = new Set<string>();
  const listaLimpa: { email: string; nomeMarca: string }[] = [];
  for (const destinatario of destinatariosRecebidos) {
    const email = String(destinatario.email || "").trim().toLowerCase();
    if (!email || emailsVistos.has(email)) continue;
    emailsVistos.add(email);
    listaLimpa.push({ email, nomeMarca: String(destinatario.nomeMarca || destinatario.nome || "") });
  }

  // 3) Busca quem já pediu para sair da lista.
  const respostaOptout = await fetch(`${SUPABASE_URL}/rest/v1/email_optout?select=email`, {
    headers: {
      apikey: SUPABASE_SERVICE_ROLE_KEY,
      Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
    },
  });
  const listaOptout = respostaOptout.ok ? await respostaOptout.json() : [];
  const emailsDescadastrados = new Set(
    (listaOptout as { email: string }[]).map((linha) => linha.email.toLowerCase()),
  );

  let enviados = 0;
  let falharam = 0;
  let pulados = 0;
  let faltaram = 0;
  let cotaEsgotada = false;

  for (const destinatario of listaLimpa) {
    if (emailsDescadastrados.has(destinatario.email)) {
      pulados++;
      continue;
    }

    if (cotaEsgotada) {
      faltaram++;
      continue;
    }

    const assuntoFinal = aplicarVariaveis(assunto, destinatario.nomeMarca);
    const corpoFinal = aplicarVariaveis(corpoHtmlModelo, destinatario.nomeMarca);

    let sucesso = false;
    let mensagemErro = "";
    let resendId: string | null = null;

    try {
      const respostaResend = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${RESEND_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from: FROM_EMAIL,
          to: [destinatario.email],
          subject: assuntoFinal,
          html: corpoFinal,
          reply_to: EMAIL_AUTORIZADO,
          headers: {
            "List-Unsubscribe": `<mailto:${EMAIL_AUTORIZADO}?subject=SAIR>`,
          },
        }),
      });

      const dadosResend = await respostaResend.json().catch(() => ({}) as any);

      if (respostaResend.ok) {
        sucesso = true;
        resendId = dadosResend.id || null;
        enviados++;
      } else {
        mensagemErro = (dadosResend && (dadosResend.message || dadosResend.name)) || `Erro HTTP ${respostaResend.status}`;
        if (dadosResend && dadosResend.name === "daily_quota_exceeded") {
          cotaEsgotada = true;
        }
        falharam++;
      }
    } catch (erro) {
      mensagemErro = String(erro instanceof Error ? erro.message : erro);
      falharam++;
    }

    // Grava esta linha no histórico, tenha dado certo ou errado.
    await fetch(`${SUPABASE_URL}/rest/v1/email_envios`, {
      method: "POST",
      headers: {
        apikey: SUPABASE_SERVICE_ROLE_KEY,
        Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
        "Content-Type": "application/json",
        Prefer: "return=minimal",
      },
      body: JSON.stringify({
        email: destinatario.email,
        assunto: assuntoFinal,
        status: sucesso ? "ok" : "erro",
        erro: sucesso ? null : mensagemErro,
        resend_id: resendId,
      }),
    });

    if (sucesso) {
      // Marca na tabela "marcas" (não é a mesma coisa que "Último contato",
      // que é um campo manual seu; este aqui é só sobre e-mail de prospecção).
      await fetch(`${SUPABASE_URL}/rest/v1/marcas?email=eq.${encodeURIComponent(destinatario.email)}`, {
        method: "PATCH",
        headers: {
          apikey: SUPABASE_SERVICE_ROLE_KEY,
          Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
          "Content-Type": "application/json",
          Prefer: "return=minimal",
        },
        body: JSON.stringify({
          ultimo_envio_em: new Date().toISOString(),
          ultimo_envio_assunto: assuntoFinal,
        }),
      });
    }

    await pausa(PAUSA_ENTRE_ENVIOS_MS);
  }

  return respostaJson({ enviados, falharam, pulados, faltaram, cotaEsgotada });
});
