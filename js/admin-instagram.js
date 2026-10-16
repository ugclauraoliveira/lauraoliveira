/* =========================================================
   ADMIN-INSTAGRAM.JS
   Aba "Instagram": registro manual de métricas (com gráfico de
   evolução), o melhor post das últimas 2 semanas, e o banco de
   ideias de conteúdo.
========================================================= */

window.AdminInstagram = (function () {

  const CHAVE_MELHOR_POST = "instagram_melhor_post";

  const STATUS_IDEIA = [
    { valor: "ideia", rotulo: "Ideia", pilula: "pilula-lead" },
    { valor: "roteirizado", rotulo: "Roteirizado", pilula: "pilula-conversando" },
    { valor: "gravado", rotulo: "Gravado", pilula: "pilula-etapa" },
    { valor: "publicado", rotulo: "Publicado", pilula: "pilula-cliente" },
  ];

  let metricasCache = [];
  let ideiasCache = [];
  let melhorPost = { link: "", nota: "" };
  let filtroStatus = "todas";
  let termoBusca = "";
  let ordenacao = { coluna: null, direcao: "asc" };

  function $(id) { return document.getElementById(id); }

  function infoStatus(valor) {
    return STATUS_IDEIA.find((s) => s.valor === valor) || STATUS_IDEIA[0];
  }

  async function render(container) {
    container.innerHTML = `
      <div class="cartao">
        <h2>Métricas</h2>
        <form id="formularioMetricaInsta" style="display:flex; flex-wrap:wrap; gap:14px; align-items:flex-end;">
          <div class="campo-admin" style="margin-bottom:0;">
            <label for="campoDataMetrica">Data</label>
            <input id="campoDataMetrica" type="date" required value="${dataDeHoje()}">
          </div>
          <div class="campo-admin" style="margin-bottom:0;">
            <label for="campoSeguidoresMetrica">Seguidores</label>
            <input id="campoSeguidoresMetrica" type="number" min="0" required>
          </div>
          <div class="campo-admin" style="margin-bottom:0;">
            <label for="campoAlcanceMetrica">Alcance (opcional)</label>
            <input id="campoAlcanceMetrica" type="number" min="0">
          </div>
          <div class="campo-admin" style="margin-bottom:0;">
            <label for="campoInteracoesMetrica">Interações (opcional)</label>
            <input id="campoInteracoesMetrica" type="number" min="0">
          </div>
          <div class="campo-admin" style="margin-bottom:0;">
            <button type="submit" class="btn btn-primario">${ICONES.mais(16)} Registrar</button>
          </div>
        </form>
        <p class="vazio-explicativo" style="text-align:left; padding:6px 0 0;">Se já existir um registro na mesma data, ele só é atualizado, nunca duplicado.</p>
        <div id="areaGraficoInsta" style="margin-top:14px;"></div>
      </div>

      <div class="cartao">
        <h2>Melhor post das últimas 2 semanas</h2>
        <form id="formularioMelhorPost">
          <div class="campo-admin">
            <label for="campoLinkMelhorPost">Link do post</label>
            <input id="campoLinkMelhorPost" type="url" placeholder="https://instagram.com/p/...">
          </div>
          <div class="campo-admin">
            <label for="campoNotaMelhorPost">Por que foi o melhor (opcional)</label>
            <input id="campoNotaMelhorPost" placeholder="Ex: mais salvamentos da semana">
          </div>
          <div class="linha-botoes-modal" style="margin-top:0;">
            <button type="submit" class="btn btn-secundario">Salvar</button>
          </div>
        </form>
      </div>

      <div class="cartao">
        <div class="barra-filtros">
          <h2 style="flex-basis:100%; margin:0 0 4px;">Banco de ideias</h2>
          <button class="chip-filtro ativo" data-filtro="todas">Todas</button>
          <button class="chip-filtro" data-filtro="ideia">Ideia</button>
          <button class="chip-filtro" data-filtro="roteirizado">Roteirizado</button>
          <button class="chip-filtro" data-filtro="gravado">Gravado</button>
          <button class="chip-filtro" data-filtro="publicado">Publicado</button>
          <div class="campo-busca">${ICONES.busca(16)}<input type="text" id="buscaIdeias" placeholder="Buscar ideia"></div>
          <div style="flex:1"></div>
          <button class="btn btn-primario" id="botaoNovaIdeia">${ICONES.mais(16)} Nova ideia</button>
        </div>
        <div class="tabela-wrap" id="areaTabelaIdeias"></div>
      </div>
    `;

    $("formularioMetricaInsta").addEventListener("submit", salvarMetrica);
    $("formularioMelhorPost").addEventListener("submit", salvarMelhorPost);
    $("botaoNovaIdeia").addEventListener("click", () => abrirFormularioIdeia(null, () => render(container)));
    $("buscaIdeias").addEventListener("input", (e) => { termoBusca = e.target.value.toLowerCase(); renderTabelaIdeias(); });
    container.querySelectorAll(".chip-filtro").forEach((chip) => {
      chip.addEventListener("click", () => {
        container.querySelectorAll(".chip-filtro").forEach((c) => c.classList.remove("ativo"));
        chip.classList.add("ativo");
        filtroStatus = chip.dataset.filtro;
        renderTabelaIdeias();
      });
    });

    const [metricasResultado, ideiasResultado, configResultado] = await Promise.all([
      window.banco.from("instagram_metricas").select("*").order("data", { ascending: true }),
      window.banco.from("ideias_conteudo").select("*").order("criado_em", { ascending: false }),
      window.banco.from("configuracoes").select("*").eq("chave", CHAVE_MELHOR_POST),
    ]);

    if (metricasResultado.error || ideiasResultado.error) {
      avisoFaltando(container, "instagram_metricas / ideias_conteudo (rode o adicionar-instagram.sql)", metricasResultado.error || ideiasResultado.error);
    }

    metricasCache = metricasResultado.data || [];
    ideiasCache = ideiasResultado.data || [];

    try {
      melhorPost = JSON.parse((configResultado.data || [])[0]?.valor || "{}");
    } catch (e) {
      melhorPost = {};
    }
    $("campoLinkMelhorPost").value = melhorPost.link || "";
    $("campoNotaMelhorPost").value = melhorPost.nota || "";

    renderGrafico();
    renderTabelaIdeias();
  }

  /* ---------- MÉTRICAS ---------- */

  function renderGrafico() {
    const area = $("areaGraficoInsta");
    if (metricasCache.length === 0) {
      area.innerHTML = `<p class="vazio-explicativo">Quando você registrar seus números algumas vezes, aqui vai aparecer o gráfico de evolução de seguidores.</p>`;
      return;
    }

    const ultimos = metricasCache.slice(-8);
    const maximo = Math.max(1, ...ultimos.map((m) => m.seguidores));

    area.innerHTML = `<div class="grafico-barras">
      ${ultimos.map((m) => {
        const altura = Math.max(2, Math.round((m.seguidores / maximo) * 100));
        return `<div class="barra-dia" title="${m.seguidores} seguidores em ${formatarData(m.data)}">
          <div class="barra" style="height:${altura}%"></div>
          <span class="rotulo-dia">${formatarData(m.data).slice(0, 5)}</span>
        </div>`;
      }).join("")}
    </div>`;
  }

  async function salvarMetrica(evento) {
    evento.preventDefault();
    const dados = {
      data: $("campoDataMetrica").value,
      seguidores: Number($("campoSeguidoresMetrica").value) || 0,
      alcance: Number($("campoAlcanceMetrica").value) || 0,
      interacoes: Number($("campoInteracoesMetrica").value) || 0,
    };
    const { error } = await window.banco.from("instagram_metricas").upsert(dados, { onConflict: "data" });
    if (error) { mostrarToast("Não consegui salvar: " + error.message, "erro"); return; }
    mostrarToast("Métricas registradas");
    render(document.getElementById("conteudoAba"));
  }

  async function salvarMelhorPost(evento) {
    evento.preventDefault();
    const valor = JSON.stringify({
      link: $("campoLinkMelhorPost").value.trim(),
      nota: $("campoNotaMelhorPost").value.trim(),
    });
    const { error } = await window.banco.from("configuracoes").upsert({ chave: CHAVE_MELHOR_POST, valor });
    if (error) { mostrarToast("Não consegui salvar: " + error.message, "erro"); return; }
    mostrarToast("Melhor post salvo");
  }

  /* ---------- BANCO DE IDEIAS ---------- */

  function listaFiltrada() {
    return ideiasCache.filter((i) => {
      const passaFiltro = filtroStatus === "todas" || i.status === filtroStatus;
      const passaBusca = !termoBusca || i.titulo.toLowerCase().includes(termoBusca);
      return passaFiltro && passaBusca;
    });
  }

  function valorOrdenavel(i, coluna) {
    switch (coluna) {
      case "status": return STATUS_IDEIA.findIndex((s) => s.valor === i.status);
      case "data_prevista": return i.data_prevista || "9999-99-99";
      default: return (i[coluna] || "").toString().toLowerCase();
    }
  }

  function cabecalho() {
    const colunas = [
      { chave: "titulo", rotulo: "Título" },
      { chave: "formato", rotulo: "Formato" },
      { chave: "status", rotulo: "Status" },
      { chave: "data_prevista", rotulo: "Data prevista" },
    ];
    return `<tr>${colunas.map((c) => {
      const ativa = ordenacao.coluna === c.chave;
      const seta = ativa ? (ordenacao.direcao === "asc" ? ICONES.setaCima(13) : ICONES.setaBaixo(13)) : ICONES.ordenar(13);
      return `<th class="ordenavel ${ativa ? "ativa" : ""}" data-coluna="${c.chave}">${c.rotulo}<span class="seta-ordenar">${seta}</span></th>`;
    }).join("")}</tr>`;
  }

  function ativarCabecalho() {
    document.querySelectorAll("#areaTabelaIdeias th.ordenavel").forEach((th) => {
      th.addEventListener("click", () => {
        if (ordenacao.coluna === th.dataset.coluna) {
          ordenacao.direcao = ordenacao.direcao === "asc" ? "desc" : "asc";
        } else {
          ordenacao = { coluna: th.dataset.coluna, direcao: "asc" };
        }
        renderTabelaIdeias();
      });
    });
  }

  function linhaIdeia(i) {
    const info = infoStatus(i.status);
    return `
      <tr data-id="${i.id}" style="cursor:pointer;">
        <td>${escapeHtml(i.titulo)}</td>
        <td>${escapeHtml(i.formato || "—")}</td>
        <td><span class="pilula ${info.pilula}">${info.rotulo}</span></td>
        <td>${i.data_prevista ? formatarData(i.data_prevista) : "—"}</td>
      </tr>`;
  }

  function renderTabelaIdeias() {
    const area = $("areaTabelaIdeias");
    if (!area) return;

    if (ideiasCache.length === 0) {
      area.innerHTML = `<p class="vazio-explicativo">Nenhuma ideia ainda. Use o botão "+ Nova ideia" acima pra começar seu banco de conteúdo.</p>`;
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
      area.innerHTML = `<table class="tabela-admin"><thead>${cabecalho()}</thead></table><p class="vazio-explicativo">Nenhuma ideia encontrada com esse filtro ou busca.</p>`;
      ativarCabecalho();
      return;
    }

    area.innerHTML = `<table class="tabela-admin">
      <thead>${cabecalho()}</thead>
      <tbody>${lista.map(linhaIdeia).join("")}</tbody>
    </table>`;

    ativarCabecalho();
    area.querySelectorAll("tr[data-id]").forEach((linha) => {
      linha.addEventListener("click", () => {
        const i = ideiasCache.find((x) => x.id === linha.dataset.id);
        if (i) abrirFormularioIdeia(i, () => render(document.getElementById("conteudoAba")));
      });
    });
  }

  function abrirFormularioIdeia(ideia, aoSalvar) {
    const editando = !!ideia;
    abrirModalAdmin(editando ? "Editar ideia" : "Nova ideia", `
      <form id="formularioIdeia">
        <div class="campo-admin">
          <label for="campoTituloIdeia">Título</label>
          <input id="campoTituloIdeia" required value="${attrEsc(ideia?.titulo || "")}">
        </div>
        <div class="campo-admin">
          <label for="campoDescricaoIdeia">Descrição (opcional)</label>
          <textarea id="campoDescricaoIdeia">${escapeHtml(ideia?.descricao || "")}</textarea>
        </div>
        <div class="linha-campos">
          <div class="campo-admin">
            <label for="campoFormatoIdeia">Formato</label>
            <select id="campoFormatoIdeia">
              <option value="" ${!ideia?.formato ? "selected" : ""}>—</option>
              <option value="Reels" ${ideia?.formato === "Reels" ? "selected" : ""}>Reels</option>
              <option value="Carrossel" ${ideia?.formato === "Carrossel" ? "selected" : ""}>Carrossel</option>
              <option value="Stories" ${ideia?.formato === "Stories" ? "selected" : ""}>Stories</option>
              <option value="Feed" ${ideia?.formato === "Feed" ? "selected" : ""}>Feed</option>
              <option value="Outro" ${ideia?.formato === "Outro" ? "selected" : ""}>Outro</option>
            </select>
          </div>
          <div class="campo-admin">
            <label for="campoStatusIdeia">Status</label>
            <select id="campoStatusIdeia">
              ${STATUS_IDEIA.map((s) => `<option value="${s.valor}" ${(ideia ? ideia.status === s.valor : s.valor === "ideia") ? "selected" : ""}>${s.rotulo}</option>`).join("")}
            </select>
          </div>
        </div>
        <div class="campo-admin">
          <label for="campoDataPrevistaIdeia">Data prevista (opcional)</label>
          <input id="campoDataPrevistaIdeia" type="date" value="${ideia?.data_prevista || ""}">
        </div>
        <div class="linha-botoes-modal">
          ${editando ? `<button type="button" class="btn btn-perigo" id="botaoApagarIdeia">${ICONES.lixeira(16)} Apagar</button>` : ""}
          <button type="submit" class="btn btn-primario">${editando ? "Salvar" : "Adicionar"}</button>
        </div>
      </form>
    `);

    if (editando) {
      document.getElementById("botaoApagarIdeia").addEventListener("click", async () => {
        if (!confirm("Apagar esta ideia?")) return;
        const { error } = await window.banco.from("ideias_conteudo").delete().eq("id", ideia.id);
        if (error) { mostrarToast("Não consegui apagar", "erro"); return; }
        fecharModalAdmin();
        mostrarToast("Ideia apagada");
        if (aoSalvar) aoSalvar();
      });
    }

    document.getElementById("formularioIdeia").addEventListener("submit", async (evento) => {
      evento.preventDefault();
      const dados = {
        titulo: document.getElementById("campoTituloIdeia").value.trim(),
        descricao: document.getElementById("campoDescricaoIdeia").value.trim(),
        formato: document.getElementById("campoFormatoIdeia").value,
        status: document.getElementById("campoStatusIdeia").value,
        data_prevista: document.getElementById("campoDataPrevistaIdeia").value || null,
      };
      const resultado = editando
        ? await window.banco.from("ideias_conteudo").update(dados).eq("id", ideia.id)
        : await window.banco.from("ideias_conteudo").insert(dados);

      if (resultado.error) { mostrarToast("Não consegui salvar: " + resultado.error.message, "erro"); return; }
      fecharModalAdmin();
      mostrarToast(editando ? "Ideia atualizada" : "Ideia adicionada");
      if (aoSalvar) aoSalvar();
    });
  }

  return { render, abrirNovaIdeia: (aoSalvar) => abrirFormularioIdeia(null, aoSalvar) };
})();
