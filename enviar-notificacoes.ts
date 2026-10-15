// ============================================================
// Função "enviar-notificacoes" (quem avisa seu celular)
// ============================================================
// Isto NÃO roda no site. Isto roda dentro do Supabase, como uma
// "Edge Function". Cole este arquivo inteiro no painel do Supabase,
// em Edge Functions > Create a new function > nome "enviar-notificacoes".
//
// Diferente da "enviar-emails", esta função não é chamada por você
// clicando em um botão: ela é chamada sozinha, a cada 15 minutos, pelo
// agendamento (pg_cron) criado no arquivo adicionar-notificacoes-push.sql.
// Por isso ela não confere login de usuária — ela só olha os lembretes
// e manda notificação pros celulares que você já cadastrou.
//
// As chaves VAPID (que provam pro Google/Apple que é você quem está
// mandando a notificação) são lidas daqui:
//    Deno.env.get("VAPID_PUBLIC_KEY") e Deno.env.get("VAPID_PRIVATE_KEY")
// A privada NUNCA fica escrita neste arquivo. Você cola os dois valores
// separadamente, em Edge Functions > enviar-notificacoes > Secrets,
// no painel do Supabase.
// ============================================================

import webpush from "npm:web-push@3.6.7";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const VAPID_PUBLIC_KEY = Deno.env.get("VAPID_PUBLIC_KEY");
const VAPID_PRIVATE_KEY = Deno.env.get("VAPID_PRIVATE_KEY");

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

const CABECALHOS_SERVICO = {
  apikey: SUPABASE_SERVICE_ROLE_KEY,
  Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
  "Content-Type": "application/json",
};

// Hoje, no fuso de Laura (horário de Brasília), pra decidir "já é hora".
function dataHoraDeBrasilia() {
  const agora = new Date();
  const comOffset = new Date(agora.getTime() - 3 * 60 * 60 * 1000);
  const dataStr = comOffset.toISOString().slice(0, 10);
  const horaStr = comOffset.toISOString().slice(11, 16);
  return { dataStr, horaStr };
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: CABECALHOS_CORS });
  }

  if (!VAPID_PUBLIC_KEY || !VAPID_PRIVATE_KEY) {
    return respostaJson(
      { erro: "Chaves VAPID ainda não configuradas (segredos VAPID_PUBLIC_KEY / VAPID_PRIVATE_KEY faltando)." },
      500,
    );
  }

  webpush.setVapidDetails("mailto:ugclauraoliveira@gmail.com", VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);

  const { dataStr: hojeStr, horaStr: horaAgora } = dataHoraDeBrasilia();

  // 1) Busca lembretes pendentes, não concluídos, já vencidos ou de hoje,
  //    que ainda não foram avisados por notificação push.
  const respostaLembretes = await fetch(
    `${SUPABASE_URL}/rest/v1/lembretes?select=*&concluido=eq.false&notificado_push_em=is.null&data=lte.${hojeStr}`,
    { headers: CABECALHOS_SERVICO },
  );

  if (!respostaLembretes.ok) {
    return respostaJson({ erro: "Não consegui ler os lembretes." }, 500);
  }

  const lembretes = (await respostaLembretes.json()) as any[];

  // Se o lembrete é de hoje e tem hora marcada, só avisa quando a hora chegar.
  // Lembretes de dias anteriores (atrasados) ou sem hora marcada avisam direto.
  const pendentes = lembretes.filter((l) => {
    if (l.data < hojeStr) return true;
    if (!l.hora) return true;
    return String(l.hora).slice(0, 5) <= horaAgora;
  });

  if (pendentes.length === 0) {
    return respostaJson({ enviados: 0 });
  }

  // 2) Busca os celulares/navegadores cadastrados.
  const respostaAssinaturas = await fetch(`${SUPABASE_URL}/rest/v1/push_subscriptions?select=*`, {
    headers: CABECALHOS_SERVICO,
  });
  const assinaturas = respostaAssinaturas.ok ? ((await respostaAssinaturas.json()) as any[]) : [];

  let enviados = 0;

  for (const lembrete of pendentes) {
    const atrasado = lembrete.data < hojeStr;
    const payload = JSON.stringify({
      titulo: atrasado ? `Atrasado: ${lembrete.titulo}` : `Lembrete de hoje: ${lembrete.titulo}`,
      corpo: lembrete.vinculo ? `Ligado a ${lembrete.vinculo}` : "Sem mais detalhes",
    });

    for (const assinatura of assinaturas) {
      try {
        await webpush.sendNotification(
          { endpoint: assinatura.endpoint, keys: { p256dh: assinatura.p256dh, auth: assinatura.auth } },
          payload,
        );
        enviados++;
      } catch (erro: any) {
        // Assinatura expirada ou cancelada pelo próprio navegador: apaga, não tenta de novo.
        if (erro && (erro.statusCode === 404 || erro.statusCode === 410)) {
          await fetch(`${SUPABASE_URL}/rest/v1/push_subscriptions?id=eq.${assinatura.id}`, {
            method: "DELETE",
            headers: CABECALHOS_SERVICO,
          });
        }
      }
    }

    // Marca este lembrete como já avisado, pra não repetir a cada 15 minutos.
    await fetch(`${SUPABASE_URL}/rest/v1/lembretes?id=eq.${lembrete.id}`, {
      method: "PATCH",
      headers: { ...CABECALHOS_SERVICO, Prefer: "return=minimal" },
      body: JSON.stringify({ notificado_push_em: new Date().toISOString() }),
    });
  }

  return respostaJson({ enviados });
});
