/* =========================================================
   ADMIN-FINANCEIRO.JS
   Aba "Financeiro": seus lançamentos (recebido / a receber),
   navegação por mês, meta mensal editável e um gráfico simples
   comparando os últimos meses.
========================================================= */

window.AdminFinanceiro = (function () {

  const NOMES_MES = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];
  const NOMES_MES_CURTO = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];
  const CHAVE_META = "meta_mensal";

  let lancamentosCache = [];
  let metaMensal = 0;
  let mesAtual = primeiroDiaDoMes(new Date());

  function $(id) { return document.getElementById(id); }
  function primeiroDiaDoMes(data) { return new Date(data.getFullYear(), data.getMonth(), 1); }
  function anoMesDe(data) { return `${data.getFullYear()}-${String(data.getMonth() + 1).padStart(2, "0")}`; }

  async function render(container) {
    container.innerHTML = `
      <div class="cartao">
        <div class="calendario-topo">
          <h2 style="margin:0;">Meta e resumo do mês</h2>
          <div style="display:flex; align-items:center; gap:8px;">
            <button class="btn btn-icone" id="mesAnteriorFin">${ICONES.esquerda(18)}</button>
            <span class="calendario-mes-atual" id="rotuloMesFin"></span>
            <button class="btn btn-icone" id="mesSeguinteFin">${ICONES.direita(18)}</button>
            <button class="btn btn-secundario" id="botaoEsteMesFin">Este mês</button>
          </div>
        </div>

        <div class="kpis" style="grid-template-columns:repeat(3,1fr); margin-top:16px;">
          <div class="kpi"><span class="valor" id="kpiRecebidoFin">—</span><span class="rotulo">recebido no mês</span></div>
          <div class="kpi"><span class="valor" id="kpiAReceberFin">—</span><span class="rotulo">a receber no mês</span></div>
          <div class="kpi"><span class="valor" id="kpiPrevistoFin">—</span><span class="rotulo">previsto no mês</span></div>
        </div>

        <div style="margin-top:18px;">
          <div style="display:flex; align-items:center; gap:10px; margin-bottom:6px;">
            <strong style="font-size:.85rem;">Meta mensal</strong>
            <span id="textoMetaFin" style="font-size:.82rem; color:var(--tinta-suave);"></span>
            <button class="btn-icone" id="botaoEditarMetaFin" title="Editar meta">${ICONES.lapis(16)}</button>
          </div>
          <div class="barra-progresso" style="width:100%;"><div id="barraMetaFin" style="width:0%;"></div></div>
        </div>
      </div>

      <div class="cartao">
        <h2>Comparando os meses</h2>
        <div id="areaGraficoFin"></div>
      </div>

      <div class="cartao">
        <div class="barra-filtros">
          <h2 style="flex:1;">Lançamentos do mês</h2>
          <button class="btn btn-primario" id="botaoNovoLancamentoFin">${ICONES.mais(16)} Adicionar</button>
        </div>
        <div class="tabela-wrap" id="areaListaFin"></div>
      </div>
    `;

    ligarEventos();

    const [lancamentosResultado, configResultado] = await Promise.all([
      window.banco.from("lancamentos").select("*").order("vencimento", { ascending: true }),
      window.banco.from("configuracoes").select("*").eq("chave", CHAVE_META),
    ]);

    if (lancamentosResultado.error) avisoFaltando(container, "lancamentos (rode o adicionar-financeiro.sql)", lancamentosResultado.error);
    if (configResultado.error) avisoFaltando(container, "configuracoes (rode o adicionar-financeiro.sql)", configResultado.error);

    lancamentosCache = lancamentosResultado.data || [];
    metaMensal = Number((configResultado.data || [])[0]?.valor) || 0;

    renderTudo();
  }

  function ligarEventos() {
    $("mesAnteriorFin").addEventListener("click", () => { mesAtual = new Date(mesAtual.getFullYear(), mesAtual.getMonth() - 1, 1); renderTudo(); });
    $("mesSeguinteFin").addEventListener("click", () => { mesAtual = new Date(mesAtual.getFullYear(), mesAtual.getMonth() + 1, 1); renderTudo(); });
    $("botaoEsteMesFin").addEventListener("click", () => { mesAtual = primeiroDiaDoMes(new Date()); renderTudo(); });
    $("botaoEditarMetaFin").addEventListener("click", abrirEditarMeta);
    $("botaoNovoLancamentoFin").addEventListener("click", () => abrirFormularioLancamento(null));
  }

  function renderTudo() {
    $("rotuloMesFin").textContent = `${NOMES_MES[mesAtual.getMonth()]} de ${mesAtual.getFullYear()}`;
    renderKpisEMeta();
    renderGrafico();
    renderLista();
  }

  function lancamentosDoMes(data) {
    const alvo = anoMesDe(data);
    return lancamentosCache.filter((l) => (l.vencimento || "").slice(0, 7) === alvo);
  }

  function renderKpisEMeta() {
    const doMes = lancamentosDoMes(mesAtual);
    const recebido = doMes.filter((l) => l.status === "pago").reduce((s, l) => s + Number(l.valor || 0), 0);
    const aReceber = doMes.filter((l) => l.status !== "pago").reduce((s, l) => s + Number(l.valor || 0), 0);
    const previsto = recebido + aReceber;

    $("kpiRecebidoFin").textContent = formatarMoeda(recebido);
    $("kpiAReceberFin").textContent = formatarMoeda(aReceber);
    $("kpiPrevistoFin").textContent = formatarMoeda(previsto);

    if (metaMensal > 0) {
      const perc = Math.min(100, Math.round((recebido / metaMensal) * 100));
      $("barraMetaFin").style.width = perc + "%";
      $("textoMetaFin").textContent = `${formatarMoeda(recebido)} de ${formatarMoeda(metaMensal)} (${perc}%)`;
    } else {
      $("barraMetaFin").style.width = "0%";
      $("textoMetaFin").textContent = "Ainda sem meta definida, clique no lápis pra criar uma.";
    }
  }

  async function abrirEditarMeta() {
    abrirModalAdmin("Meta mensal", `
      <form id="formularioMetaFin">
        <div class="campo-admin">
          <label for="campoMetaFin">Quanto você quer faturar por mês (R$)</label>
          <input id="campoMetaFin" type="number" min="0" step="0.01" value="${metaMensal || ""}">
        </div>
        <button type="submit" class="btn btn-primario">Salvar</button>
      </form>
    `);
    $("formularioMetaFin").addEventListener("submit", async (evento) => {
      evento.preventDefault();
      const novoValor = Number($("campoMetaFin").value) || 0;
      const { error } = await window.banco.from("configuracoes").upsert({ chave: CHAVE_META, valor: String(novoValor) });
      if (error) { mostrarToast("Não consegui salvar: " + error.message, "erro"); return; }
      metaMensal = novoValor;
      fecharModalAdmin();
      mostrarToast("Meta atualizada");
      renderKpisEMeta();
    });
  }

  function renderGrafico() {
    const area = $("areaGraficoFin");
    if (lancamentosCache.length === 0) {
      area.innerHTML = `<p class="vazio-explicativo">Quando você tiver lançamentos, aqui vai aparecer um gráfico comparando o recebido no ano.</p>`;
      return;
    }

    const ano = mesAtual.getFullYear();
    const meses = [];
    for (let m = 0; m < 12; m++) meses.push(new Date(ano, m, 1));

    const totais = meses.map((m) => lancamentosDoMes(m).filter((l) => l.status === "pago").reduce((s, l) => s + Number(l.valor || 0), 0));
    const maximo = Math.max(1, ...totais);

    area.innerHTML = `
      <p class="vazio-explicativo" style="text-align:left; padding:0 0 10px;">Ano de ${ano} (o mesmo ano que você está navegando lá em cima)</p>
      <div class="grafico-barras">
        ${meses.map((m, i) => {
          const altura = Math.max(2, Math.round((totais[i] / maximo) * 100));
          return `<div class="barra-dia" title="${formatarMoeda(totais[i])} em ${NOMES_MES[m.getMonth()]}">
            <div class="barra" style="height:${altura}%"></div>
            <span class="rotulo-dia">${NOMES_MES_CURTO[m.getMonth()]}</span>
          </div>`;
        }).join("")}
      </div>`;
  }

  function renderLista() {
    const area = $("areaListaFin");
    const doMes = lancamentosDoMes(mesAtual).sort((a, b) => a.vencimento.localeCompare(b.vencimento));

    if (lancamentosCache.length === 0) {
      area.innerHTML = `
        <table class="tabela-admin">
          <thead><tr><th>Cliente</th><th>Descrição</th><th>Valor</th><th>Vencimento</th><th>Status</th><th>Pagamento</th><th></th></tr></thead>
          <tbody>
            <tr class="linha-exemplo">
              <td>Cliente Exemplo <span class="selo-exemplo">exemplo</span></td>
              <td>Vídeo UGC</td>
              <td>${formatarMoeda(500)}</td>
              <td>${formatarData(dataDeHoje())}</td>
              <td><span class="pilula pilula-conversando">A receber</span></td>
              <td>Pix</td>
              <td></td>
            </tr>
          </tbody>
        </table>
        <p class="vazio-explicativo">Essa é uma linha de exemplo. Apague quando cadastrar seus lançamentos de verdade.</p>`;
      return;
    }

    if (doMes.length === 0) {
      area.innerHTML = `<p class="vazio-explicativo">Nenhum lançamento neste mês.</p>`;
      return;
    }

    const hojeStr = dataDeHoje();
    area.innerHTML = `
      <table class="tabela-admin">
        <thead><tr><th>Cliente</th><th>Descrição</th><th>Valor</th><th>Vencimento</th><th>Status</th><th>Pagamento</th><th></th></tr></thead>
        <tbody>
          ${doMes.map((l) => {
            const atrasado = l.status !== "pago" && l.vencimento < hojeStr;
            let pilula = `<span class="pilula pilula-conversando">A receber</span>`;
            if (l.status === "pago") pilula = `<span class="pilula pilula-cliente">Pago</span>`;
            else if (atrasado) pilula = `<span class="pilula pilula-parada">Atrasado</span>`;
            return `
              <tr data-id="${l.id}" style="cursor:pointer;">
                <td>${escapeHtml(l.cliente)}</td>
                <td>${escapeHtml(l.descricao)}${l.parcela_rotulo ? ` <span style="color:var(--tinta-suave); font-size:.78rem;">(${escapeHtml(l.parcela_rotulo)})</span>` : ""}</td>
                <td>${formatarMoeda(l.valor)}</td>
                <td>${formatarData(l.vencimento)}</td>
                <td>${pilula}</td>
                <td>${escapeHtml(l.forma_pagamento)}</td>
                <td class="celula-acoes">
                  ${l.status !== "pago" ? `<button class="btn-icone" data-marcar-pago="${l.id}" title="Marcar como pago">${ICONES.checklist(16)}</button>` : ""}
                </td>
              </tr>`;
          }).join("")}
        </tbody>
      </table>`;

    area.querySelectorAll("tr[data-id]").forEach((linha) => {
      linha.addEventListener("click", (evento) => {
        if (evento.target.closest("[data-marcar-pago]")) return;
        const l = lancamentosCache.find((x) => x.id === linha.dataset.id);
        if (l) abrirFormularioLancamento(l);
      });
    });
    area.querySelectorAll("[data-marcar-pago]").forEach((botao) => {
      botao.addEventListener("click", (evento) => { evento.stopPropagation(); marcarComoPago(botao.dataset.marcarPago); });
    });
  }

  async function marcarComoPago(id) {
    const { error } = await window.banco.from("lancamentos").update({ status: "pago" }).eq("id", id);
    if (error) { mostrarToast("Não consegui salvar", "erro"); return; }
    const l = lancamentosCache.find((x) => x.id === id);
    if (l) l.status = "pago";
    mostrarToast("Marcado como pago");
    renderTudo();
  }

  /* ---------- ADICIONAR / EDITAR LANÇAMENTO ---------- */

  function abrirFormularioLancamento(lancamento) {
    const editando = !!lancamento;
    abrirModalAdmin(editando ? "Editar lançamento" : "Novo lançamento", `
      <form id="formularioLancamentoFin">
        <div class="campo-admin">
          <label for="campoClienteFin">Cliente ou marca</label>
          <input id="campoClienteFin" required value="${attrEsc(lancamento?.cliente || "")}">
        </div>
        <div class="campo-admin">
          <label for="campoDescricaoFin">Descrição</label>
          <input id="campoDescricaoFin" value="${attrEsc(lancamento?.descricao || "")}" placeholder="Ex: Vídeo UGC">
        </div>
        <div class="linha-campos">
          <div class="campo-admin">
            <label for="campoValorFin">Valor total (R$)</label>
            <input id="campoValorFin" type="number" min="0" step="0.01" value="${lancamento?.valor ?? 0}">
          </div>
          <div class="campo-admin">
            <label for="campoVencimentoFin">${editando ? "Vencimento" : "Vencimento da 1ª parcela"}</label>
            <input id="campoVencimentoFin" type="date" required value="${lancamento?.vencimento || dataDeHoje()}">
          </div>
        </div>
        ${!editando ? `
        <div class="campo-admin">
          <label for="campoParcelasFin">Parcelar em quantas vezes? (cada parcela vira um lançamento, 30 dias de diferença uma da outra)</label>
          <input id="campoParcelasFin" type="number" min="1" value="1">
        </div>` : ""}
        <div class="linha-campos">
          <div class="campo-admin">
            <label for="campoFormaPagamentoFin">Forma de pagamento</label>
            <input id="campoFormaPagamentoFin" value="${attrEsc(lancamento?.forma_pagamento || "")}" placeholder="Ex: Pix">
          </div>
          <div class="campo-admin">
            <label for="campoStatusFin">Status</label>
            <select id="campoStatusFin">
              <option value="a receber" ${(!lancamento || lancamento.status !== "pago") ? "selected" : ""}>A receber</option>
              <option value="pago" ${lancamento?.status === "pago" ? "selected" : ""}>Pago</option>
            </select>
          </div>
        </div>
        <div class="linha-botoes-modal">
          ${editando ? `<button type="button" class="btn btn-perigo" id="botaoApagarLancamentoFin">${ICONES.lixeira(16)} Apagar</button>` : ""}
          <button type="submit" class="btn btn-primario">${editando ? "Salvar" : "Adicionar"}</button>
        </div>
      </form>
    `);

    if (editando) {
      $("botaoApagarLancamentoFin").addEventListener("click", async () => {
        if (!confirm("Apagar este lançamento?")) return;
        const { error } = await window.banco.from("lancamentos").delete().eq("id", lancamento.id);
        if (error) { mostrarToast("Não consegui apagar", "erro"); return; }
        lancamentosCache = lancamentosCache.filter((x) => x.id !== lancamento.id);
        fecharModalAdmin();
        mostrarToast("Lançamento apagado");
        renderTudo();
      });
    }

    $("formularioLancamentoFin").addEventListener("submit", async (evento) => {
      evento.preventDefault();
      const cliente = $("campoClienteFin").value.trim();
      const descricao = $("campoDescricaoFin").value.trim();
      const valorTotal = Number($("campoValorFin").value) || 0;
      const vencimentoInicial = $("campoVencimentoFin").value;
      const formaPagamento = $("campoFormaPagamentoFin").value.trim();

      if (editando) {
        const dados = {
          cliente, descricao, valor: valorTotal, vencimento: vencimentoInicial,
          forma_pagamento: formaPagamento, status: $("campoStatusFin").value,
        };
        const { error } = await window.banco.from("lancamentos").update(dados).eq("id", lancamento.id);
        if (error) { mostrarToast("Não consegui salvar: " + error.message, "erro"); return; }
        Object.assign(lancamento, dados);
        fecharModalAdmin();
        mostrarToast("Lançamento atualizado");
        renderTudo();
        return;
      }

      const status = $("campoStatusFin").value;
      const parcelas = Math.max(1, Number($("campoParcelasFin").value) || 1);
      const linhas = [];
      const valorParcela = Math.floor((valorTotal / parcelas) * 100) / 100;
      for (let i = 0; i < parcelas; i++) {
        const data = new Date(vencimentoInicial + "T00:00:00");
        data.setDate(data.getDate() + i * 30);
        const valorDesta = i === parcelas - 1 ? Math.round((valorTotal - valorParcela * (parcelas - 1)) * 100) / 100 : valorParcela;
        linhas.push({
          cliente, descricao, valor: valorDesta,
          vencimento: data.toISOString().slice(0, 10),
          forma_pagamento: formaPagamento,
          status,
          parcela_rotulo: parcelas > 1 ? `Parcela ${i + 1}/${parcelas}` : "",
        });
      }

      const { error } = await window.banco.from("lancamentos").insert(linhas);
      if (error) { mostrarToast("Não consegui salvar: " + error.message, "erro"); return; }
      fecharModalAdmin();
      mostrarToast(parcelas > 1 ? `${parcelas} parcelas adicionadas` : "Lançamento adicionado");

      const { data } = await window.banco.from("lancamentos").select("*").order("vencimento", { ascending: true });
      lancamentosCache = data || [];
      renderTudo();
    });
  }

  // Chamado pela aba Propostas quando uma proposta é marcada como "aceita".
  async function criarLancamentoDeProposta(proposta) {
    const dados = {
      cliente: proposta.cliente_nome,
      descricao: `Proposta aceita`,
      valor: proposta.total,
      vencimento: dataDeHoje(),
      forma_pagamento: proposta.formas_pagamento || "",
      status: "a receber",
      proposta_id: proposta.id,
    };
    return window.banco.from("lancamentos").insert(dados);
  }

  return { render, criarLancamentoDeProposta };
})();
