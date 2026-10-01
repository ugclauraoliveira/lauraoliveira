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
          <button class="btn btn-secundario" id="botaoImportarMarcas">${ICONES.subir(16)} Importar CSV</button>
          <button class="btn btn-secundario" id="botaoExportarMarcas">${ICONES.baixar(16)} Baixar CSV</button>
          <button class="btn btn-primario" id="botaoNovaMarca">${ICONES.mais(16)} Adicionar</button>
        </div>
        <div class="barra-selecao-marcas">
          <span id="textoSelecaoMarcas"><strong>0</strong> marcas selecionadas</span>
          <button class="link-discreto" id="botaoSelecionarVisiveisMarcas" type="button">Selecionar todas da lista atual</button>
          <button class="link-discreto" id="botaoLimparSelecaoMarcas" type="button">Limpar seleção</button>
        </div>
        <div class="tabela-wrap" id="areaTabelaMarcas"></div>
      </div>
    `;

    document.getElementById("botaoNovaMarca").addEventListener("click", () => abrirFormularioMarca(null));
    document.getElementById("botaoExportarMarcas").addEventListener("click", exportar);
    document.getElementById("botaoImportarMarcas").addEventListener("click", abrirImportarCsv);
    document.getElementById("buscaMarcas").addEventListener("input", (e) => { termoBusca = e.target.value.toLowerCase(); renderTabela(); });
    document.getElementById("botaoSelecionarVisiveisMarcas").addEventListener("click", selecionarTodasVisiveis);
    document.getElementById("botaoLimparSelecaoMarcas").addEventListener("click", limparSelecaoTodas);
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

  /* ---------- Seleção (usada pela aba Prospecção) ---------- */

  function contarSelecionadas() {
    return marcasCache.filter(m => m.selecionada).length;
  }

  function atualizarTextoSelecao() {
    const span = document.getElementById("textoSelecaoMarcas");
    if (span) span.innerHTML = `<strong>${contarSelecionadas()}</strong> marcas selecionadas`;
  }

  async function salvarSelecaoMarca(id, valor) {
    const marca = marcasCache.find(m => m.id === id);
    if (marca) marca.selecionada = valor;
    atualizarTextoSelecao();
    const { error } = await window.banco.from("marcas").update({ selecionada: valor }).eq("id", id);
    if (error) mostrarToast("Não consegui salvar a seleção (rode o prospeccao.sql no Supabase)", "erro");
  }

  function selecionarTodasVisiveis() {
    const area = document.getElementById("areaTabelaMarcas");
    area.querySelectorAll(".checkbox-selecao-marca:not([disabled])").forEach(cb => {
      cb.checked = true;
      salvarSelecaoMarca(cb.dataset.id, true);
    });
  }

  function limparSelecaoTodas() {
    marcasCache.filter(m => m.selecionada).forEach(m => salvarSelecaoMarca(m.id, false));
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
          <thead><tr><th></th><th>Marca</th><th>Instagram</th><th>E-mail</th><th>Telefone</th><th>Situação</th><th>Observação</th><th>Último contato</th></tr></thead>
          <tbody>
            <tr class="linha-exemplo">
              <td></td>
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
      atualizarTextoSelecao();
      return;
    }

    const lista = listaFiltrada();
    if (lista.length === 0) {
      area.innerHTML = `<p class="vazio-explicativo">Nenhuma marca encontrada com esse filtro ou busca.</p>`;
      atualizarTextoSelecao();
      return;
    }

    area.innerHTML = `
      <table class="tabela-admin">
        <thead><tr><th></th><th>Marca</th><th>Instagram</th><th>E-mail</th><th>Telefone</th><th>Situação</th><th>Observação</th><th>Último contato</th></tr></thead>
        <tbody>
          ${lista.map(m => linhaMarca(m)).join("")}
        </tbody>
      </table>`;

    area.querySelectorAll("tr[data-id]").forEach(linha => {
      const marca = lista.find(m => m.id === linha.dataset.id);
      linha.addEventListener("click", (evento) => {
        if (evento.target.closest("a") || evento.target.closest("input")) return;
        abrirFormularioMarca(marca);
      });
    });

    area.querySelectorAll(".checkbox-selecao-marca").forEach(cb => {
      cb.addEventListener("click", (evento) => evento.stopPropagation());
      cb.addEventListener("change", (evento) => salvarSelecaoMarca(cb.dataset.id, evento.target.checked));
    });

    atualizarTextoSelecao();
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
    const temEmail = !!(m.email && m.email.trim());
    return `
      <tr data-id="${m.id}" style="cursor:pointer;">
        <td><input type="checkbox" class="checkbox-selecao-marca" data-id="${m.id}"
          ${m.selecionada ? "checked" : ""} ${temEmail ? "" : 'disabled title="Sem e-mail cadastrado"'}></td>
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

  /* =======================================================
     IMPORTAR MARCAS DE UMA PLANILHA (CSV)
     Lê o arquivo, descobre sozinho qual coluna é qual (nome,
     instagram, e-mail, telefone...) e mostra uma prévia antes
     de importar de verdade.
  ======================================================= */

  const SINONIMOS_CAMPOS = {
    nome: ["marca", "nome", "empresa", "cliente", "nomedamarca", "nomeempresa", "razaosocial", "nomedocliente"],
    instagram: ["instagram", "insta", "perfil", "arroba", "usuario", "rede social", "redesocial"],
    email: ["email", "emaildecontato", "mail", "endereodeemail"],
    telefone: ["telefone", "whatsapp", "celular", "fone", "contato", "numero", "numerodowhatsapp", "tel"],
    situacao: ["situacao", "status", "etapa"],
    obs: ["obs", "observacao", "observacoes", "notas", "nota", "comentario", "comentarios", "detalhes"],
    ultimo_contato: ["ultimocontato", "data", "dataultimocontato", "ultimafala", "dataultimafala", "dataultimocontato"],
  };
  const ROTULOS_CAMPOS = { nome: "Marca", instagram: "Instagram", email: "E-mail", telefone: "Telefone", situacao: "Situação", obs: "Observação", ultimo_contato: "Último contato" };

  let importPendente = null;

  function normalizarTexto(txt) {
    return String(txt || "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z0-9]/g, "");
  }

  // Leitor de CSV simples: entende vírgula ou ponto e vírgula, e campos entre aspas.
  function parseCsv(texto) {
    if (texto.charCodeAt(0) === 0xfeff) texto = texto.slice(1); // remove BOM do Excel
    const primeiraLinha = texto.split(/\r?\n/)[0] || "";
    const delimitador = (primeiraLinha.split(";").length > primeiraLinha.split(",").length) ? ";" : ",";

    const linhas = [];
    let linhaAtual = [], campoAtual = "", dentroDeAspas = false;
    for (let i = 0; i < texto.length; i++) {
      const c = texto[i];
      if (dentroDeAspas) {
        if (c === '"') {
          if (texto[i + 1] === '"') { campoAtual += '"'; i++; } else dentroDeAspas = false;
        } else campoAtual += c;
      } else if (c === '"') {
        dentroDeAspas = true;
      } else if (c === delimitador) {
        linhaAtual.push(campoAtual); campoAtual = "";
      } else if (c === "\n" || c === "\r") {
        if (c === "\r" && texto[i + 1] === "\n") i++;
        linhaAtual.push(campoAtual);
        linhas.push(linhaAtual);
        linhaAtual = []; campoAtual = "";
      } else {
        campoAtual += c;
      }
    }
    if (campoAtual !== "" || linhaAtual.length) { linhaAtual.push(campoAtual); linhas.push(linhaAtual); }
    return linhas.filter(l => l.some(c => c.trim() !== ""));
  }

  function mapearColunas(cabecalho) {
    const normalizados = cabecalho.map(normalizarTexto);
    const mapa = {};
    Object.entries(SINONIMOS_CAMPOS).forEach(([campo, sinonimos]) => {
      let indice = normalizados.findIndex(h => sinonimos.includes(h));
      if (indice === -1) indice = normalizados.findIndex(h => sinonimos.some(s => h.includes(s)));
      mapa[campo] = indice;
    });
    return mapa;
  }

  function converterDataBr(txt) {
    const limpo = (txt || "").trim();
    if (!limpo) return null;
    let m = limpo.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})$/);
    if (m) {
      let [, d, mo, a] = m;
      if (a.length === 2) a = "20" + a;
      return `${a.padStart(4, "0")}-${mo.padStart(2, "0")}-${d.padStart(2, "0")}`;
    }
    if (/^\d{4}-\d{1,2}-\d{1,2}$/.test(limpo)) return limpo;
    return null;
  }

  function normalizarSituacao(txt) {
    const n = normalizarTexto(txt);
    return SITUACOES.find(s => normalizarTexto(s) === n) || null;
  }

  function abrirImportarCsv() {
    importPendente = null;
    abrirModalAdmin("Importar planilha de marcas", `
      <p style="font-size:.84rem; color:var(--tinta-suave); margin-bottom:14px;">
        Escolha o arquivo CSV da sua planilha. Se puder, exporte do Excel ou do Google Planilhas como "CSV UTF-8", pra manter os acentos certinhos.
      </p>
      <div class="campo-admin">
        <label for="arquivoCsvMarcas">Arquivo CSV</label>
        <input type="file" id="arquivoCsvMarcas" accept=".csv,text/csv">
      </div>
      <div id="areaPreviaCsv"></div>
    `);
    document.getElementById("arquivoCsvMarcas").addEventListener("change", processarArquivoCsv);
  }

  async function processarArquivoCsv(evento) {
    const arquivo = evento.target.files[0];
    const areaPrevia = document.getElementById("areaPreviaCsv");
    if (!arquivo) { areaPrevia.innerHTML = ""; return; }
    areaPrevia.innerHTML = `<p class="vazio-explicativo">Lendo o arquivo...</p>`;

    let texto;
    try {
      texto = await arquivo.text();
    } catch (erro) {
      areaPrevia.innerHTML = `<p class="vazio-explicativo">Não consegui ler esse arquivo. Tente exportar a planilha como CSV de novo.</p>`;
      return;
    }

    const linhas = parseCsv(texto);
    if (linhas.length < 2) {
      areaPrevia.innerHTML = `<p class="vazio-explicativo">Não encontrei linhas de dados nesse arquivo. Confira se ele tem um cabeçalho e pelo menos uma marca.</p>`;
      return;
    }

    const [cabecalho, ...dados] = linhas;
    const mapa = mapearColunas(cabecalho);

    if (mapa.nome === -1) {
      areaPrevia.innerHTML = `<p class="vazio-explicativo">Não encontrei uma coluna com o nome da marca. Confira se a sua planilha tem uma coluna chamada "Marca", "Nome" ou "Empresa".</p>`;
      return;
    }

    const nomesExistentes = new Set(marcasCache.map(m => normalizarTexto(m.nome)));
    const registros = [];
    let puladasSemNome = 0, duplicadas = 0;

    dados.forEach(linha => {
      const pegar = (indice) => (indice >= 0 && indice < linha.length) ? linha[indice].trim() : "";
      const nome = pegar(mapa.nome);
      if (!nome) { puladasSemNome++; return; }
      const chave = normalizarTexto(nome);
      if (nomesExistentes.has(chave)) { duplicadas++; return; }
      nomesExistentes.add(chave); // evita importar a mesma marca duas vezes se ela se repetir no arquivo

      registros.push({
        nome,
        instagram: pegar(mapa.instagram),
        email: pegar(mapa.email),
        telefone: pegar(mapa.telefone),
        obs: pegar(mapa.obs),
        ultimo_contato: converterDataBr(pegar(mapa.ultimo_contato)),
        situacaoDoArquivo: normalizarSituacao(pegar(mapa.situacao)),
      });
    });

    importPendente = { registros, puladasSemNome, duplicadas, mapa, cabecalho };
    renderPreviaCsv();
  }

  function renderPreviaCsv() {
    const areaPrevia = document.getElementById("areaPreviaCsv");
    const { registros, puladasSemNome, duplicadas, mapa } = importPendente;

    const colunasEncontradas = Object.entries(mapa).filter(([, i]) => i !== -1).map(([campo]) => ROTULOS_CAMPOS[campo]);

    areaPrevia.innerHTML = `
      <p style="font-size:.84rem; margin:14px 0 10px;">
        Colunas reconhecidas: <strong>${colunasEncontradas.join(", ")}</strong>
      </p>
      <div class="campo-admin">
        <label for="situacaoPadraoImport">Marcar essas marcas novas como</label>
        <select id="situacaoPadraoImport">
          <option value="cliente" selected>Cliente (já trabalhei com elas)</option>
          <option value="lead">Lead</option>
          <option value="conversando">Conversando</option>
          <option value="parada">Parada</option>
        </select>
      </div>
      <p style="font-size:.8rem; color:var(--tinta-suave); margin-bottom:10px;">
        ${registros.length} marca(s) nova(s) prontas pra importar.
        ${duplicadas ? ` ${duplicadas} já estavam na sua base e foram puladas.` : ""}
        ${puladasSemNome ? ` ${puladasSemNome} linha(s) sem nome foram ignoradas.` : ""}
        Se a sua planilha já tinha uma coluna de situação com um desses 4 valores, ela vale no lugar da escolha acima.
      </p>
      ${registros.length ? `
      <div class="tabela-wrap" style="max-height:220px; overflow-y:auto;">
        <table class="tabela-admin">
          <thead><tr><th>Marca</th><th>Instagram</th><th>E-mail</th><th>Telefone</th></tr></thead>
          <tbody>
            ${registros.slice(0, 8).map(r => `<tr><td>${escapeHtml(r.nome)}</td><td>${escapeHtml(r.instagram)}</td><td>${escapeHtml(r.email)}</td><td>${escapeHtml(r.telefone)}</td></tr>`).join("")}
          </tbody>
        </table>
        ${registros.length > 8 ? `<p style="font-size:.76rem; color:var(--tinta-suave); margin-top:6px;">E mais ${registros.length - 8}...</p>` : ""}
      </div>
      <button class="btn btn-primario" id="botaoConfirmarImportCsv" style="margin-top:14px; width:100%; justify-content:center;">Importar ${registros.length} marca(s)</button>
      ` : `<p class="vazio-explicativo">Nenhuma marca nova pra importar desse arquivo.</p>`}
    `;

    if (registros.length) {
      document.getElementById("botaoConfirmarImportCsv").addEventListener("click", confirmarImportCsv);
    }
  }

  async function confirmarImportCsv() {
    const botao = document.getElementById("botaoConfirmarImportCsv");
    const totalOriginal = botao.textContent;
    botao.disabled = true;
    botao.textContent = "Importando...";

    const situacaoPadrao = document.getElementById("situacaoPadraoImport").value;
    const { registros } = importPendente;

    const linhas = registros.map(r => ({
      id: crypto.randomUUID(),
      nome: r.nome,
      instagram: r.instagram,
      email: r.email,
      telefone: r.telefone,
      obs: r.obs,
      ultimo_contato: r.ultimo_contato,
      situacaoFinal: r.situacaoDoArquivo || situacaoPadrao,
    }));

    // A regra de segurança do banco só aceita criar marcas novas como "lead"
    // (a mesma regra usada pelo formulário do site). Por isso elas nascem como
    // lead e, em seguida, ajustamos pra situação de verdade escolhida aqui.
    const paraInserir = linhas.map(({ situacaoFinal, ...resto }) => ({ ...resto, situacao: "lead" }));
    const resultadoInsert = await window.banco.from("marcas").insert(paraInserir);

    if (resultadoInsert.error) {
      mostrarToast("Não consegui importar: " + resultadoInsert.error.message, "erro");
      botao.disabled = false;
      botao.textContent = totalOriginal;
      return;
    }

    const porSituacao = {};
    linhas.forEach(l => {
      if (l.situacaoFinal === "lead") return;
      (porSituacao[l.situacaoFinal] = porSituacao[l.situacaoFinal] || []).push(l.id);
    });
    for (const [situacao, ids] of Object.entries(porSituacao)) {
      await window.banco.from("marcas").update({ situacao }).in("id", ids);
    }

    fecharModalAdmin();
    mostrarToast(`${registros.length} marca(s) importada(s)`);
    render(document.getElementById("conteudoAba"));
  }

  return { render, SITUACOES };
})();
