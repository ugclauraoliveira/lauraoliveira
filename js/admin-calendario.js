/* =========================================================
   ADMIN-CALENDARIO.JS
   Aba "Calendário": visão do mês inteiro (segunda a domingo),
   com os prazos das campanhas puxados automaticamente, e o
   bloco "Ficou pra trás" com o que passou e não foi feito.
========================================================= */

window.AdminCalendario = (function () {

  const NOMES_MES = ["Janeiro","Fevereiro","Março","Abril","Maio","Junho","Julho","Agosto","Setembro","Outubro","Novembro","Dezembro"];
  const DIAS_SEMANA = ["Seg","Ter","Qua","Qui","Sex","Sáb","Dom"];

  let mesAtual = primeiroDiaDoMes(new Date());
  let filtroTipo = "todos";
  let itensCache = {};
  let calendarioCache = [];

  function primeiroDiaDoMes(data) {
    return new Date(data.getFullYear(), data.getMonth(), 1);
  }

  async function render(container) {
    container.innerHTML = `
      <div class="cartao">
        <div class="calendario-topo">
          <div class="barra-filtros" style="margin:0;">
            <button class="chip-filtro ativo" data-tipo="todos">Todos</button>
            <button class="chip-filtro" data-tipo="gravar">Gravar</button>
            <button class="chip-filtro" data-tipo="editar">Editar</button>
            <button class="chip-filtro" data-tipo="postar">Postar</button>
          </div>
          <div style="display:flex; align-items:center; gap:8px;">
            <button class="btn btn-icone" id="mesAnterior">${ICONES.esquerda(18)}</button>
            <span class="calendario-mes-atual" id="rotuloMes"></span>
            <button class="btn btn-icone" id="mesSeguinte">${ICONES.direita(18)}</button>
            <button class="btn btn-secundario" id="botaoEsteMes">Este mês</button>
          </div>
        </div>
        <div class="grade-semana">${DIAS_SEMANA.map(d => `<span>${d}</span>`).join("")}</div>
        <div class="grade-mes" id="grideMes"></div>
      </div>

      <div class="cartao">
        <h2>Ficou pra trás</h2>
        <div id="areaAtrasados"></div>
      </div>
    `;

    container.querySelectorAll(".chip-filtro").forEach(chip => {
      chip.addEventListener("click", () => {
        container.querySelectorAll(".chip-filtro").forEach(c => c.classList.remove("ativo"));
        chip.classList.add("ativo");
        filtroTipo = chip.dataset.tipo;
        renderGrade();
      });
    });
    document.getElementById("mesAnterior").addEventListener("click", () => { mesAtual = new Date(mesAtual.getFullYear(), mesAtual.getMonth() - 1, 1); renderGrade(); });
    document.getElementById("mesSeguinte").addEventListener("click", () => { mesAtual = new Date(mesAtual.getFullYear(), mesAtual.getMonth() + 1, 1); renderGrade(); });
    document.getElementById("botaoEsteMes").addEventListener("click", () => { mesAtual = primeiroDiaDoMes(new Date()); renderGrade(); });

    const [calendarioResultado, campanhasResultado] = await Promise.all([
      window.banco.from("calendario").select("*").order("data", { ascending: true }),
      window.banco.from("campanhas").select("id, campanha, prazo").not("prazo", "is", null),
    ]);

    if (calendarioResultado.error) avisoFaltando(container, "calendario", calendarioResultado.error);
    if (campanhasResultado.error) avisoFaltando(container, "campanhas", campanhasResultado.error);

    calendarioCache = calendarioResultado.data || [];
    const prazos = campanhasResultado.data || [];

    itensCache = {};
    calendarioCache.forEach(item => {
      const data = String(item.data).slice(0, 10);
      (itensCache[data] = itensCache[data] || []).push({ tipo: item.tipo, titulo: item.titulo, status: item.status, id: item.id, marca: item.marca, origem: "calendario" });
    });
    prazos.forEach(campanha => {
      const data = String(campanha.prazo).slice(0, 10);
      (itensCache[data] = itensCache[data] || []).push({ tipo: "prazo", titulo: `Prazo: ${campanha.campanha}`, origem: "campanha" });
    });

    renderGrade();
    renderAtrasados();
  }

  function renderGrade() {
    document.getElementById("rotuloMes").textContent = `${NOMES_MES[mesAtual.getMonth()]} de ${mesAtual.getFullYear()}`;

    const primeiroDia = new Date(mesAtual);
    const offsetSegunda = (primeiroDia.getDay() + 6) % 7;
    const inicioGrade = new Date(primeiroDia); inicioGrade.setDate(inicioGrade.getDate() - offsetSegunda);

    const hojeStr = new Date().toISOString().slice(0, 10);
    const grade = document.getElementById("grideMes");
    let html = "";

    for (let i = 0; i < 42; i++) {
      const dia = new Date(inicioGrade); dia.setDate(dia.getDate() + i);
      const diaStr = dia.toISOString().slice(0, 10);
      const foraDoMes = dia.getMonth() !== mesAtual.getMonth();
      const ehHoje = diaStr === hojeStr;

      const itensDoDia = (itensCache[diaStr] || []).filter(it => it.tipo === "prazo" || filtroTipo === "todos" || it.tipo === filtroTipo);
      const visiveis = itensDoDia.slice(0, 3);
      const restantes = itensDoDia.length - visiveis.length;

      html += `
        <div class="dia-calendario ${foraDoMes ? "fora-do-mes" : ""} ${ehHoje ? "hoje" : ""} ${itensDoDia.length ? "tem-itens" : ""}" data-data="${diaStr}">
          <button class="btn-icone botao-add-dia" data-add="${diaStr}" title="Adicionar neste dia">${ICONES.mais(14)}</button>
          <span class="numero-dia">${dia.getDate()}</span>
          ${visiveis.map(it => itemHtml(it, diaStr)).join("")}
          ${restantes > 0 ? `<button class="mais-itens-dia" data-vertudo="${diaStr}">+${restantes} mais</button>` : ""}
        </div>`;
    }
    grade.innerHTML = html;

    grade.querySelectorAll(".dia-calendario").forEach(celula => {
      celula.addEventListener("click", (evento) => {
        if (evento.target.closest("[data-add]") || evento.target.closest("[data-item]") || evento.target.closest("[data-vertudo]")) return;
        abrirFormularioItem(null, celula.dataset.data);
      });
    });
    grade.querySelectorAll("[data-add]").forEach(botao => {
      botao.addEventListener("click", (evento) => { evento.stopPropagation(); abrirFormularioItem(null, botao.dataset.add); });
    });
    grade.querySelectorAll("[data-item]").forEach(elemento => {
      elemento.addEventListener("click", (evento) => {
        evento.stopPropagation();
        if (elemento.dataset.origem !== "calendario") return;
        const item = calendarioCache.find(c => c.id === elemento.dataset.item);
        if (item) abrirFormularioItem(item, null);
      });
    });
    grade.querySelectorAll("[data-vertudo]").forEach(botao => {
      botao.addEventListener("click", (evento) => { evento.stopPropagation(); abrirDiaCompleto(botao.dataset.vertudo); });
    });
  }

  function itemHtml(it, diaStr) {
    const classeStatus = it.status === "feito" ? "feito" : "";
    if (it.origem === "campanha") {
      return `<span class="item-calendario tipo-prazo" data-item="prazo" data-origem="campanha" title="${escapeHtml(it.titulo)}">${escapeHtml(it.titulo)}</span>`;
    }
    return `<span class="item-calendario tipo-${it.tipo} ${classeStatus}" data-item="${it.id}" data-origem="calendario" title="${escapeHtml(it.titulo)}">${escapeHtml(it.titulo)}</span>`;
  }

  function abrirDiaCompleto(diaStr) {
    const itens = (itensCache[diaStr] || []).filter(it => it.tipo === "prazo" || filtroTipo === "todos" || it.tipo === filtroTipo);
    abrirModalAdmin(`Itens de ${formatarData(diaStr)}`, `
      <ul style="display:flex; flex-direction:column; gap:8px; margin-bottom:16px;">
        ${itens.map(it => `<li class="item-calendario tipo-${it.tipo} ${it.status === "feito" ? "feito" : ""}" style="display:block; white-space:normal;" ${it.origem === "calendario" ? `data-item="${it.id}"` : ""}>${escapeHtml(it.titulo)}</li>`).join("")}
      </ul>
      <button class="btn btn-primario" id="botaoAddNesteDia">${ICONES.mais(16)} Adicionar neste dia</button>
    `);
    document.getElementById("botaoAddNesteDia").addEventListener("click", () => abrirFormularioItem(null, diaStr));
    document.querySelectorAll("#modalAdmin [data-item]").forEach(li => {
      li.style.cursor = "pointer";
      li.addEventListener("click", () => {
        const item = calendarioCache.find(c => c.id === li.dataset.item);
        if (item) abrirFormularioItem(item, null);
      });
    });
  }

  function renderAtrasados() {
    const area = document.getElementById("areaAtrasados");
    const hojeStr = new Date().toISOString().slice(0, 10);
    const atrasados = calendarioCache
      .filter(item => item.status !== "feito" && String(item.data).slice(0, 10) < hojeStr)
      .sort((a, b) => a.data.localeCompare(b.data));

    if (atrasados.length === 0) {
      area.innerHTML = `<p class="vazio-explicativo">Nada ficou pra trás. Tudo em dia.</p>`;
      return;
    }

    area.innerHTML = `<ul style="display:flex; flex-direction:column; gap:10px;">
      ${atrasados.map(item => `
        <li style="display:flex; align-items:center; gap:10px; justify-content:space-between; flex-wrap:wrap;">
          <span><strong>${escapeHtml(item.titulo)}</strong> ${item.marca ? "· " + escapeHtml(item.marca) : ""} <span class="etiqueta-prazo etiqueta-atrasado">${diasEntre(item.data)} dia(s) atrás</span></span>
          <span class="celula-acoes">
            <button class="btn btn-secundario" data-feito="${item.id}">Marcar feito</button>
            <button class="btn-icone" data-editar="${item.id}">${ICONES.lapis(16)}</button>
          </span>
        </li>
      `).join("")}
    </ul>`;

    area.querySelectorAll("[data-feito]").forEach(botao => {
      botao.addEventListener("click", async () => {
        const { error } = await window.banco.from("calendario").update({ status: "feito" }).eq("id", botao.dataset.feito);
        if (error) { mostrarToast("Não consegui atualizar", "erro"); return; }
        render(document.getElementById("conteudoAba"));
      });
    });
    area.querySelectorAll("[data-editar]").forEach(botao => {
      botao.addEventListener("click", () => {
        const item = calendarioCache.find(c => c.id === botao.dataset.editar);
        if (item) abrirFormularioItem(item, null);
      });
    });
  }

  function abrirFormularioItem(item, dataPreenchida) {
    const editando = !!item;
    abrirModalAdmin(editando ? "Editar item" : "Adicionar ao calendário", `
      <form id="formularioItemCal">
        <div class="campo-admin">
          <label for="campoTituloCal">Título</label>
          <input id="campoTituloCal" required value="${attrEsc(item?.titulo || "")}">
        </div>
        <div class="campo-admin">
          <label for="campoMarcaCal">Marca (opcional)</label>
          <input id="campoMarcaCal" value="${attrEsc(item?.marca || "")}">
        </div>
        <div class="linha-campos">
          <div class="campo-admin">
            <label for="campoTipoCal">Tipo</label>
            <select id="campoTipoCal">
              <option value="gravar" ${item?.tipo === "gravar" ? "selected" : ""}>Gravar</option>
              <option value="editar" ${item?.tipo === "editar" ? "selected" : ""}>Editar</option>
              <option value="postar" ${item?.tipo === "postar" ? "selected" : ""}>Postar</option>
            </select>
          </div>
          <div class="campo-admin">
            <label for="campoDataCal">Data</label>
            <input id="campoDataCal" type="date" required value="${item?.data || dataPreenchida || dataDeHoje()}">
          </div>
        </div>
        <div class="campo-admin">
          <label for="campoStatusCal">Status</label>
          <select id="campoStatusCal">
            <option value="a fazer" ${(!item || item.status === "a fazer") ? "selected" : ""}>A fazer</option>
            <option value="feito" ${item?.status === "feito" ? "selected" : ""}>Feito</option>
          </select>
        </div>
        <div class="linha-botoes-modal">
          ${editando ? `<button type="button" class="btn btn-perigo" id="botaoApagarCal">${ICONES.lixeira(16)} Apagar</button>` : ""}
          <button type="submit" class="btn btn-primario">${editando ? "Salvar" : "Adicionar"}</button>
        </div>
      </form>
    `);

    if (editando) {
      document.getElementById("botaoApagarCal").addEventListener("click", async () => {
        if (!confirm("Apagar este item do calendário?")) return;
        const { error } = await window.banco.from("calendario").delete().eq("id", item.id);
        if (error) { mostrarToast("Não consegui apagar", "erro"); return; }
        fecharModalAdmin();
        mostrarToast("Item apagado");
        render(document.getElementById("conteudoAba"));
      });
    }

    document.getElementById("formularioItemCal").addEventListener("submit", async (evento) => {
      evento.preventDefault();
      const dados = {
        titulo: document.getElementById("campoTituloCal").value.trim(),
        marca: document.getElementById("campoMarcaCal").value.trim(),
        tipo: document.getElementById("campoTipoCal").value,
        data: document.getElementById("campoDataCal").value,
        status: document.getElementById("campoStatusCal").value,
      };
      const resultado = editando
        ? await window.banco.from("calendario").update(dados).eq("id", item.id)
        : await window.banco.from("calendario").insert(dados);

      if (resultado.error) { mostrarToast("Não consegui salvar: " + resultado.error.message, "erro"); return; }
      fecharModalAdmin();
      mostrarToast(editando ? "Item atualizado" : "Item adicionado");
      render(document.getElementById("conteudoAba"));
    });
  }

  return { render };
})();
