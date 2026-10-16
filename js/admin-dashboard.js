/* =========================================================
   ADMIN-DASHBOARD.JS
   Aba "Dashboard": visão geral do negócio, com cards que vão
   sendo preenchidos conforme as próximas etapas (Propostas,
   Financeiro, Instagram) forem construídas. Os Lembretes e o
   card de Campanhas já funcionam de verdade, usando dados que
   já existem no banco.
========================================================= */

window.AdminDashboard = (function () {

  const CHAVE_OCULTAR_VALORES = "painelOcultarValoresFinanceiros";

  let campanhasCache = [];
  let lembretesCache = [];
  let propostasCache = [];
  let lancamentosCache = [];
  let metaMensal = 0;
  let instagramMetricasCache = [];
  let ideiasCache = [];

  function $(id) { return document.getElementById(id); }

  function valoresEstaoOcultos() {
    return localStorage.getItem(CHAVE_OCULTAR_VALORES) === "1";
  }

  async function render(container) {
    container.innerHTML = `
      <div class="atalhos-dashboard">
        <button type="button" class="btn btn-primario" id="botaoNovoLembreteDash">${ICONES.mais(16)} Lembrete</button>
        <button type="button" class="btn btn-secundario" id="botaoNovaIdeiaDash">${ICONES.mais(16)} Ideia</button>
        <button type="button" class="btn btn-secundario" id="botaoNovaPropostaDash">${ICONES.mais(16)} Proposta</button>
        <button type="button" class="btn btn-secundario botao-ocultar-valores" id="botaoOcultarValoresDash" title="Mostrar ou esconder valores financeiros">${ICONES.olhoAberto(18)}</button>
      </div>

      <div class="grade-cartoes-metrica" id="gradeCartoesDash"></div>

      <div class="cartao">
        <div class="barra-filtros" style="margin-bottom:0;">
          <h2 style="flex:1; margin:0;">Lembretes</h2>
          <button class="btn btn-secundario" id="botaoNotificacoesDash"></button>
        </div>
        <div id="areaLembretesDash"></div>
      </div>
    `;

    $("botaoNovoLembreteDash").addEventListener("click", () => abrirFormularioLembrete(null));
    $("botaoNovaIdeiaDash").addEventListener("click", () => window.AdminInstagram.abrirNovaIdeia(() => render(container)));
    $("botaoNovaPropostaDash").addEventListener("click", () => irParaAba("propostas"));
    $("botaoOcultarValoresDash").addEventListener("click", alternarOcultarValores);
    atualizarIconeOcultar();
    atualizarBotaoNotificacoes();

    const [campanhasResultado, lembretesResultado, propostasResultado, lancamentosResultado, configResultado, instagramResultado, ideiasResultado] = await Promise.all([
      window.banco.from("campanhas").select("*"),
      window.banco.from("lembretes").select("*").order("data", { ascending: true }),
      window.banco.from("propostas").select("status"),
      window.banco.from("lancamentos").select("*"),
      window.banco.from("configuracoes").select("*").eq("chave", "meta_mensal"),
      window.banco.from("instagram_metricas").select("*").order("data", { ascending: false }).limit(2),
      window.banco.from("ideias_conteudo").select("status"),
    ]);

    if (campanhasResultado.error) avisoFaltando(container, "campanhas", campanhasResultado.error);
    if (lembretesResultado.error) avisoFaltando(container, "lembretes (rode o adicionar-lembretes.sql no Supabase)", lembretesResultado.error);
    // propostas, lancamentos, instagram_metricas e ideias_conteudo ainda podem
    // não existir (rode os SQL das etapas de Propostas, Financeiro e
    // Instagram); sem aviso aqui pra não poluir o Dashboard, os cards
    // simplesmente mostram um traço.

    campanhasCache = campanhasResultado.data || [];
    lembretesCache = lembretesResultado.data || [];
    propostasCache = propostasResultado.data || [];
    lancamentosCache = lancamentosResultado.data || [];
    metaMensal = Number((configResultado.data || [])[0]?.valor) || 0;
    instagramMetricasCache = instagramResultado.data || [];
    ideiasCache = ideiasResultado.data || [];

    renderCards();
    renderLembretes();
    verificarNotificacoes();
  }

  function alternarOcultarValores() {
    localStorage.setItem(CHAVE_OCULTAR_VALORES, valoresEstaoOcultos() ? "0" : "1");
    atualizarIconeOcultar();
    renderCards();
  }

  function atualizarIconeOcultar() {
    const botao = $("botaoOcultarValoresDash");
    if (!botao) return;
    botao.innerHTML = valoresEstaoOcultos() ? ICONES.olhoFechado(18) : ICONES.olhoAberto(18);
  }

  function textoValor(valorFormatado) {
    return valoresEstaoOcultos() ? "R$ ••••" : valorFormatado;
  }

  /* ---------- CARDS ---------- */

  function renderCards() {
    const hojeStr = dataDeHoje();
    const em7dias = new Date(); em7dias.setDate(em7dias.getDate() + 7);
    const em7diasStr = em7dias.toISOString().slice(0, 10);

    const emProducao = campanhasCache.filter((c) => c.ativa && c.status !== "Entregue").length;
    const entregasSemana = campanhasCache.filter((c) => c.prazo && c.prazo >= hojeStr && c.prazo <= em7diasStr && c.status !== "Entregue").length;

    const anoMesAtual = hojeStr.slice(0, 7);
    const lancamentosDoMes = lancamentosCache.filter((l) => (l.vencimento || "").slice(0, 7) === anoMesAtual);
    const faturadoMes = lancamentosDoMes.filter((l) => l.status === "pago").reduce((s, l) => s + Number(l.valor || 0), 0);
    const aReceberTotal = lancamentosCache.filter((l) => l.status !== "pago").reduce((s, l) => s + Number(l.valor || 0), 0);
    const percMeta = metaMensal > 0 ? Math.min(100, Math.round((faturadoMes / metaMensal) * 100)) : 0;

    const cartoes = [
      lancamentosCache.length === 0
        ? { cor: "var(--terracota)", numero: textoValor("—"), rotulo: "faturado no mês", pendente: true,
            extra: `<div class="barra-progresso"><div style="width:0%;"></div></div><div class="contexto">Cadastre lançamentos na aba Financeiro</div>` }
        : { cor: "var(--terracota)", numero: textoValor(formatarMoeda(faturadoMes)), rotulo: "faturado no mês",
            extra: `<div class="barra-progresso"><div style="width:${percMeta}%;"></div></div><div class="contexto">${metaMensal > 0 ? `${percMeta}% da meta de ${textoValor(formatarMoeda(metaMensal))}` : "Defina sua meta na aba Financeiro"}</div>` },
      lancamentosCache.length === 0
        ? { cor: "var(--amarelo-texto)", numero: textoValor("—"), rotulo: "a receber", pendente: true, contexto: "Aparece quando o Financeiro estiver pronto" }
        : { cor: "var(--amarelo-texto)", numero: textoValor(formatarMoeda(aReceberTotal)), rotulo: "a receber", contexto: "Somando todos os meses" },
      {
        cor: "var(--oliva)", numero: String(emProducao), rotulo: "em produção",
        contexto: campanhasCache.length ? `${entregasSemana} entrega(s) nesta semana` : "Cadastre campanhas na aba Campanhas",
      },
      propostasCache.length === 0
        ? { cor: "var(--azul-suave)", numero: "—", rotulo: "propostas enviadas", pendente: true, contexto: "Crie a primeira na aba Propostas" }
        : { cor: "var(--azul-suave)", numero: String(propostasCache.filter((p) => p.status === "enviada").length), rotulo: "aguardando resposta",
            contexto: `${propostasCache.filter((p) => p.status === "aceita").length} aceita(s) · ${propostasCache.filter((p) => p.status === "recusada").length} recusada(s)` },
      instagramMetricasCache.length === 0
        ? { cor: "var(--vermelho-suave)", numero: "—", rotulo: "resumo do Instagram", pendente: true, contexto: "Registre seus números na aba Instagram" }
        : (() => {
            const [atual, anterior] = instagramMetricasCache;
            const diferenca = anterior ? atual.seguidores - anterior.seguidores : null;
            const contexto = diferenca === null
              ? `Último registro: ${formatarData(atual.data)}`
              : `${diferenca >= 0 ? "+" : ""}${diferenca} desde ${formatarData(anterior.data)}`;
            return { cor: "var(--vermelho-suave)", numero: String(atual.seguidores), rotulo: "seguidores no Instagram", contexto };
          })(),
      ideiasCache.length === 0
        ? { cor: "var(--terracota-escuro)", numero: "—", rotulo: "ideias em andamento", pendente: true, contexto: "Adicione ideias na aba Instagram" }
        : { cor: "var(--terracota-escuro)", numero: String(ideiasCache.filter((i) => i.status !== "publicado").length), rotulo: "ideias em andamento",
            contexto: `${ideiasCache.filter((i) => i.status === "publicado").length} publicada(s)` },
    ];

    $("gradeCartoesDash").innerHTML = cartoes.map((c) => `
      <div class="cartao-metrica ${c.pendente ? "pendente" : ""}" style="--tarja:${c.cor};">
        <div class="numero">${c.numero}</div>
        <div class="rotulo">${escapeHtml(c.rotulo)}</div>
        ${c.contexto ? `<div class="contexto">${escapeHtml(c.contexto)}</div>` : ""}
        ${c.extra || ""}
      </div>
    `).join("");
  }

  /* ---------- LEMBRETES ---------- */

  function corPrioridade(prioridade) {
    if (prioridade === "alta") return "var(--terracota)";
    if (prioridade === "baixa") return "var(--oliva)";
    return "var(--amarelo-texto)";
  }

  function renderLembretes() {
    const area = $("areaLembretesDash");
    const hojeStr = dataDeHoje();
    const em7dias = new Date(); em7dias.setDate(em7dias.getDate() + 7);
    const em7diasStr = em7dias.toISOString().slice(0, 10);

    // Concluído fica visível, só riscado (não some da lista) — só sai mudando
    // a data ou apagando.
    const atrasados = lembretesCache.filter((l) => !l.concluido && l.data < hojeStr);
    const deHoje = lembretesCache.filter((l) => l.data === hojeStr);
    const proximos = lembretesCache.filter((l) => l.data > hojeStr && l.data <= em7diasStr);

    if (lembretesCache.length === 0) {
      area.innerHTML = `<p class="vazio-explicativo">Nenhum lembrete ainda. Use o botão "+ Lembrete" acima pra criar o primeiro.</p>`;
      return;
    }

    function listaHtml(lista) {
      if (lista.length === 0) return `<p class="vazio-explicativo" style="text-align:left; padding:4px 0;">Nada por aqui.</p>`;
      return lista.map((l) => `
        <div class="item-lembrete ${l.concluido ? "concluido" : ""}" data-id="${l.id}">
          <input type="checkbox" data-concluir="${l.id}" ${l.concluido ? "checked" : ""}>
          <span class="pino-prioridade" style="background:${corPrioridade(l.prioridade)};"></span>
          <span class="texto-lembrete" data-editar="${l.id}">
            <strong>${escapeHtml(l.titulo)}</strong>
            <span class="meta-lembrete">
              ${formatarData(l.data)}${l.hora ? " · " + l.hora.slice(0, 5) : ""}${l.vinculo ? " · " + escapeHtml(l.vinculo) : ""}
              ${(!l.concluido && l.data < hojeStr) ? `<span class="etiqueta-prazo etiqueta-atrasado">há ${diasEntre(l.data)} dia(s)</span>` : ""}
            </span>
          </span>
        </div>
      `).join("");
    }

    area.innerHTML = `
      <div class="lista-lembretes-dashboard">
        ${atrasados.length ? `<h3>Ficou pra trás</h3>${listaHtml(atrasados)}` : ""}
        <h3>Hoje</h3>
        ${listaHtml(deHoje)}
        <h3>Próximos 7 dias</h3>
        ${listaHtml(proximos)}
      </div>
    `;

    area.querySelectorAll("[data-concluir]").forEach((input) => {
      input.addEventListener("change", () => marcarLembreteConcluido(input.dataset.concluir, input.checked));
    });
    area.querySelectorAll("[data-editar]").forEach((span) => {
      span.addEventListener("click", () => {
        const lembrete = lembretesCache.find((l) => l.id === span.dataset.editar);
        if (lembrete) abrirFormularioLembrete(lembrete);
      });
    });
  }

  async function marcarLembreteConcluido(id, valor) {
    const lembrete = lembretesCache.find((l) => l.id === id);
    if (lembrete) lembrete.concluido = valor;
    renderLembretes();
    const { error } = await window.banco.from("lembretes").update({ concluido: valor }).eq("id", id);
    if (error) mostrarToast("Não consegui salvar", "erro");
  }

  function abrirFormularioLembrete(lembrete) {
    const editando = !!lembrete;
    abrirModalAdmin(editando ? "Editar lembrete" : "Novo lembrete", `
      <form id="formularioLembreteDash">
        <div class="campo-admin">
          <label for="campoTituloLembrete">Título</label>
          <input id="campoTituloLembrete" required value="${attrEsc(lembrete?.titulo || "")}">
        </div>
        <div class="linha-campos">
          <div class="campo-admin">
            <label for="campoDataLembrete">Data</label>
            <input id="campoDataLembrete" type="date" required value="${lembrete?.data || dataDeHoje()}">
          </div>
          <div class="campo-admin">
            <label for="campoHoraLembrete">Hora (opcional)</label>
            <input id="campoHoraLembrete" type="time" value="${lembrete?.hora ? lembrete.hora.slice(0, 5) : ""}">
          </div>
        </div>
        <div class="campo-admin">
          <label for="campoVinculoLembrete">Cliente ou campanha (opcional)</label>
          <input id="campoVinculoLembrete" value="${attrEsc(lembrete?.vinculo || "")}">
        </div>
        <div class="campo-admin">
          <label for="campoPrioridadeLembrete">Prioridade</label>
          <select id="campoPrioridadeLembrete">
            <option value="baixa" ${lembrete?.prioridade === "baixa" ? "selected" : ""}>Baixa</option>
            <option value="normal" ${(!lembrete || lembrete.prioridade === "normal") ? "selected" : ""}>Normal</option>
            <option value="alta" ${lembrete?.prioridade === "alta" ? "selected" : ""}>Alta</option>
          </select>
        </div>
        <div class="linha-botoes-modal">
          ${editando ? `<button type="button" class="btn btn-perigo" id="botaoApagarLembreteDash">${ICONES.lixeira(16)} Apagar</button>` : ""}
          <button type="submit" class="btn btn-primario">${editando ? "Salvar" : "Adicionar"}</button>
        </div>
      </form>
    `);

    if (editando) {
      $("botaoApagarLembreteDash").addEventListener("click", async () => {
        if (!confirm("Apagar este lembrete?")) return;
        const { error } = await window.banco.from("lembretes").delete().eq("id", lembrete.id);
        if (error) { mostrarToast("Não consegui apagar", "erro"); return; }
        fecharModalAdmin();
        mostrarToast("Lembrete apagado");
        render(document.getElementById("conteudoAba"));
      });
    }

    $("formularioLembreteDash").addEventListener("submit", async (evento) => {
      evento.preventDefault();
      const dados = {
        titulo: $("campoTituloLembrete").value.trim(),
        data: $("campoDataLembrete").value,
        hora: $("campoHoraLembrete").value || null,
        vinculo: $("campoVinculoLembrete").value.trim(),
        prioridade: $("campoPrioridadeLembrete").value,
      };
      const resultado = editando
        ? await window.banco.from("lembretes").update(dados).eq("id", lembrete.id)
        : await window.banco.from("lembretes").insert(dados);

      if (resultado.error) { mostrarToast("Não consegui salvar: " + resultado.error.message, "erro"); return; }
      fecharModalAdmin();
      mostrarToast(editando ? "Lembrete atualizado" : "Lembrete adicionado");
      render(document.getElementById("conteudoAba"));
    });
  }

  /* ---------- NOTIFICAÇÃO DE LEMBRETES ----------
     Duas camadas:
     1) Push de verdade: ao ativar, o navegador cria uma "assinatura"
        (Service Worker + PushManager) que é salva no Supabase. De 15 em
        15 minutos, uma função lá do Supabase confere os lembretes e manda
        a notificação direto pro celular, mesmo com o site/navegador
        fechados.
     2) Aviso local (verificarNotificacoes, mais abaixo): continua existindo
        como complemento — se você estiver com o admin aberto, avisa na
        hora, sem esperar o ciclo de 15 minutos. */

  const CHAVE_NOTIFICADOS_HOJE = "painelLembretesNotificadosHoje";

  // Chave pública VAPID: segura para ficar aqui no código (é pública por
  // natureza, como a chave do Supabase em js/banco.js). A privada nunca
  // fica no site — só como segredo da função enviar-notificacoes.
  const VAPID_CHAVE_PUBLICA = "BD_Pv9e_ktkD0RT4wJF8HAXAx3MiBU1ntlqhqk3quLBgQzbb72dCuYiSsxQCKMNFGQOwLGUhsHn3bnCDhLJa4YI";

  function notificacoesSuportadas() {
    return typeof Notification !== "undefined";
  }

  function pushSuportado() {
    return "serviceWorker" in navigator && "PushManager" in window;
  }

  function urlBase64ParaUint8Array(base64String) {
    const preenchimento = "=".repeat((4 - (base64String.length % 4)) % 4);
    const base64 = (base64String + preenchimento).replace(/-/g, "+").replace(/_/g, "/");
    const bruto = window.atob(base64);
    const saida = new Uint8Array(bruto.length);
    for (let i = 0; i < bruto.length; i++) saida[i] = bruto.charCodeAt(i);
    return saida;
  }

  async function registrarServiceWorker() {
    if (!pushSuportado()) return null;
    try {
      return await navigator.serviceWorker.register("../sw.js");
    } catch (e) {
      return null;
    }
  }

  async function assinaturaAtual() {
    const registro = await registrarServiceWorker();
    if (!registro) return null;
    return registro.pushManager.getSubscription();
  }

  async function atualizarBotaoNotificacoes() {
    const botao = $("botaoNotificacoesDash");
    if (!botao) return;
    if (!notificacoesSuportadas()) { botao.style.display = "none"; return; }

    if (Notification.permission === "denied") {
      botao.textContent = "Notificações bloqueadas pelo navegador";
      botao.disabled = true;
      return;
    }

    if (pushSuportado() && Notification.permission === "granted") {
      const assinatura = await assinaturaAtual();
      if (assinatura) {
        botao.textContent = "Notificações ativadas no celular";
        botao.disabled = true;
        return;
      }
    }

    botao.textContent = "Ativar notificações no celular";
    botao.disabled = false;
    botao.onclick = ativarNotificacoesPush;
  }

  async function ativarNotificacoesPush() {
    const botao = $("botaoNotificacoesDash");
    if (botao) { botao.disabled = true; botao.textContent = "Ativando..."; }

    try {
      const permissao = await Notification.requestPermission();
      if (permissao !== "granted") {
        mostrarToast("Sem permissão do navegador, não vai dar pra te avisar.", "erro");
        return;
      }

      if (pushSuportado()) {
        const registro = await registrarServiceWorker();
        if (!registro) {
          mostrarToast("Não consegui preparar as notificações neste navegador.", "erro");
          return;
        }

        let assinatura = await registro.pushManager.getSubscription();
        if (!assinatura) {
          assinatura = await registro.pushManager.subscribe({
            userVisibleOnly: true,
            applicationServerKey: urlBase64ParaUint8Array(VAPID_CHAVE_PUBLICA),
          });
        }

        const dados = assinatura.toJSON();
        const { error } = await window.banco.from("push_subscriptions").upsert(
          { endpoint: dados.endpoint, p256dh: dados.keys.p256dh, auth: dados.keys.auth },
          { onConflict: "endpoint" },
        );

        if (error) {
          mostrarToast("Permissão ativada, mas faltou rodar o adicionar-notificacoes-push.sql no Supabase.", "erro");
        } else {
          mostrarToast("Notificações ativadas! Agora chegam até no celular, mesmo com o site fechado.");
        }
      } else {
        mostrarToast("Esse navegador só avisa enquanto o site está aberto.");
      }
    } catch (e) {
      mostrarToast("Não consegui ativar as notificações.", "erro");
    } finally {
      atualizarBotaoNotificacoes();
      verificarNotificacoes();
    }
  }

  function notificadosHoje() {
    try {
      const salvo = JSON.parse(localStorage.getItem(CHAVE_NOTIFICADOS_HOJE) || "{}");
      if (salvo.data !== dataDeHoje()) return new Set();
      return new Set(salvo.ids || []);
    } catch (e) {
      return new Set();
    }
  }

  function salvarNotificadosHoje(conjunto) {
    localStorage.setItem(CHAVE_NOTIFICADOS_HOJE, JSON.stringify({ data: dataDeHoje(), ids: [...conjunto] }));
  }

  function verificarNotificacoes() {
    if (!notificacoesSuportadas() || Notification.permission !== "granted") return;

    const hojeStr = dataDeHoje();
    const jaNotificados = notificadosHoje();
    const pendentes = lembretesCache.filter((l) => !l.concluido && l.data <= hojeStr && !jaNotificados.has(l.id));

    pendentes.forEach((l) => {
      try {
        new Notification(l.data < hojeStr ? `Atrasado: ${l.titulo}` : `Lembrete de hoje: ${l.titulo}`, {
          body: l.vinculo ? `Ligado a ${l.vinculo}` : "Sem mais detalhes",
        });
      } catch (e) { /* alguns navegadores de celular não deixam criar assim; ignora sem quebrar nada */ }
      jaNotificados.add(l.id);
    });

    if (pendentes.length) salvarNotificadosHoje(jaNotificados);
  }

  return { render };
})();
