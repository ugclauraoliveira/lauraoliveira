/* =========================================================
   ADMIN-CAMPANHAS.JS
   Aba "Campanhas": os trabalhos fechados com as marcas, com
   o funil de status, avisos de prazo e ordenação em qualquer
   coluna.
========================================================= */

window.AdminCampanhas = (function () {

  const FUNIL_STATUS = ["Briefing", "Roteiro", "Aprovação Roteiro", "Gravação", "Edição", "Aprovado", "Entregue"];
  let campanhasCache = [];
  let filtroAtual = "todas";
  let termoBusca = "";
  let ordenacao = { coluna: null, direcao: "asc" };

  async function render(container) {
    container.innerHTML = `
      <div class="kpis" id="kpisCampanhas" style="grid-template-columns:repeat(4,1fr);">
        <div class="kpi"><span class="valor">–</span><span class="rotulo">campanhas</span></div>
        <div class="kpi"><span class="valor">–</span><span class="rotulo">ativas</span></div>
        <div class="kpi"><span class="valor">–</span><span class="rotulo">valor total<br><small style="font-size:.68rem;">ticket médio por vídeo: –</small></span></div>
        <div class="kpi"><span class="valor">–</span><span class="rotulo">a receber<br><small style="font-size:.68rem;">já recebido: –</small></span></div>
      </div>

      <div class="cartao">
        <div class="barra-filtros">
          <button class="chip-filtro ativo" data-filtro="todas">Todas</button>
          <button class="chip-filtro" data-filtro="ativas">Ativas</button>
          <button class="chip-filtro" data-filtro="finalizadas">Finalizadas</button>
          <div class="campo-busca">${ICONES.busca(16)}<input type="text" id="buscaCampanhas" placeholder="Buscar campanha ou cliente"></div>
          <div style="flex:1"></div>
          <button class="btn btn-secundario" id="botaoExportarCampanhas">${ICONES.baixar(16)} Baixar CSV</button>
          <button class="btn btn-primario" id="botaoNovaCampanha">${ICONES.mais(16)} Adicionar</button>
        </div>
        <div class="tabela-wrap" id="areaTabelaCampanhas"></div>
      </div>
    `;

    document.getElementById("botaoNovaCampanha").addEventListener("click", () => abrirFormularioCampanha(null));
    document.getElementById("botaoExportarCampanhas").addEventListener("click", exportar);
    document.getElementById("buscaCampanhas").addEventListener("input", (e) => { termoBusca = e.target.value.toLowerCase(); renderTabela(); });
    container.querySelectorAll(".chip-filtro").forEach(chip => {
      chip.addEventListener("click", () => {
        container.querySelectorAll(".chip-filtro").forEach(c => c.classList.remove("ativo"));
        chip.classList.add("ativo");
        filtroAtual = chip.dataset.filtro;
        renderTabela();
      });
    });

    const { data, error } = await window.banco.from("campanhas").select("*").order("criado_em", { ascending: false });
    if (error) avisoFaltando(container, "campanhas", error);
    campanhasCache = data || [];

    renderKpis();
    renderTabela();
  }

  function renderKpis() {
    const total = campanhasCache.length;
    const ativas = campanhasCache.filter(c => c.ativa).length;
    const valorTotal = campanhasCache.reduce((soma, c) => soma + Number(c.valor || 0), 0);
    const qtdTotal = campanhasCache.reduce((soma, c) => soma + Number(c.qtd || 0), 0);
    const ticketMedio = qtdTotal > 0 ? formatarMoeda(valorTotal / qtdTotal) : "—";
    const aReceber = campanhasCache.filter(c => c.pagamento === "pendente").reduce((s, c) => s + Number(c.valor || 0), 0);
    const jaRecebido = campanhasCache.filter(c => c.pagamento === "pago").reduce((s, c) => s + Number(c.valor || 0), 0);

    const kpis = document.querySelectorAll("#kpisCampanhas .kpi");
    kpis[0].querySelector(".valor").textContent = total;
    kpis[1].querySelector(".valor").textContent = ativas;
    kpis[2].querySelector(".valor").textContent = formatarMoeda(valorTotal);
    kpis[2].querySelector("small").textContent = `ticket médio por vídeo: ${ticketMedio}`;
    kpis[3].querySelector(".valor").textContent = formatarMoeda(aReceber);
    kpis[3].querySelector("small").textContent = `já recebido: ${formatarMoeda(jaRecebido)}`;
  }

  function listaFiltrada() {
    return campanhasCache.filter(c => {
      const passaFiltro = filtroAtual === "todas" || (filtroAtual === "ativas" ? c.ativa : !c.ativa);
      const alvo = `${c.campanha} ${c.cliente}`.toLowerCase();
      const passaBusca = !termoBusca || alvo.includes(termoBusca);
      return passaFiltro && passaBusca;
    });
  }

  function valorOrdenavel(c, coluna) {
    switch (coluna) {
      case "favorita": return c.favorita ? 1 : 0;
      case "status": return FUNIL_STATUS.indexOf(c.status);
      case "prazo": return c.prazo || "9999-99-99";
      case "valor": return Number(c.valor || 0);
      case "qtd": return Number(c.qtd || 0);
      default: return (c[coluna] || "").toString().toLowerCase();
    }
  }

  function renderTabela() {
    const area = document.getElementById("areaTabelaCampanhas");

    if (campanhasCache.length === 0) {
      area.innerHTML = `
        <table class="tabela-admin">
          <thead>${cabecalho()}</thead>
          <tbody>
            <tr class="linha-exemplo">
              <td>${ICONES.estrela(16)}</td>
              <td>Campanha exemplo <span class="selo-exemplo">exemplo</span></td>
              <td>Cliente Exemplo</td>
              <td><span class="pilula pilula-conteudo">Conteúdo</span></td>
              <td><span class="pilula pilula-etapa">Briefing</span></td>
              <td>1</td>
              <td>${formatarMoeda(0)}</td>
              <td>${formatarData(dataDeHoje())}</td>
              <td>Pendente</td>
            </tr>
          </tbody>
        </table>
        <p class="vazio-explicativo">Essa é uma linha de exemplo. Apague quando cadastrar suas campanhas reais.</p>`;
      return;
    }

    let lista = listaFiltrada();
    if (ordenacao.coluna) {
      lista = [...lista].sort((a, b) => {
        const va = valorOrdenavel(a, ordenacao.coluna);
        const vb = valorOrdenavel(b, ordenacao.coluna);
        const cmp = va < vb ? -1 : va > vb ? 1 : 0;
        return ordenacao.direcao === "asc" ? cmp : -cmp;
      });
    }

    if (lista.length === 0) {
      area.innerHTML = `<table class="tabela-admin"><thead>${cabecalho()}</thead></table><p class="vazio-explicativo">Nenhuma campanha encontrada com esse filtro ou busca.</p>`;
      ativarCabecalho();
      return;
    }

    area.innerHTML = `<table class="tabela-admin">
      <thead>${cabecalho()}</thead>
      <tbody>${lista.map(linhaCampanha).join("")}</tbody>
    </table>`;

    ativarCabecalho();

    area.querySelectorAll("[data-favoritar]").forEach(botao => {
      botao.addEventListener("click", async (evento) => {
        evento.stopPropagation();
        const c = campanhasCache.find(x => x.id === botao.dataset.favoritar);
        const { error } = await window.banco.from("campanhas").update({ favorita: !c.favorita }).eq("id", c.id);
        if (error) { mostrarToast("Não consegui atualizar", "erro"); return; }
        render(document.getElementById("conteudoAba"));
      });
    });
    area.querySelectorAll("tr[data-id]").forEach(linha => {
      linha.addEventListener("click", (evento) => {
        if (evento.target.closest("[data-favoritar]")) return;
        const c = campanhasCache.find(x => x.id === linha.dataset.id);
        if (c) abrirFormularioCampanha(c);
      });
    });
  }

  function cabecalho() {
    const colunas = [
      { chave: "favorita", rotulo: "" },
      { chave: "campanha", rotulo: "Campanha" },
      { chave: "cliente", rotulo: "Cliente" },
      { chave: "tipo", rotulo: "Tipo" },
      { chave: "status", rotulo: "Status" },
      { chave: "qtd", rotulo: "Qtd" },
      { chave: "valor", rotulo: "Valor" },
      { chave: "prazo", rotulo: "Prazo" },
      { chave: "pagamento", rotulo: "Pagamento" },
    ];
    return `<tr>${colunas.map(c => {
      if (!c.rotulo) return `<th></th>`;
      const ativa = ordenacao.coluna === c.chave;
      const seta = ativa ? (ordenacao.direcao === "asc" ? ICONES.setaCima(13) : ICONES.setaBaixo(13)) : ICONES.ordenar(13);
      return `<th class="ordenavel ${ativa ? "ativa" : ""}" data-coluna="${c.chave}">${c.rotulo}<span class="seta-ordenar">${seta}</span></th>`;
    }).join("")}</tr>`;
  }

  function ativarCabecalho() {
    document.querySelectorAll("#areaTabelaCampanhas th.ordenavel").forEach(th => {
      th.addEventListener("click", () => {
        if (ordenacao.coluna === th.dataset.coluna) {
          ordenacao.direcao = ordenacao.direcao === "asc" ? "desc" : "asc";
        } else {
          ordenacao = { coluna: th.dataset.coluna, direcao: "asc" };
        }
        renderTabela();
      });
    });
  }

  function linhaCampanha(c) {
    const hojeStr = dataDeHoje();
    let etiquetaPrazo = "";
    if (c.prazo && c.status !== "Entregue") {
      if (c.prazo < hojeStr) etiquetaPrazo = `<span class="etiqueta-prazo etiqueta-atrasado">atrasado há ${diasEntre(c.prazo)} dia(s)</span>`;
      else if (diasEntre(c.prazo) >= -3 && diasEntre(c.prazo) <= 0) etiquetaPrazo = `<span class="etiqueta-prazo etiqueta-proximo">vence em ${Math.abs(diasEntre(c.prazo))} dia(s)</span>`;
    }
    return `
      <tr data-id="${c.id}" class="${c.favorita ? "linha-favorita" : ""}" style="cursor:pointer;">
        <td><button class="btn-icone" data-favoritar="${c.id}" style="color:${c.favorita ? "var(--terracota)" : "var(--tinta-suave)"};">${ICONES.estrela(16)}</button></td>
        <td>${escapeHtml(c.campanha)}</td>
        <td>${escapeHtml(c.cliente)}</td>
        <td><span class="pilula ${c.tipo === "Publicidade" ? "pilula-publicidade" : "pilula-conteudo"}">${escapeHtml(c.tipo)}</span></td>
        <td><span class="pilula pilula-etapa">${escapeHtml(c.status)}</span></td>
        <td>${c.qtd}</td>
        <td>${formatarMoeda(c.valor)}</td>
        <td>${formatarData(c.prazo)} ${etiquetaPrazo}</td>
        <td>${c.pagamento === "pago" ? "Pago" : "Pendente"}</td>
      </tr>`;
  }

  function abrirFormularioCampanha(campanha) {
    const editando = !!campanha;
    abrirModalAdmin(editando ? "Editar campanha" : "Adicionar campanha", `
      <form id="formularioCampanha">
        <div class="campo-admin">
          <label for="campoNomeCampanha">Campanha</label>
          <input id="campoNomeCampanha" required value="${attrEsc(campanha?.campanha || "")}">
        </div>
        <div class="campo-admin">
          <label for="campoClienteCampanha">Cliente</label>
          <input id="campoClienteCampanha" value="${attrEsc(campanha?.cliente || "")}">
        </div>
        <div class="linha-campos">
          <div class="campo-admin">
            <label for="campoTipoCampanha">Tipo</label>
            <select id="campoTipoCampanha">
              <option value="Conteúdo" ${(!campanha || campanha.tipo === "Conteúdo") ? "selected" : ""}>Conteúdo</option>
              <option value="Publicidade" ${campanha?.tipo === "Publicidade" ? "selected" : ""}>Publicidade</option>
            </select>
          </div>
          <div class="campo-admin">
            <label for="campoStatusCampanha">Status</label>
            <select id="campoStatusCampanha">
              ${FUNIL_STATUS.map(s => `<option value="${s}" ${(campanha ? campanha.status === s : s === "Briefing") ? "selected" : ""}>${s}</option>`).join("")}
            </select>
          </div>
        </div>
        <div class="linha-campos">
          <div class="campo-admin">
            <label for="campoQtdCampanha">Quantidade de vídeos</label>
            <input id="campoQtdCampanha" type="number" min="1" value="${campanha?.qtd ?? 1}">
          </div>
          <div class="campo-admin">
            <label for="campoValorCampanha">Valor total (R$)</label>
            <input id="campoValorCampanha" type="number" min="0" step="0.01" value="${campanha?.valor ?? 0}">
          </div>
        </div>
        <div class="linha-campos">
          <div class="campo-admin">
            <label for="campoPrazoCampanha">Prazo</label>
            <input id="campoPrazoCampanha" type="date" value="${campanha?.prazo || ""}">
          </div>
          <div class="campo-admin">
            <label for="campoPagamentoCampanha">Pagamento</label>
            <select id="campoPagamentoCampanha">
              <option value="pendente" ${(!campanha || campanha.pagamento === "pendente") ? "selected" : ""}>Pendente</option>
              <option value="pago" ${campanha?.pagamento === "pago" ? "selected" : ""}>Pago</option>
            </select>
          </div>
        </div>
        <div class="linha-campos">
          <div class="campo-admin" style="flex-direction:row; align-items:center; gap:8px;">
            <input type="checkbox" id="campoAtivaCampanha" style="width:16px;height:16px;" ${(!campanha || campanha.ativa) ? "checked" : ""}>
            <label for="campoAtivaCampanha" style="margin:0;">Ativa</label>
          </div>
          <div class="campo-admin" style="flex-direction:row; align-items:center; gap:8px;">
            <input type="checkbox" id="campoFavoritaCampanha" style="width:16px;height:16px;" ${campanha?.favorita ? "checked" : ""}>
            <label for="campoFavoritaCampanha" style="margin:0;">Destacar com estrela</label>
          </div>
        </div>
        <div class="linha-botoes-modal">
          ${editando ? `<button type="button" class="btn btn-perigo" id="botaoApagarCampanha">${ICONES.lixeira(16)} Apagar</button>` : ""}
          <button type="submit" class="btn btn-primario">${editando ? "Salvar" : "Adicionar"}</button>
        </div>
      </form>
    `);

    if (editando) {
      document.getElementById("botaoApagarCampanha").addEventListener("click", async () => {
        if (!confirm("Apagar esta campanha?")) return;
        const { error } = await window.banco.from("campanhas").delete().eq("id", campanha.id);
        if (error) { mostrarToast("Não consegui apagar", "erro"); return; }
        fecharModalAdmin();
        mostrarToast("Campanha apagada");
        render(document.getElementById("conteudoAba"));
      });
    }

    document.getElementById("formularioCampanha").addEventListener("submit", async (evento) => {
      evento.preventDefault();
      const dados = {
        campanha: document.getElementById("campoNomeCampanha").value.trim(),
        cliente: document.getElementById("campoClienteCampanha").value.trim(),
        tipo: document.getElementById("campoTipoCampanha").value,
        status: document.getElementById("campoStatusCampanha").value,
        qtd: Number(document.getElementById("campoQtdCampanha").value) || 1,
        valor: Number(document.getElementById("campoValorCampanha").value) || 0,
        prazo: document.getElementById("campoPrazoCampanha").value || null,
        pagamento: document.getElementById("campoPagamentoCampanha").value,
        ativa: document.getElementById("campoAtivaCampanha").checked,
        favorita: document.getElementById("campoFavoritaCampanha").checked,
      };
      const resultado = editando
        ? await window.banco.from("campanhas").update(dados).eq("id", campanha.id)
        : await window.banco.from("campanhas").insert(dados);

      if (resultado.error) { mostrarToast("Não consegui salvar: " + resultado.error.message, "erro"); return; }
      fecharModalAdmin();
      mostrarToast(editando ? "Campanha atualizada" : "Campanha adicionada");
      render(document.getElementById("conteudoAba"));
    });
  }

  function exportar() {
    const lista = listaFiltrada();
    if (lista.length === 0) { mostrarToast("Não há campanhas para exportar", "erro"); return; }
    exportarCsv(
      "campanhas.csv",
      ["Campanha", "Cliente", "Tipo", "Status", "Qtd", "Valor", "Prazo", "Pagamento", "Ativa"],
      lista.map(c => [c.campanha, c.cliente, c.tipo, c.status, c.qtd, formatarMoeda(c.valor), formatarData(c.prazo), c.pagamento, c.ativa ? "sim" : "não"])
    );
  }

  return { render };
})();
