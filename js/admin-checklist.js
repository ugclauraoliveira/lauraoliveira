/* =========================================================
   ADMIN-CHECKLIST.JS
   Aba "Checklist Portfólio", com 5 sub-abas. O conteúdo (o
   que está escrito em cada item) vem inteiro de js/biblioteca.js
   (window.Biblioteca) e não é reescrito aqui.
========================================================= */

window.AdminChecklist = (function () {

  let marcadosSet = new Set();
  let subabaAtual = "checklist";

  async function render(container) {
    if (!window.Biblioteca) {
      container.innerHTML = `
        <div class="aviso-faltando">
          <span class="aviso-icone">${ICONES.aviso(20)}</span>
          <div>
            <strong>O arquivo js/biblioteca.js não foi encontrado.</strong>
            <p>Confira se ele existe na pasta js/ do projeto. O resto do painel continua funcionando normalmente.</p>
          </div>
        </div>`;
      return;
    }

    container.innerHTML = `
      <div class="subtabs">
        <button class="chip-filtro" data-sub="checklist">Checklist do portfólio</button>
        <button class="chip-filtro" data-sub="referencias">Referências de vídeo</button>
        <button class="chip-filtro" data-sub="roteiros">Roteiros</button>
        <button class="chip-filtro" data-sub="ideias">Ideias por nicho</button>
        <button class="chip-filtro" data-sub="revisao">Revisar meu roteiro</button>
      </div>
      <div id="areaSubChecklist"></div>
    `;

    container.querySelectorAll(".chip-filtro").forEach(chip => {
      chip.classList.toggle("ativo", chip.dataset.sub === subabaAtual);
      chip.addEventListener("click", () => {
        subabaAtual = chip.dataset.sub;
        container.querySelectorAll(".chip-filtro").forEach(c => c.classList.toggle("ativo", c.dataset.sub === subabaAtual));
        renderSubaba(container);
      });
    });

    const { data, error } = await window.banco.from("marcados").select("*");
    if (error) avisoFaltando(container, "marcados", error);
    marcadosSet = new Set((data || []).filter(m => m.marcado).map(m => m.chave));

    renderSubaba(container);
  }

  function renderSubaba(container) {
    const area = container.querySelector("#areaSubChecklist");
    if (subabaAtual === "checklist") renderChecklistPortfolio(area);
    else if (subabaAtual === "referencias") renderReferencias(area);
    else if (subabaAtual === "roteiros") renderRoteiros(area);
    else if (subabaAtual === "ideias") renderIdeias(area);
    else renderRevisao(area);
  }

  /* ---------- 1. CHECKLIST DO PORTFÓLIO ---------- */
  function renderChecklistPortfolio(area) {
    const secoes = window.Biblioteca.CHECKLIST;
    let totalItens = 0, totalMarcados = 0;
    secoes.forEach(s => s.itens.forEach((_, i) => { totalItens++; if (marcadosSet.has(`${s.id}::${i}`)) totalMarcados++; }));
    const percGeral = totalItens ? Math.round((totalMarcados / totalItens) * 100) : 0;

    area.innerHTML = `
      <div class="cartao">
        <div style="display:flex; align-items:center; gap:12px;">
          <strong style="font-size:.85rem;">Progresso geral</strong>
          <div class="barra-progresso" id="barraGeralChecklist" style="width:160px;"><div style="width:${percGeral}%"></div></div>
          <span id="percGeralChecklist" style="font-size:.8rem; color:var(--tinta-suave);">${percGeral}%</span>
        </div>
      </div>
      <div class="cartao" style="padding: 4px 20px;">
        ${secoes.map(s => {
          const total = s.itens.length;
          const marcadosSecao = s.itens.filter((_, i) => marcadosSet.has(`${s.id}::${i}`)).length;
          const perc = total ? Math.round((marcadosSecao / total) * 100) : 0;
          return `
          <div class="acordeao-item" data-secao="${s.id}">
            <button class="acordeao-cabeca">
              <span class="titulo-acordeao">${s.emoji} ${escapeHtml(s.nome)}</span>
              <span style="display:flex; align-items:center; gap:8px;">
                <span class="contagem-secao" style="font-size:.72rem; color:var(--tinta-suave);">${marcadosSecao}/${total}</span>
                <div class="barra-progresso"><div style="width:${perc}%"></div></div>
                <span class="seta-acordeao">${ICONES.setaBaixo(16)}</span>
              </span>
            </button>
            <div class="acordeao-corpo">
              <p style="font-size:.82rem; color:var(--tinta-suave); margin-bottom:4px;"><strong>Resumo:</strong> ${escapeHtml(s.resumo)}</p>
              <p style="font-size:.84rem; margin-bottom:14px;">${escapeHtml(s.porque)}</p>
              ${s.itens.map((item, i) => {
                const chave = `${s.id}::${i}`;
                const marcado = marcadosSet.has(chave);
                return `<label class="item-check ${marcado ? "marcado" : ""}">
                  <input type="checkbox" data-chave="${chave}" ${marcado ? "checked" : ""}>
                  <span class="texto-item"><strong>${escapeHtml(item.t)}</strong><p>${escapeHtml(item.d)}</p></span>
                </label>`;
              }).join("")}
            </div>
          </div>`;
        }).join("")}
      </div>
    `;

    area.querySelectorAll(".acordeao-cabeca").forEach(botao => {
      botao.addEventListener("click", () => botao.closest(".acordeao-item").classList.toggle("aberto"));
    });
    area.querySelectorAll("input[data-chave]").forEach(input => {
      input.addEventListener("change", async () => {
        input.closest(".item-check").classList.toggle("marcado", input.checked);
        await alternarMarcado(input.dataset.chave, input.checked);
        atualizarBarrasChecklist(area);
      });
    });
  }

  function atualizarBarrasChecklist(area) {
    const secoes = window.Biblioteca.CHECKLIST;
    let totalItens = 0, totalMarcados = 0;
    secoes.forEach(s => {
      let marcadosSecao = 0;
      s.itens.forEach((_, i) => { totalItens++; if (marcadosSet.has(`${s.id}::${i}`)) { marcadosSecao++; totalMarcados++; } });
      const item = area.querySelector(`.acordeao-item[data-secao="${s.id}"]`);
      if (item) {
        const perc = s.itens.length ? Math.round((marcadosSecao / s.itens.length) * 100) : 0;
        item.querySelector(".barra-progresso > div").style.width = perc + "%";
        item.querySelector(".contagem-secao").textContent = `${marcadosSecao}/${s.itens.length}`;
      }
    });
    const percGeral = totalItens ? Math.round((totalMarcados / totalItens) * 100) : 0;
    area.querySelector("#barraGeralChecklist > div").style.width = percGeral + "%";
    area.querySelector("#percGeralChecklist").textContent = percGeral + "%";
  }

  async function alternarMarcado(chave, marcado) {
    const { error } = await window.banco.from("marcados").upsert({ chave, marcado, atualizado_em: new Date().toISOString() });
    if (error) mostrarToast("Não consegui salvar essa marcação", "erro");
  }

  /* ---------- 2. REFERÊNCIAS DE VÍDEO ---------- */
  function renderReferencias(area) {
    const refs = window.Biblioteca.REFERENCIAS;
    area.innerHTML = `<div class="grade-referencias">
      ${refs.map(r => `
        <button class="card-referencia" data-ref="${r.id}">
          <div class="capa-vertical">${r.emoji}</div>
          <div class="info-referencia">
            <h4>${escapeHtml(r.titulo)}</h4>
            <span class="meta-referencia">${escapeHtml(r.estilo)} · ${escapeHtml(r.duracao)} · ${escapeHtml(r.marca)}</span>
          </div>
        </button>`).join("")}
    </div>`;

    area.querySelectorAll("[data-ref]").forEach(botao => {
      botao.addEventListener("click", () => {
        const r = refs.find(x => x.id === botao.dataset.ref);
        abrirModalAdmin(escapeHtml(r.titulo), `
          <div class="ficha-roteiro">
            <p><strong>Gancho:</strong> ${escapeHtml(r.gancho)}</p>
            <h5>Por que funciona</h5><p>${escapeHtml(r.porque)}</p>
            <h5>Diferencial</h5><p>${escapeHtml(r.diferencial)}</p>
            <h5>Erro comum</h5><p>${escapeHtml(r.erro)}</p>
            <h5>Roteiro em blocos</h5>
            ${r.roteiro.map(b => `<div class="bloco-tempo"><span class="marca-tempo">${escapeHtml(b.t)}</span><div>${b.o}</div></div>`).join("")}
            <a class="btn btn-primario" href="${attrEsc(r.youtube)}" target="_blank" rel="noopener" style="margin-top:16px;">Assistir</a>
          </div>
        `);
      });
    });
  }

  /* ---------- 3. ROTEIROS ---------- */
  function renderRoteiros(area) {
    const tipos = window.Biblioteca.TIPOS;
    area.innerHTML = `<div class="cartao" style="padding: 4px 20px;">
      ${tipos.map(t => `
        <div class="acordeao-item acordeao-tipo">
          <button class="acordeao-cabeca">
            <span class="titulo-acordeao">${t.emoji} ${escapeHtml(t.nome)}</span>
            <span style="display:flex; align-items:center; gap:8px;">
              <span style="font-size:.72rem; color:var(--tinta-suave);">${escapeHtml(t.duracao)}</span>
              <span class="seta-acordeao">${ICONES.setaBaixo(16)}</span>
            </span>
          </button>
          <div class="acordeao-corpo">
            <p class="quando-usar">${escapeHtml(t.porque)}</p>
            ${t.beats.map(b => `<div class="bloco-tempo"><span class="marca-tempo">${escapeHtml(b.t)}</span><div>${b.o}</div></div>`).join("")}
            <h5 style="margin-top:14px;">Erros comuns</h5>
            <ul class="lista-erros">${t.erros.map(e => `<li>${escapeHtml(e)}</li>`).join("")}</ul>
          </div>
        </div>
      `).join("")}
    </div>`;

    area.querySelectorAll(".acordeao-cabeca").forEach(botao => {
      botao.addEventListener("click", () => botao.closest(".acordeao-item").classList.toggle("aberto"));
    });
  }

  /* ---------- 4. IDEIAS POR NICHO ---------- */
  function renderIdeias(area) {
    const nichos = window.Biblioteca.NICHOS;
    const comoUsar = window.Biblioteca.COMO_USAR || [];
    area.innerHTML = `
      ${comoUsar.length ? `<div class="cartao">
        <h2>Como usar esses ganchos</h2>
        <ul class="lista-erros" style="padding-left:18px;">${comoUsar.map(t => `<li>${escapeHtml(t)}</li>`).join("")}</ul>
      </div>` : ""}
      ${nichos.map(n => `
        <div class="cartao nicho-bloco">
          <div class="nicho-titulo">${n.emoji} <span>${escapeHtml(n.nome)}</span></div>
          <div class="grade-ideias">
            ${n.ideias.map(i => `<div class="card-ideia"><strong>${escapeHtml(i.t)}</strong><p>"${escapeHtml(i.gancho)}"</p></div>`).join("")}
          </div>
        </div>
      `).join("")}
    `;
  }

  /* ---------- 5. REVISAR MEU ROTEIRO ---------- */
  function renderRevisao(area) {
    const blocos = window.Biblioteca.REVISAO;
    area.innerHTML = `
      <div class="cartao">
        <h2>Cole seu roteiro aqui</h2>
        <textarea class="revisar-textarea" placeholder="Cole aqui o texto do seu roteiro pra conferir item por item ao lado."></textarea>
      </div>
      ${blocos.map(bloco => `
        <div class="cartao bloco-revisao">
          <h4>${bloco.emoji} ${escapeHtml(bloco.bloco)}</h4>
          ${bloco.itens.map(item => `
            <label class="item-check">
              <input type="checkbox">
              <span class="texto-item"><strong>${escapeHtml(item.t)}</strong><p>${escapeHtml(item.d)}</p></span>
            </label>`).join("")}
        </div>
      `).join("")}
    `;
    area.querySelectorAll(".item-check input").forEach(input => {
      input.addEventListener("change", () => input.closest(".item-check").classList.toggle("marcado", input.checked));
    });
  }

  return { render };
})();
