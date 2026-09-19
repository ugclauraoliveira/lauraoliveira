/* =========================================================
   ADMIN-PORTFOLIO.JS
   Aba "Portfólio": métricas de visita, gráfico dos últimos 14
   dias e a tabela de vídeos (a mesma que alimenta o site público).
========================================================= */

window.AdminPortfolio = (function () {

  let videosCache = [];

  async function render(container) {
    container.innerHTML = `
      <div class="kpis" id="kpisPortfolio">
        <div class="kpi"><span class="valor">–</span><span class="rotulo">visitas em 14 dias</span></div>
        <div class="kpi"><span class="valor">–</span><span class="rotulo">visitas hoje</span></div>
        <div class="kpi"><span class="valor">–</span><span class="rotulo">vídeos no ar</span></div>
        <div class="kpi"><span class="valor">–</span><span class="rotulo">nicho mais forte</span></div>
        <div class="kpi"><span class="valor">–</span><span class="rotulo">de onde mais vêm</span></div>
      </div>

      <div class="grade-2">
        <div class="cartao">
          <h2>Visitas nos últimos 14 dias</h2>
          <div id="areaGrafico"></div>
        </div>
        <div class="cartao">
          <h2>Por onde chegaram</h2>
          <div id="areaOrigens"></div>
        </div>
      </div>

      <div class="cartao">
        <div class="barra-filtros" style="justify-content:space-between;">
          <h2 style="margin:0;">Meus vídeos</h2>
          <button class="btn btn-primario" id="botaoNovoVideo">${ICONES.mais(16)} Adicionar vídeo</button>
        </div>
        <p style="font-size:.78rem; color:var(--tinta-suave); margin:-4px 0 12px;">Arraste pela alcinha para mudar a ordem no site. O olhinho mostra ou esconde do portfólio.</p>
        <div class="tabela-wrap" id="areaTabelaVideos"></div>
      </div>
    `;

    document.getElementById("botaoNovoVideo").addEventListener("click", () => abrirFormularioVideo(null));

    const [videosResultado, visitasResultado] = await Promise.all([
      window.banco.from("videos").select("*").order("ordem", { ascending: true }),
      window.banco.from("visitas").select("criado_em, pagina, origem").order("criado_em", { ascending: false }).limit(2000),
    ]);

    if (videosResultado.error) avisoFaltando(container, "videos", videosResultado.error);
    if (visitasResultado.error) avisoFaltando(container, "visitas", visitasResultado.error);

    videosCache = videosResultado.data || [];
    const visitas = visitasResultado.data || [];

    renderKpis(videosCache, visitas);
    renderGrafico(visitas);
    renderOrigens(visitas);
    renderTabelaVideos(videosCache);
  }

  function renderKpis(videos, visitas) {
    const agora = new Date();
    const inicio14 = new Date(agora); inicio14.setDate(inicio14.getDate() - 13); inicio14.setHours(0,0,0,0);
    const hojeStr = agora.toISOString().slice(0, 10);

    const visitas14 = visitas.filter(v => new Date(v.criado_em) >= inicio14).length;
    const visitasHoje = visitas.filter(v => String(v.criado_em).slice(0,10) === hojeStr).length;
    const videosNoAr = videos.filter(v => v.visivel).length;

    const contagemNicho = {};
    videos.forEach(v => { if (v.nicho) contagemNicho[v.nicho] = (contagemNicho[v.nicho] || 0) + 1; });
    const nichoMaisForte = maiorChave(contagemNicho) || "—";

    const contagemOrigem = {};
    visitas.forEach(v => { const o = (v.origem || "").trim(); if (o) contagemOrigem[o] = (contagemOrigem[o] || 0) + 1; });
    const origemMaisForte = maiorChave(contagemOrigem) || "—";

    const kpis = document.querySelectorAll("#kpisPortfolio .kpi .valor");
    kpis[0].textContent = visitas14;
    kpis[1].textContent = visitasHoje;
    kpis[2].textContent = videosNoAr;
    kpis[3].textContent = nichoMaisForte;
    kpis[4].textContent = origemMaisForte;
  }

  function maiorChave(objetoContagem) {
    const entradas = Object.entries(objetoContagem);
    if (entradas.length === 0) return null;
    entradas.sort((a, b) => b[1] - a[1]);
    return entradas[0][0];
  }

  function renderGrafico(visitas) {
    const area = document.getElementById("areaGrafico");
    if (visitas.length === 0) {
      area.innerHTML = `<p class="vazio-explicativo">Quando as pessoas começarem a visitar o seu portfólio, aqui vai aparecer um gráfico com as visitas dos últimos 14 dias.</p>`;
      return;
    }

    const dias = [];
    for (let i = 13; i >= 0; i--) {
      const d = new Date(); d.setDate(d.getDate() - i);
      dias.push(d.toISOString().slice(0, 10));
    }
    const contagemPorDia = {};
    dias.forEach(d => contagemPorDia[d] = 0);
    visitas.forEach(v => {
      const dia = String(v.criado_em).slice(0, 10);
      if (dia in contagemPorDia) contagemPorDia[dia]++;
    });
    const maximo = Math.max(1, ...Object.values(contagemPorDia));

    area.innerHTML = `<div class="grafico-barras">
      ${dias.map(d => {
        const valor = contagemPorDia[d];
        const altura = Math.max(2, Math.round((valor / maximo) * 100));
        const [, mes, dia] = d.split("-");
        return `<div class="barra-dia" title="${valor} visita(s) em ${dia}/${mes}">
          <div class="barra" style="height:${altura}%"></div>
          <span class="rotulo-dia">${dia}/${mes}</span>
        </div>`;
      }).join("")}
    </div>`;
  }

  function renderOrigens(visitas) {
    const area = document.getElementById("areaOrigens");
    const contagem = {};
    visitas.forEach(v => { const o = (v.origem || "").trim() || "direto"; contagem[o] = (contagem[o] || 0) + 1; });
    const entradas = Object.entries(contagem).sort((a, b) => b[1] - a[1]);

    if (visitas.length === 0) {
      area.innerHTML = `<p class="vazio-explicativo">Ainda não há visitas registradas. Quando alguém acessar o seu portfólio, vai aparecer aqui de onde essa pessoa veio.</p>`;
      return;
    }

    const total = visitas.length;
    area.innerHTML = `<ul style="display:flex; flex-direction:column; gap:8px;">
      ${entradas.slice(0, 6).map(([origem, qtd]) => `
        <li style="display:flex; justify-content:space-between; font-size:.85rem;">
          <span>${escapeHtml(origem)}</span>
          <span style="color:var(--tinta-suave);">${qtd} · ${Math.round(qtd/total*100)}%</span>
        </li>
      `).join("")}
    </ul>`;
  }

  function renderTabelaVideos(videos) {
    const area = document.getElementById("areaTabelaVideos");

    if (videos.length === 0) {
      area.innerHTML = `
        <table class="tabela-admin">
          <thead><tr><th></th><th>Título</th><th>Marca</th><th>Nicho</th><th>Formato</th><th>Destaque</th><th>Visível</th><th></th></tr></thead>
          <tbody>
            <tr class="linha-exemplo">
              <td>${ICONES.alcinha(16)}</td>
              <td>Rotina de skincare noturna <span class="selo-exemplo">exemplo</span></td>
              <td>Marca Exemplo</td>
              <td>skincare</td>
              <td>Vídeo vertical 9:16</td>
              <td>2,4M views</td>
              <td>${ICONES.olhoAberto(16)}</td>
              <td></td>
            </tr>
          </tbody>
        </table>
        <p class="vazio-explicativo">Essa é uma linha de exemplo só pra você ver o formato. Adicione o seu primeiro vídeo real com o botão acima.</p>`;
      return;
    }

    area.innerHTML = `
      <table class="tabela-admin">
        <thead><tr><th></th><th>Título</th><th>Marca</th><th>Nicho</th><th>Formato</th><th>Destaque</th><th>Visível</th><th></th></tr></thead>
        <tbody id="corpoTabelaVideos">
          ${videos.map(v => linhaVideo(v)).join("")}
        </tbody>
      </table>`;

    const corpo = document.getElementById("corpoTabelaVideos");
    corpo.querySelectorAll("tr[data-id]").forEach((linha) => {
      const id = linha.dataset.id;
      linha.querySelector(".acao-editar").addEventListener("click", () => abrirFormularioVideo(videos.find(v => v.id === id)));
      linha.querySelector(".acao-apagar").addEventListener("click", () => apagarVideo(id));
      linha.querySelector(".acao-olho").addEventListener("click", () => alternarVisivel(id, videos));

      linha.addEventListener("dragstart", () => linha.classList.add("arrastando"));
      linha.addEventListener("dragend", () => linha.classList.remove("arrastando"));
    });

    ativarArrastar(corpo);
  }

  function linhaVideo(v) {
    return `
      <tr data-id="${v.id}" draggable="true">
        <td><span class="alcinha">${ICONES.alcinha(16)}</span></td>
        <td>${escapeHtml(v.titulo)}</td>
        <td>${escapeHtml(v.marca)}</td>
        <td>${escapeHtml(v.nicho)}</td>
        <td>${escapeHtml(v.formato)}</td>
        <td>${escapeHtml(v.destaque)}</td>
        <td><button class="btn-icone acao-olho" title="${v.visivel ? "Esconder do site" : "Mostrar no site"}">${v.visivel ? ICONES.olhoAberto(18) : ICONES.olhoFechado(18)}</button></td>
        <td class="celula-acoes">
          <button class="btn-icone acao-editar" title="Editar">${ICONES.lapis(16)}</button>
          <button class="btn-icone acao-apagar" title="Apagar">${ICONES.lixeira(16)}</button>
        </td>
      </tr>`;
  }

  function ativarArrastar(corpo) {
    corpo.addEventListener("dragover", (evento) => {
      evento.preventDefault();
      const arrastando = corpo.querySelector(".arrastando");
      const sobre = elementoAposY(corpo, evento.clientY);
      if (!arrastando) return;
      if (sobre == null) corpo.appendChild(arrastando);
      else corpo.insertBefore(arrastando, sobre);
    });

    corpo.addEventListener("drop", async () => {
      const linhas = [...corpo.querySelectorAll("tr[data-id]")];
      const atualizacoes = linhas.map((linha, indice) =>
        window.banco.from("videos").update({ ordem: indice }).eq("id", linha.dataset.id)
      );
      const resultados = await Promise.all(atualizacoes);
      if (resultados.some(r => r.error)) {
        mostrarToast("Não consegui salvar a nova ordem", "erro");
      } else {
        mostrarToast("Ordem atualizada");
      }
    });
  }

  function elementoAposY(container, y) {
    const linhas = [...container.querySelectorAll("tr[data-id]:not(.arrastando)")];
    return linhas.reduce((maisProximo, linha) => {
      const caixa = linha.getBoundingClientRect();
      const deslocamento = y - caixa.top - caixa.height / 2;
      if (deslocamento < 0 && deslocamento > maisProximo.deslocamento) {
        return { deslocamento, elemento: linha };
      }
      return maisProximo;
    }, { deslocamento: Number.NEGATIVE_INFINITY, elemento: null }).elemento;
  }

  async function alternarVisivel(id, videos) {
    const video = videos.find(v => v.id === id);
    const { error } = await window.banco.from("videos").update({ visivel: !video.visivel }).eq("id", id);
    if (error) { mostrarToast("Não consegui atualizar", "erro"); return; }
    render(document.getElementById("conteudoAba"));
  }

  async function apagarVideo(id) {
    if (!confirm("Apagar este vídeo? Ele some do site.")) return;
    const { error } = await window.banco.from("videos").delete().eq("id", id);
    if (error) { mostrarToast("Não consegui apagar", "erro"); return; }
    mostrarToast("Vídeo apagado");
    render(document.getElementById("conteudoAba"));
  }

  function abrirFormularioVideo(video) {
    const editando = !!video;
    abrirModalAdmin(editando ? "Editar vídeo" : "Adicionar vídeo", `
      <form id="formularioVideo">
        <div class="campo-admin">
          <label for="campoTituloVideo">Título</label>
          <input id="campoTituloVideo" required value="${attrEsc(video?.titulo || "")}">
        </div>
        <div class="campo-admin">
          <label for="campoLinkVideo">Link do vídeo</label>
          <input id="campoLinkVideo" type="url" required placeholder="https://..." value="${attrEsc(video?.link || "")}">
        </div>
        <div class="linha-campos">
          <div class="campo-admin">
            <label for="campoNichoVideo">Nicho</label>
            <input id="campoNichoVideo" value="${attrEsc(video?.nicho || "")}" placeholder="ex: beleza">
          </div>
          <div class="campo-admin">
            <label for="campoFormatoVideo">Formato</label>
            <input id="campoFormatoVideo" value="${attrEsc(video?.formato || "")}" placeholder="ex: Vídeo vertical 9:16">
          </div>
        </div>
        <div class="linha-campos">
          <div class="campo-admin">
            <label for="campoMarcaVideo">Marca</label>
            <input id="campoMarcaVideo" value="${attrEsc(video?.marca || "")}">
          </div>
          <div class="campo-admin">
            <label for="campoDestaqueVideo">Destaque (ex: 2,4M views)</label>
            <input id="campoDestaqueVideo" value="${attrEsc(video?.destaque || "")}" placeholder="deixe vazio se não for destaque">
          </div>
        </div>
        <div class="campo-admin" style="flex-direction:row; align-items:center; gap:8px;">
          <input type="checkbox" id="campoVisivelVideo" style="width:16px;height:16px;" ${video ? (video.visivel ? "checked" : "") : "checked"}>
          <label for="campoVisivelVideo" style="margin:0;">Visível no site</label>
        </div>
        <button type="submit" class="btn btn-primario">${editando ? "Salvar alterações" : "Adicionar vídeo"}</button>
      </form>
    `);

    document.getElementById("formularioVideo").addEventListener("submit", async (evento) => {
      evento.preventDefault();
      const dados = {
        titulo: document.getElementById("campoTituloVideo").value.trim(),
        link: document.getElementById("campoLinkVideo").value.trim(),
        nicho: document.getElementById("campoNichoVideo").value.trim(),
        formato: document.getElementById("campoFormatoVideo").value.trim(),
        marca: document.getElementById("campoMarcaVideo").value.trim(),
        destaque: document.getElementById("campoDestaqueVideo").value.trim(),
        visivel: document.getElementById("campoVisivelVideo").checked,
      };

      let resultado;
      if (editando) {
        resultado = await window.banco.from("videos").update(dados).eq("id", video.id);
      } else {
        dados.ordem = videosCache.length ? Math.max(...videosCache.map(v => v.ordem || 0)) + 1 : 0;
        resultado = await window.banco.from("videos").insert(dados);
      }

      if (resultado.error) { mostrarToast("Não consegui salvar: " + resultado.error.message, "erro"); return; }
      fecharModalAdmin();
      mostrarToast(editando ? "Vídeo atualizado" : "Vídeo adicionado");
      render(document.getElementById("conteudoAba"));
    });
  }

  return { render };
})();
