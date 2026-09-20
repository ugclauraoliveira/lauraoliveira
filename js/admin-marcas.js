/* =========================================================
   ADMIN-MARCAS.JS
   Aba "Marcas": sua base de contatos (CRM), em formato de
   planilha, com busca, filtro por situação, WhatsApp/Instagram
   direto e exportação em CSV.
========================================================= */

window.AdminMarcas = (function () {

  const SITUACOES = ["lead", "conversando", "cliente", "parada"];
  let marcasCache = [];
  let filtroSituacao = "todas";
  let termoBusca = "";

  async function render(container) {
    container.innerHTML = `
      <div class="cartao">
        <div class="barra-filtros">
          <div class="campo-busca">
            ${ICONES.busca(16)}
            <input type="text" id="buscaMarcas" placeholder="Buscar por nome, @ ou e-mail">
          </div>
          <button class="chip-filtro ativo" data-situacao="todas">Todas</button>
          <button class="chip-filtro" data-situacao="lead">Lead</button>
          <button class="chip-filtro" data-situacao="conversando">Conversando</button>
          <button class="chip-filtro" data-situacao="cliente">Cliente</button>
          <button class="chip-filtro" data-situacao="parada">Parada</button>
          <div style="flex:1"></div>
          <button class="btn btn-secundario" id="botaoExportarMarcas">${ICONES.baixar(16)} Baixar CSV</button>
          <button class="btn btn-primario" id="botaoNovaMarca">${ICONES.mais(16)} Adicionar</button>
        </div>
        <div class="tabela-wrap" id="areaTabelaMarcas"></div>
      </div>
    `;

    document.getElementById("botaoNovaMarca").addEventListener("click", () => abrirFormularioMarca(null));
    document.getElementById("botaoExportarMarcas").addEventListener("click", exportar);
    document.getElementById("buscaMarcas").addEventListener("input", (e) => { termoBusca = e.target.value.toLowerCase(); renderTabela(); });
    container.querySelectorAll(".chip-filtro").forEach(chip => {
      chip.addEventListener("click", () => {
        container.querySelectorAll(".chip-filtro").forEach(c => c.classList.remove("ativo"));
        chip.classList.add("ativo");
        filtroSituacao = chip.dataset.situacao;
        renderTabela();
      });
    });

    const { data, error } = await window.banco.from("marcas").select("*").order("criado_em", { ascending: false });
    if (error) avisoFaltando(container, "marcas", error);
    marcasCache = data || [];
    renderTabela();
  }

  function listaFiltrada() {
    return marcasCache.filter(m => {
      const passaSituacao = filtroSituacao === "todas" || (m.situacao || "").toLowerCase() === filtroSituacao;
      const alvo = `${m.nome} ${m.instagram} ${m.email}`.toLowerCase();
      const passaBusca = !termoBusca || alvo.includes(termoBusca);
      return passaSituacao && passaBusca;
    });
  }

  function renderTabela() {
    const area = document.getElementById("areaTabelaMarcas");
    if (!area) return;

    if (marcasCache.length === 0) {
      area.innerHTML = `
        <table class="tabela-admin">
          <thead><tr><th>Marca</th><th>Instagram</th><th>E-mail</th><th>Telefone</th><th>Situação</th><th>Observação</th><th>Último contato</th></tr></thead>
          <tbody>
            <tr class="linha-exemplo">
              <td>Marca Exemplo <span class="selo-exemplo">exemplo</span></td>
              <td>@marcaexemplo</td>
              <td>contato@exemplo.com</td>
              <td>(43) 90000-0000</td>
              <td><span class="pilula pilula-lead">Lead</span></td>
              <td>Respondeu o formulário do site</td>
              <td>${formatarData(dataDeHoje())}</td>
            </tr>
          </tbody>
        </table>
        <p class="vazio-explicativo">Essa é uma linha de exemplo. Apague quando cadastrar as suas marcas de verdade.</p>`;
      return;
    }

    const lista = listaFiltrada();
    if (lista.length === 0) {
      area.innerHTML = `<p class="vazio-explicativo">Nenhuma marca encontrada com esse filtro ou busca.</p>`;
      return;
    }

    area.innerHTML = `
      <table class="tabela-admin">
        <thead><tr><th>Marca</th><th>Instagram</th><th>E-mail</th><th>Telefone</th><th>Situação</th><th>Observação</th><th>Último contato</th></tr></thead>
        <tbody>
          ${lista.map(m => linhaMarca(m)).join("")}
        </tbody>
      </table>`;

    area.querySelectorAll("tr[data-id]").forEach(linha => {
      const marca = lista.find(m => m.id === linha.dataset.id);
      linha.addEventListener("click", (evento) => {
        if (evento.target.closest("a")) return;
        abrirFormularioMarca(marca);
      });
    });
  }

  function linhaMarca(m) {
    const situacao = (m.situacao || "lead").toLowerCase();
    const nomeSituacao = situacao.charAt(0).toUpperCase() + situacao.slice(1);
    const linksExtra = [];
    if (m.telefone) {
      const digitos = m.telefone.replace(/\D/g, "");
      const comDDI = digitos.length <= 11 ? "55" + digitos : digitos;
      linksExtra.push(`<a href="https://wa.me/${comDDI}" target="_blank" rel="noopener" title="Abrir WhatsApp">${ICONES.whatsapp(16)}</a>`);
    }
    let instagramCelula = escapeHtml(m.instagram || "");
    if (m.instagram) {
      const usuario = m.instagram.replace("@", "").trim();
      instagramCelula = `<a href="https://instagram.com/${encodeURIComponent(usuario)}" target="_blank" rel="noopener">${escapeHtml(m.instagram)}</a>`;
    }
    return `
      <tr data-id="${m.id}" style="cursor:pointer;">
        <td>${escapeHtml(m.nome)}</td>
        <td>${instagramCelula}</td>
        <td>${escapeHtml(m.email)}</td>
        <td style="display:flex; align-items:center; gap:6px;">${escapeHtml(m.telefone)} ${linksExtra.join("")}</td>
        <td><span class="pilula pilula-${situacao}">${nomeSituacao}</span></td>
        <td>${escapeHtml((m.obs || "").slice(0, 60))}${(m.obs || "").length > 60 ? "…" : ""}</td>
        <td>${formatarData(m.ultimo_contato)}</td>
      </tr>`;
  }

  function abrirFormularioMarca(marca) {
    const editando = !!marca;
    abrirModalAdmin(editando ? "Editar marca" : "Adicionar marca", `
      <form id="formularioMarca">
        <div class="campo-admin">
          <label for="campoNomeMarca">Nome da marca</label>
          <input id="campoNomeMarca" required value="${attrEsc(marca?.nome || "")}">
        </div>
        <div class="linha-campos">
          <div class="campo-admin">
            <label for="campoInstaMarca">Instagram</label>
            <input id="campoInstaMarca" placeholder="@marca" value="${attrEsc(marca?.instagram || "")}">
          </div>
          <div class="campo-admin">
            <label for="campoTelMarca">Telefone</label>
            <input id="campoTelMarca" placeholder="(43) 90000-0000" value="${attrEsc(marca?.telefone || "")}">
          </div>
        </div>
        <div class="campo-admin">
          <label for="campoEmailMarca">E-mail</label>
          <input id="campoEmailMarca" type="email" value="${attrEsc(marca?.email || "")}">
        </div>
        <div class="linha-campos">
          <div class="campo-admin">
            <label for="campoSituacaoMarca">Situação</label>
            <select id="campoSituacaoMarca">
              ${SITUACOES.map(s => `<option value="${s}" ${((marca?.situacao || "lead").toLowerCase() === s) ? "selected" : ""}>${s.charAt(0).toUpperCase() + s.slice(1)}</option>`).join("")}
            </select>
          </div>
          <div class="campo-admin">
            <label for="campoContatoMarca">Último contato</label>
            <input id="campoContatoMarca" type="date" value="${marca?.ultimo_contato || ""}">
          </div>
        </div>
        <div class="campo-admin">
          <label for="campoObsMarca">Observação</label>
          <textarea id="campoObsMarca">${escapeHtml(marca?.obs || "")}</textarea>
        </div>
        <div class="linha-botoes-modal">
          ${editando ? `<button type="button" class="btn btn-perigo" id="botaoApagarMarca">${ICONES.lixeira(16)} Apagar</button>` : ""}
          <button type="submit" class="btn btn-primario">${editando ? "Salvar" : "Adicionar"}</button>
        </div>
      </form>
    `);

    if (editando) {
      document.getElementById("botaoApagarMarca").addEventListener("click", async () => {
        if (!confirm("Apagar esta marca da sua base?")) return;
        const { error } = await window.banco.from("marcas").delete().eq("id", marca.id);
        if (error) { mostrarToast("Não consegui apagar", "erro"); return; }
        fecharModalAdmin();
        mostrarToast("Marca apagada");
        render(document.getElementById("conteudoAba"));
      });
    }

    document.getElementById("formularioMarca").addEventListener("submit", async (evento) => {
      evento.preventDefault();
      const dados = {
        nome: document.getElementById("campoNomeMarca").value.trim(),
        instagram: document.getElementById("campoInstaMarca").value.trim(),
        telefone: document.getElementById("campoTelMarca").value.trim(),
        email: document.getElementById("campoEmailMarca").value.trim(),
        situacao: document.getElementById("campoSituacaoMarca").value,
        ultimo_contato: document.getElementById("campoContatoMarca").value || null,
        obs: document.getElementById("campoObsMarca").value.trim(),
      };
      let resultado;
    if (editando) {
      resultado = await window.banco.from("marcas").update(dados).eq("id", marca.id);
    } else {
      // A regra de seguranca do banco so aceita criar marcas novas como "lead".
      // Por isso a marca nasce como lead e, se voce escolheu outra situacao, atualizamos em seguida.
      const novoId = crypto.randomUUID();
      resultado = await window.banco.from("marcas").insert({ ...dados, id: novoId, situacao: "lead" });
      if (!resultado.error && dados.situacao !== "lead") {
        resultado = await window.banco.from("marcas").update({ situacao: dados.situacao }).eq("id", novoId);
      }
    }

      if (resultado.error) { mostrarToast("Não consegui salvar: " + resultado.error.message, "erro"); return; }
      fecharModalAdmin();
      mostrarToast(editando ? "Marca atualizada" : "Marca adicionada");
      render(document.getElementById("conteudoAba"));
    });
  }

  function exportar() {
    const lista = listaFiltrada();
    if (lista.length === 0) { mostrarToast("Não há marcas para exportar", "erro"); return; }
    exportarCsv(
      "marcas.csv",
      ["Marca", "Instagram", "E-mail", "Telefone", "Situação", "Observação", "Último contato"],
      lista.map(m => [m.nome, m.instagram, m.email, m.telefone, m.situacao, m.obs, formatarData(m.ultimo_contato)])
    );
  }

  return { render };
})();
