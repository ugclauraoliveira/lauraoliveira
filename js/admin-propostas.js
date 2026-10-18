/* =========================================================
   ADMIN-PROPOSTAS.JS
   Aba "Propostas": monta uma proposta com itens de serviço,
   gera um link público (que o cliente abre sem login), manda
   por WhatsApp, exporta em PDF e guarda o histórico.
========================================================= */

window.AdminPropostas = (function () {

  const SERVICOS_PRONTOS = [
    { nome: "Vídeo UGC", valor: 0 },
    { nome: "Pacote de Stories", valor: 0 },
    { nome: "Publicidade no Instagram", valor: 0 },
    { nome: "Criativos para tráfego", valor: 0 },
  ];
  const FORMAS_PAGAMENTO_PADRAO = "50% na contratação + 50% na aprovação do roteiro";
  const STATUS_PROPOSTA = ["enviada", "aceita", "recusada"];

  let servicosPadraoCache = [];
  let propostasCache = [];
  let itensAtual = [];
  let propostaEditandoId = null;
  let tokenAtual = null;
  let modoAba = "editar";

  function $(id) { return document.getElementById(id); }

  async function render(container) {
    container.innerHTML = `
      <div class="cartao">
        <div class="grupo-modo-prospeccao" style="margin-bottom:0;">
          <button type="button" class="botao-modo-prospeccao ativo" id="botaoAbaEditarProp">Editar</button>
          <button type="button" class="botao-modo-prospeccao" id="botaoAbaPreviaProp">Prévia</button>
        </div>
      </div>

      <div id="areaEditarProp">
        <div class="cartao">
          <h2>Cliente</h2>
          <div class="linha-campos">
            <div class="campo-admin">
              <label for="campoClienteNomeProp">Nome do cliente ou marca</label>
              <input id="campoClienteNomeProp" required>
            </div>
            <div class="campo-admin">
              <label for="campoClienteWhatsappProp">WhatsApp (opcional)</label>
              <input id="campoClienteWhatsappProp" placeholder="(43) 90000-0000">
            </div>
          </div>
        </div>

        <div class="cartao">
          <h2>Serviços</h2>
          <div class="barra-filtros" id="botoesServicosProntosProp" style="margin-bottom:14px;"></div>
          <div id="areaItensProp"></div>
          <button type="button" class="btn btn-secundario" id="botaoAddItemEmBrancoProp" style="margin-top:8px;">${ICONES.mais(16)} Adicionar item em branco</button>

          <div class="linha-campos" style="margin-top:18px;">
            <div class="campo-admin">
              <label for="campoDescontoProp">Desconto em R$ (opcional)</label>
              <input id="campoDescontoProp" type="number" min="0" step="0.01" value="0">
            </div>
            <div class="campo-admin">
              <label for="campoDescontoPercentProp">Desconto em % (opcional)</label>
              <input id="campoDescontoPercentProp" type="number" min="0" max="100" step="0.01" placeholder="Ex: 10">
            </div>
          </div>
          <div class="campo-admin">
            <label>Total</label>
            <div id="textoTotalProp" style="font-family:var(--serif); font-size:1.4rem; color:var(--terracota-escuro); padding-top:6px;">R$ 0,00</div>
          </div>
        </div>

        <div class="cartao">
          <h2>Condições</h2>
          <div class="campo-admin">
            <label for="campoPrazoEntregaProp">Prazo de entrega</label>
            <input id="campoPrazoEntregaProp" placeholder="Ex: até 5 dias úteis após a gravação">
          </div>
          <div class="campo-admin">
            <label for="campoFormasPagamentoProp">Formas de pagamento</label>
            <textarea id="campoFormasPagamentoProp" style="min-height:70px;">${escapeHtml(FORMAS_PAGAMENTO_PADRAO)}</textarea>
          </div>
          <div class="campo-admin">
            <label for="campoComoFuncionaProp">Como funciona depois do aceite (um passo por linha)</label>
            <textarea id="campoComoFuncionaProp" style="min-height:90px;" placeholder="Você aprova o roteiro&#10;Eu gravo e edito&#10;Te envio o vídeo pronto"></textarea>
          </div>
        </div>

        <div class="cartao">
          <div class="campo-admin">
            <label for="campoObservacoesProp">Observações (opcional)</label>
            <textarea id="campoObservacoesProp" placeholder="Ex: uma rodada de ajuste incluída, direitos de uso por 6 meses"></textarea>
          </div>
          <div class="campo-admin" style="max-width:160px;">
            <label for="campoValidadeProp">Validade (dias)</label>
            <input id="campoValidadeProp" type="number" min="1" value="7">
          </div>
        </div>

        <div class="cartao">
          <div style="display:flex; gap:10px; flex-wrap:wrap;">
            <button type="button" class="btn btn-primario" id="botaoSalvarProp">Salvar</button>
            <button type="button" class="btn btn-secundario" id="botaoLinkProp">${ICONES.enviar(16)} Gerar link da proposta</button>
            <button type="button" class="btn btn-secundario" id="botaoPdfProp">Salvar em PDF</button>
            <button type="button" class="btn btn-secundario" id="botaoWhatsappProp">${ICONES.whatsapp(16)} Enviar por WhatsApp</button>
            <button type="button" class="btn btn-secundario" id="botaoNovaProp" style="margin-left:auto;">+ Nova proposta</button>
          </div>
          <div id="areaLinkGeradoProp" style="margin-top:12px;"></div>
        </div>
      </div>

      <div id="areaPreviaProp" hidden>
        <div class="cartao" style="background:var(--linho-escuro);">
          <div id="previaPropostaConteudo" style="max-width:560px; margin:0 auto;"></div>
        </div>
      </div>

      <div class="cartao" style="margin-top:20px;">
        <div class="barra-filtros">
          <h2 style="flex:1;">Histórico de propostas</h2>
          <div class="campo-busca">
            ${ICONES.busca(16)}
            <input type="text" id="campoBuscaHistoricoProp" placeholder="Buscar por cliente">
          </div>
        </div>
        <div class="tabela-wrap">
          <table class="tabela-admin">
            <thead><tr><th>Cliente</th><th>Total</th><th>Status</th><th>Criada em</th><th></th></tr></thead>
            <tbody id="corpoHistoricoProp"><tr><td colspan="5" class="vazio-explicativo">Carregando...</td></tr></tbody>
          </table>
        </div>
      </div>
    `;

    ligarEventos();
    iniciarNovaProposta();

    const [servicosResultado, propostasResultado] = await Promise.all([
      window.banco.from("servicos_padrao").select("*").order("ordem", { ascending: true }),
      window.banco.from("propostas").select("*").order("criado_em", { ascending: false }),
    ]);

    if (servicosResultado.error) avisoFaltando(container, "servicos_padrao (rode o adicionar-propostas.sql)", servicosResultado.error);
    if (propostasResultado.error) avisoFaltando(container, "propostas (rode o adicionar-propostas.sql)", propostasResultado.error);

    servicosPadraoCache = servicosResultado.data || [];
    propostasCache = propostasResultado.data || [];

    renderBotoesServicos();
    renderHistorico();
  }

  function ligarEventos() {
    $("botaoAbaEditarProp").addEventListener("click", () => alternarAba("editar"));
    $("botaoAbaPreviaProp").addEventListener("click", () => alternarAba("previa"));
    $("botaoAddItemEmBrancoProp").addEventListener("click", () => adicionarItem({ descricao: "", valor: 0 }));
    $("botaoSalvarProp").addEventListener("click", () => salvarProposta(false));
    $("botaoLinkProp").addEventListener("click", gerarLink);
    $("botaoPdfProp").addEventListener("click", salvarEmPdf);
    $("botaoWhatsappProp").addEventListener("click", enviarPorWhatsapp);
    $("botaoNovaProp").addEventListener("click", () => { iniciarNovaProposta(); mostrarToast("Formulário limpo pra uma proposta nova"); });
    $("campoDescontoProp").addEventListener("input", atualizarTotal);
    $("campoDescontoPercentProp").addEventListener("input", () => {
      const percentual = Number($("campoDescontoPercentProp").value) || 0;
      $("campoDescontoProp").value = (Math.round(subtotalItens() * (percentual / 100) * 100) / 100).toFixed(2);
      atualizarTotal();
    });
    $("campoBuscaHistoricoProp").addEventListener("input", () => renderHistorico($("campoBuscaHistoricoProp").value));

    ["campoClienteNomeProp", "campoClienteWhatsappProp", "campoPrazoEntregaProp", "campoFormasPagamentoProp", "campoComoFuncionaProp", "campoObservacoesProp", "campoValidadeProp", "campoDescontoProp"].forEach((id) => {
      $(id).addEventListener("input", () => { if (modoAba === "previa") renderizarPreviaAgora(); });
    });
  }

  function alternarAba(modo) {
    modoAba = modo;
    $("botaoAbaEditarProp").classList.toggle("ativo", modo === "editar");
    $("botaoAbaPreviaProp").classList.toggle("ativo", modo === "previa");
    $("areaEditarProp").hidden = modo !== "editar";
    $("areaPreviaProp").hidden = modo !== "previa";
    if (modo === "previa") renderizarPreviaAgora();
  }

  /* ---------- ITENS DE SERVIÇO ---------- */

  function renderBotoesServicos() {
    const area = $("botoesServicosProntosProp");
    const todos = SERVICOS_PRONTOS.concat(servicosPadraoCache.map((s) => ({ nome: s.nome, descricao: s.descricao, valor: s.valor, salvo: true })));
    area.innerHTML = todos.map((s, i) => `<button type="button" class="chip-filtro" data-indice-servico="${i}">${escapeHtml(s.nome)}</button>`).join("");
    area.querySelectorAll("[data-indice-servico]").forEach((botao) => {
      botao.addEventListener("click", () => {
        const s = todos[Number(botao.dataset.indiceServico)];
        adicionarItem({ descricao: s.descricao || s.nome, valor: s.valor || 0 });
      });
    });
  }

  function adicionarItem(item) {
    itensAtual.push({ descricao: item.descricao || "", valor: Number(item.valor) || 0, quantidade: Number(item.quantidade) || 1 });
    renderItens();
    atualizarTotal();
  }

  function renderItens() {
    const area = $("areaItensProp");
    if (itensAtual.length === 0) {
      area.innerHTML = `<p class="vazio-explicativo" style="text-align:left; padding:8px 0;">Nenhum item ainda. Use os botões acima ou adicione um item em branco.</p>`;
      return;
    }
    area.innerHTML = itensAtual.map((item, i) => {
      const quantidade = Number(item.quantidade) || 1;
      const valor = Number(item.valor) || 0;
      return `
      <div data-item="${i}" style="display:flex; flex-wrap:wrap; gap:10px; align-items:flex-end; margin-bottom:8px;">
        <div class="campo-admin" style="flex:2; min-width:160px; margin-bottom:0;">
          <label>Descrição</label>
          <input data-campo-item="descricao" data-indice="${i}" value="${attrEsc(item.descricao)}">
        </div>
        <div class="campo-admin" style="width:90px; margin-bottom:0;">
          <label>Quantidade</label>
          <input data-campo-item="quantidade" data-indice="${i}" type="number" min="1" step="1" value="${quantidade}">
        </div>
        <div class="campo-admin" style="width:140px; margin-bottom:0;">
          <label>Valor unitário (R$)</label>
          <input data-campo-item="valor" data-indice="${i}" type="number" min="0" step="0.01" value="${valor}">
        </div>
        <span data-subtotal-item="${i}" style="font-size:.8rem; color:var(--tinta-suave); padding-bottom:10px;">${formatarMoeda(valor * quantidade)}</span>
        <button type="button" class="btn-icone" data-remover-item="${i}" title="Remover item">${ICONES.lixeira(16)}</button>
      </div>
    `;
    }).join("");

    area.querySelectorAll("[data-campo-item]").forEach((input) => {
      input.addEventListener("input", () => {
        const i = Number(input.dataset.indice);
        const campo = input.dataset.campoItem;
        itensAtual[i][campo] = campo === "descricao" ? input.value : Number(input.value) || 0;
        const subtotalSpan = area.querySelector(`[data-subtotal-item="${i}"]`);
        if (subtotalSpan) subtotalSpan.textContent = formatarMoeda((Number(itensAtual[i].valor) || 0) * (Number(itensAtual[i].quantidade) || 1));
        atualizarTotal();
      });
    });
    area.querySelectorAll("[data-remover-item]").forEach((botao) => {
      botao.addEventListener("click", () => {
        itensAtual.splice(Number(botao.dataset.removerItem), 1);
        renderItens();
        atualizarTotal();
      });
    });
  }

  function subtotalItens() {
    return itensAtual.reduce((soma, item) => soma + (Number(item.valor) || 0) * (Number(item.quantidade) || 1), 0);
  }

  function calcularTotal() {
    const desconto = Number($("campoDescontoProp").value) || 0;
    return Math.max(0, subtotalItens() - desconto);
  }

  function atualizarTotal() {
    $("textoTotalProp").textContent = formatarMoeda(calcularTotal());
    if (modoAba === "previa") renderizarPreviaAgora();
  }

  /* ---------- FORMULÁRIO (ler / preencher) ---------- */

  function iniciarNovaProposta() {
    propostaEditandoId = null;
    tokenAtual = null;
    itensAtual = [];
    $("campoClienteNomeProp").value = "";
    $("campoClienteWhatsappProp").value = "";
    $("campoDescontoProp").value = "0";
    $("campoDescontoPercentProp").value = "";
    $("campoPrazoEntregaProp").value = "";
    $("campoFormasPagamentoProp").value = FORMAS_PAGAMENTO_PADRAO;
    $("campoComoFuncionaProp").value = "";
    $("campoObservacoesProp").value = "";
    $("campoValidadeProp").value = "7";
    $("areaLinkGeradoProp").innerHTML = "";
    renderItens();
    atualizarTotal();
  }

  function carregarPropostaNoFormulario(p) {
    propostaEditandoId = p.id;
    tokenAtual = p.token;
    itensAtual = Array.isArray(p.itens) ? JSON.parse(JSON.stringify(p.itens)) : [];
    $("campoClienteNomeProp").value = p.cliente_nome || "";
    $("campoClienteWhatsappProp").value = p.cliente_whatsapp || "";
    $("campoDescontoProp").value = p.desconto || 0;
    $("campoDescontoPercentProp").value = "";
    $("campoPrazoEntregaProp").value = p.prazo_entrega || "";
    $("campoFormasPagamentoProp").value = p.formas_pagamento || FORMAS_PAGAMENTO_PADRAO;
    $("campoComoFuncionaProp").value = p.como_funciona || "";
    $("campoObservacoesProp").value = p.observacoes || "";
    $("campoValidadeProp").value = p.validade_dias || 7;
    renderItens();
    atualizarTotal();
    mostrarLinkGerado(p.token);
    alternarAba("editar");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function dadosDoFormulario() {
    return {
      cliente_nome: $("campoClienteNomeProp").value.trim(),
      cliente_whatsapp: $("campoClienteWhatsappProp").value.trim(),
      itens: itensAtual.filter((i) => i.descricao.trim() !== ""),
      desconto: Number($("campoDescontoProp").value) || 0,
      total: calcularTotal(),
      prazo_entrega: $("campoPrazoEntregaProp").value.trim(),
      formas_pagamento: $("campoFormasPagamentoProp").value.trim(),
      como_funciona: $("campoComoFuncionaProp").value.trim(),
      observacoes: $("campoObservacoesProp").value.trim(),
      validade_dias: Number($("campoValidadeProp").value) || 7,
    };
  }

  /* ---------- SALVAR / LINK / PDF / WHATSAPP ---------- */

  async function salvarProposta(silencioso) {
    const dados = dadosDoFormulario();
    if (!dados.cliente_nome) {
      mostrarToast("Preencha o nome do cliente antes de salvar", "erro");
      return null;
    }

    let resultado;
    if (propostaEditandoId) {
      resultado = await window.banco.from("propostas").update({ ...dados, atualizado_em: new Date().toISOString() }).eq("id", propostaEditandoId).select().single();
    } else {
      resultado = await window.banco.from("propostas").insert(dados).select().single();
    }

    if (resultado.error) {
      mostrarToast("Não consegui salvar: " + resultado.error.message, "erro");
      return null;
    }

    propostaEditandoId = resultado.data.id;
    tokenAtual = resultado.data.token;
    if (!silencioso) mostrarToast("Proposta salva");

    const { data } = await window.banco.from("propostas").select("*").order("criado_em", { ascending: false });
    propostasCache = data || [];
    renderHistorico($("campoBuscaHistoricoProp").value);

    return resultado.data;
  }

  function linkPublico(token, extra) {
    const base = window.location.origin + window.location.pathname.replace(/admin\/.*$/, "proposta/");
    return `${base}?id=${encodeURIComponent(token)}${extra ? "&" + extra : ""}`;
  }

  function mostrarLinkGerado(token) {
    $("areaLinkGeradoProp").innerHTML = `
      <div class="contador-destinatarios-prospeccao" style="display:flex; align-items:center; gap:10px; flex-wrap:wrap;">
        <span style="word-break:break-all;">${escapeHtml(linkPublico(token))}</span>
        <button type="button" class="btn btn-secundario" id="botaoCopiarLinkProp" style="margin-left:auto;">${ICONES.copiar(16)} Copiar</button>
      </div>`;
    $("botaoCopiarLinkProp").addEventListener("click", () => {
      navigator.clipboard.writeText(linkPublico(token))
        .then(() => mostrarToast("Link copiado"))
        .catch(() => mostrarToast("Não consegui copiar sozinho, selecione o texto", "erro"));
    });
  }

  async function gerarLink() {
    const salvo = await salvarProposta(true);
    if (!salvo) return;
    mostrarLinkGerado(salvo.token);
    mostrarToast("Link gerado e proposta salva");
  }

  async function salvarEmPdf() {
    const salvo = await salvarProposta(true);
    if (!salvo) return;
    window.open(linkPublico(salvo.token, "imprimir=1"), "_blank", "noopener");
  }

  async function enviarPorWhatsapp() {
    const salvo = await salvarProposta(true);
    if (!salvo) return;
    const link = linkPublico(salvo.token);
    const mensagem = `Oi! Preparei uma proposta pra gente trabalhar juntos. Dá uma olhada: ${link}`;
    const digitos = (salvo.cliente_whatsapp || "").replace(/\D/g, "");
    const numero = digitos ? (digitos.length <= 11 ? "55" + digitos : digitos) : "";
    window.open(`https://wa.me/${numero}?text=${encodeURIComponent(mensagem)}`, "_blank", "noopener");
  }

  /* ---------- PRÉVIA ---------- */

  function renderizarPreviaAgora() {
    const dados = dadosDoFormulario();
    const subtotal = subtotalItens();
    const passos = (dados.como_funciona || "").split("\n").map((l) => l.trim()).filter(Boolean);
    const nomeExemplo = dados.cliente_nome || "Cliente Exemplo";

    $("previaPropostaConteudo").innerHTML = `
      <div class="janela-proposta">
        <div class="proposta-topo">
          <span class="eyebrow">proposta de parceria</span>
          <h1>Pra ${escapeHtml(nomeExemplo)}</h1>
        </div>
        <div class="proposta-corpo">
          <div class="bloco-proposta">
            <h2>Serviços</h2>
            ${itensAtual.filter((i) => i.descricao).map((item) => {
              const quantidade = Number(item.quantidade) || 1;
              const valor = Number(item.valor) || 0;
              return `<div class="linha-item-proposta"><span>${quantidade > 1 ? `${quantidade}x ` : ""}${escapeHtml(item.descricao)}</span><span>${formatarMoeda(valor * quantidade)}</span></div>`;
            }).join("") || `<p class="vazio-explicativo" style="text-align:left; padding:0;">Adicione itens na aba Editar.</p>`}
            ${dados.desconto > 0 ? `<div class="linha-desconto-proposta"><span>Desconto</span><span>- ${formatarMoeda(dados.desconto)}</span></div>` : ""}
            <div class="linha-total-proposta"><span>Total</span><span>${formatarMoeda(Math.max(0, subtotal - dados.desconto))}</span></div>
          </div>
          ${dados.prazo_entrega ? `<div class="bloco-proposta"><h2>Prazo de entrega</h2><p style="margin:0;">${escapeHtml(dados.prazo_entrega)}</p></div>` : ""}
          ${dados.formas_pagamento ? `<div class="bloco-proposta"><h2>Formas de pagamento</h2><p style="margin:0;">${escapeHtml(dados.formas_pagamento)}</p></div>` : ""}
          ${passos.length ? `<div class="bloco-proposta"><h2>Como funciona depois do aceite</h2><ol class="lista-passos-proposta">${passos.map((p) => `<li>${escapeHtml(p)}</li>`).join("")}</ol></div>` : ""}
          ${dados.observacoes ? `<div class="bloco-proposta"><h2>Observações</h2><p style="margin:0;">${escapeHtml(dados.observacoes)}</p></div>` : ""}
        </div>
        <p class="nota-validade-proposta">Proposta válida por ${dados.validade_dias} dia(s) após o envio.</p>
        <div class="rodape-proposta">
          <p style="margin:0 0 8px;">Dúvidas? Chama no WhatsApp.</p>
          <a href="#">(43) 99974-7945</a>
        </div>
      </div>
    `;
  }

  /* ---------- HISTÓRICO ---------- */

  function renderHistorico(filtro) {
    const area = $("corpoHistoricoProp");
    if (!area) return;
    const termo = (filtro || "").toLowerCase().trim();

    if (propostasCache.length === 0) {
      area.innerHTML = `
        <tr class="linha-exemplo">
          <td>Cliente Exemplo <span class="selo-exemplo">exemplo</span></td>
          <td>${formatarMoeda(500)}</td>
          <td><span class="pilula pilula-lead">Enviada</span></td>
          <td>${formatarData(dataDeHoje())}</td>
          <td></td>
        </tr>`;
      return;
    }

    const lista = !termo ? propostasCache : propostasCache.filter((p) => (p.cliente_nome || "").toLowerCase().includes(termo));
    if (lista.length === 0) {
      area.innerHTML = `<tr><td colspan="5" class="vazio-explicativo">Nenhuma proposta encontrada.</td></tr>`;
      return;
    }

    const corStatus = { enviada: "pilula-lead", aceita: "pilula-cliente", recusada: "pilula-parada" };
    area.innerHTML = lista.map((p) => `
      <tr data-id="${p.id}" style="cursor:pointer;">
        <td>${escapeHtml(p.cliente_nome)}</td>
        <td>${formatarMoeda(p.total)}</td>
        <td>
          <select data-status="${p.id}" class="${corStatus[p.status] || "pilula-lead"}" style="border:none; background:transparent; font-size:.8rem; font-weight:500;">
            ${STATUS_PROPOSTA.map((s) => `<option value="${s}" ${p.status === s ? "selected" : ""}>${s.charAt(0).toUpperCase() + s.slice(1)}</option>`).join("")}
          </select>
        </td>
        <td>${formatarData(p.criado_em)}</td>
        <td class="celula-acoes">
          <a class="btn-icone" href="${linkPublico(p.token)}" target="_blank" rel="noopener" title="Abrir link público" onclick="event.stopPropagation()">${ICONES.enviar(16)}</a>
          <button class="btn-icone" data-duplicar="${p.id}" title="Duplicar">${ICONES.copiar(16)}</button>
          <button class="btn-icone" data-apagar="${p.id}" title="Apagar">${ICONES.lixeira(16)}</button>
        </td>
      </tr>
    `).join("");

    area.querySelectorAll("tr[data-id]").forEach((linha) => {
      linha.addEventListener("click", (evento) => {
        if (evento.target.closest("select") || evento.target.closest("button") || evento.target.closest("a")) return;
        const p = propostasCache.find((x) => x.id === linha.dataset.id);
        if (p) carregarPropostaNoFormulario(p);
      });
    });
    area.querySelectorAll("[data-status]").forEach((select) => {
      select.addEventListener("click", (evento) => evento.stopPropagation());
      select.addEventListener("change", () => atualizarStatus(select.dataset.status, select.value));
    });
    area.querySelectorAll("[data-duplicar]").forEach((botao) => {
      botao.addEventListener("click", (evento) => { evento.stopPropagation(); duplicarProposta(botao.dataset.duplicar); });
    });
    area.querySelectorAll("[data-apagar]").forEach((botao) => {
      botao.addEventListener("click", (evento) => { evento.stopPropagation(); apagarProposta(botao.dataset.apagar); });
    });
  }

  async function atualizarStatus(id, novoStatus) {
    const { error } = await window.banco.from("propostas").update({ status: novoStatus, atualizado_em: new Date().toISOString() }).eq("id", id);
    if (error) { mostrarToast("Não consegui atualizar", "erro"); return; }
    const p = propostasCache.find((x) => x.id === id);
    if (p) p.status = novoStatus;

    if (novoStatus === "aceita" && p) {
      if (window.AdminFinanceiro) {
        if (confirm(`Proposta aceita! Quer criar o lançamento de ${formatarMoeda(p.total)} pra "${p.cliente_nome}" no Financeiro?`)) {
          const resultado = await window.AdminFinanceiro.criarLancamentoDeProposta(p);
          if (resultado.error) mostrarToast("Não consegui criar o lançamento: " + resultado.error.message, "erro");
          else mostrarToast("Lançamento criado no Financeiro");
        } else {
          mostrarToast("Status atualizado");
        }
      } else {
        mostrarToast("Proposta aceita! Quando o Financeiro estiver pronto, vou te oferecer criar o lançamento automaticamente.");
      }
    } else {
      mostrarToast("Status atualizado");
    }
  }

  async function duplicarProposta(id) {
    const original = propostasCache.find((x) => x.id === id);
    if (!original) return;
    const copia = {
      cliente_nome: original.cliente_nome,
      cliente_whatsapp: original.cliente_whatsapp,
      itens: original.itens,
      desconto: original.desconto,
      total: original.total,
      prazo_entrega: original.prazo_entrega,
      formas_pagamento: original.formas_pagamento,
      como_funciona: original.como_funciona,
      observacoes: original.observacoes,
      validade_dias: original.validade_dias,
      status: "enviada",
    };
    const resultado = await window.banco.from("propostas").insert(copia).select().single();
    if (resultado.error) { mostrarToast("Não consegui duplicar: " + resultado.error.message, "erro"); return; }
    mostrarToast("Proposta duplicada, já aberta pra você editar");
    carregarPropostaNoFormulario(resultado.data);
    const { data } = await window.banco.from("propostas").select("*").order("criado_em", { ascending: false });
    propostasCache = data || [];
    renderHistorico();
  }

  async function apagarProposta(id) {
    if (!confirm("Apagar esta proposta? O link público dela para de funcionar.")) return;
    const { error } = await window.banco.from("propostas").delete().eq("id", id);
    if (error) { mostrarToast("Não consegui apagar", "erro"); return; }
    propostasCache = propostasCache.filter((p) => p.id !== id);
    if (propostaEditandoId === id) iniciarNovaProposta();
    renderHistorico($("campoBuscaHistoricoProp").value);
    mostrarToast("Proposta apagada");
  }

  return { render };
})();
