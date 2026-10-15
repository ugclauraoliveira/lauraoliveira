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
        <h2>Lembretes</h2>
        <div id="areaLembretesDash"></div>
      </div>
    `;

    $("botaoNovoLembreteDash").addEventListener("click", () => abrirFormularioLembrete(null));
    $("botaoNovaIdeiaDash").addEventListener("click", () => mostrarToast("As ideias de conteúdo chegam na etapa do Instagram"));
    $("botaoNovaPropostaDash").addEventListener("click", () => irParaAba("propostas"));
    $("botaoOcultarValoresDash").addEventListener("click", alternarOcultarValores);
    atualizarIconeOcultar();

    const [campanhasResultado, lembretesResultado, propostasResultado, lancamentosResultado, configResultado] = await Promise.all([
      window.banco.from("campanhas").select("*"),
      window.banco.from("lembretes").select("*").order("data", { ascending: true }),
      window.banco.from("propostas").select("status"),
      window.banco.from("lancamentos").select("*"),
      window.banco.from("configuracoes").select("*").eq("chave", "meta_mensal"),
    ]);

    if (campanhasResultado.error) avisoFaltando(container, "campanhas", campanhasResultado.error);
    if (lembretesResultado.error) avisoFaltando(container, "lembretes (rode o adicionar-lembretes.sql no Supabase)", lembretesResultado.error);
    // propostas e lancamentos ainda podem não existir (rode os SQL das etapas
    // de Propostas e Financeiro); sem aviso aqui pra não poluir o Dashboard,
    // os cards simplesmente mostram um traço.

    campanhasCache = campanhasResultado.data || [];
    lembretesCache = lembretesResultado.data || [];
    propostasCache = propostasResultado.data || [];
    lancamentosCache = lancamentosResultado.data || [];
    metaMensal = Number((configResultado.data || [])[0]?.valor) || 0;

    renderCards();
    renderLembretes();
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
      {
        cor: "var(--vermelho-suave)", numero: "—", rotulo: "resumo do Instagram", pendente: true,
        contexto: "Aparece quando o Instagram estiver pronto",
      },
      {
        cor: "var(--terracota-escuro)", numero: "—", rotulo: "ideias em andamento", pendente: true,
        contexto: "Aparece quando o Instagram estiver pronto",
      },
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
            <span class="meta-lembrete">${formatarData(l.data)}${l.hora ? " · " + l.hora.slice(0, 5) : ""}${l.vinculo ? " · " + escapeHtml(l.vinculo) : ""}</span>
          </span>
        </div>
      `).join("");
    }

    area.innerHTML = `
      <div class="lista-lembretes-dashboard">
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

  return { render };
})();
