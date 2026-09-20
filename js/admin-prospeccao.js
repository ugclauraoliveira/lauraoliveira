/* =========================================================
   ADMIN-PROSPECCAO.JS
   Aba "Prospecção": manda o e-mail de apresentação da Laura
   para várias marcas da tabela "marcas" de uma vez, chamando
   cada uma pelo nome. Funciona via Resend (automático) ou em
   modo rascunho (fila que abre o Gmail pronto pra enviar).
========================================================= */

window.AdminProspeccao = (function () {

  const EMAIL_AUTORIZADO = "ugclauraoliveira@gmail.com";
  const TAMANHO_LOTE_DISPARO = 100;

  let marcasCache = [];
  let modoComposicao = "texto"; // "texto" ou "html"
  let modoEnvio = "resend"; // "resend" ou "rascunho"
  let filaRascunho = [];
  let indiceFila = 0;
  let historicoCache = [];
  let destinatariosPendentes = null;
  let templatePendente = null;

  function $(id) { return document.getElementById(id); }

  /* ---------- RENDER PRINCIPAL ---------- */

  async function render(container) {
    container.innerHTML = `
      <div class="capa-prospeccao">
        <div class="capa-prospeccao-topo">
          <div>
            <div class="capa-icone-prospeccao">${ICONES.envelope(24)}</div>
            <h2>Prospecção</h2>
            <p>Manda o seu e-mail de apresentação pra várias marcas da sua base de uma vez, já chamando cada uma pelo nome.</p>
          </div>
          <div>
            <div class="capa-numero-grande" id="numeroTotalEnviadosProsp">—</div>
            <div class="capa-numero-legenda">enviados até agora</div>
          </div>
        </div>
        <div class="capa-etiquetas">
          <span class="etiqueta-capa">teste antes sempre</span>
          <span class="etiqueta-capa">a chave vive no Supabase</span>
          <span class="etiqueta-capa">quem responde SAIR sai da lista</span>
        </div>
      </div>

      <div class="grade-metricas-prospeccao">
        <div class="cartao-metrica-prospeccao" style="--tarja: var(--terracota);">
          <div class="numero" id="metricaComEmailProsp">—</div>
          <div class="rotulo">marcas com e-mail</div>
        </div>
        <div class="cartao-metrica-prospeccao" style="--tarja: var(--oliva);">
          <div class="numero" id="metricaAEnviarProsp">—</div>
          <div class="rotulo">a enviar</div>
          <div class="contexto">com e-mail, nunca contatadas</div>
        </div>
        <div class="cartao-metrica-prospeccao" style="--tarja: var(--amarelo-texto);">
          <div class="numero" id="metricaJaReceberamProsp">—</div>
          <div class="rotulo">já receberam</div>
        </div>
        <div class="cartao-metrica-prospeccao" style="--tarja: var(--vermelho-suave);">
          <div class="numero" id="metricaFalhasProsp">—</div>
          <div class="rotulo">falhas de envio</div>
        </div>
        <div class="cartao-metrica-prospeccao" style="--tarja: var(--azul-suave);">
          <div class="numero" id="metricaDescadastradosProsp">—</div>
          <div class="rotulo">descadastrados</div>
        </div>
      </div>

      <div id="avisoBaseSemEmailProsp"></div>

      <div class="grade-prospeccao" id="areaFormularioProsp">
        <div class="coluna-formulario-prospeccao">

          <div class="cartao">
            <h2>Pra quem vai</h2>
            <p class="vazio-explicativo" style="text-align:left; padding:0 0 10px;">Os e-mails vêm da sua aba Marcas.</p>
            <div class="campo-admin">
              <label for="selectDestinatariosProsp">Enviar para</label>
              <select id="selectDestinatariosProsp"></select>
            </div>
            <div class="contador-destinatarios-prospeccao" id="contadorDestinatariosProsp">Carregando marcas...</div>
            <label style="display:flex; align-items:center; gap:8px; font-size:.86rem;">
              <input type="checkbox" id="checkboxPularJaRecebeuProsp" checked>
              Pular quem já recebeu este mesmo assunto
            </label>
          </div>

          <div class="cartao">
            <h2>Escrever o e-mail</h2>
            <div class="grupo-modo-prospeccao">
              <button type="button" class="botao-modo-prospeccao ativo" id="botaoModoTextoProsp">Texto fácil</button>
              <button type="button" class="botao-modo-prospeccao" id="botaoModoHtmlProsp">HTML avançado</button>
            </div>

            <div class="campo-admin">
              <label for="campoAssuntoProsp">Assunto</label>
              <input id="campoAssuntoProsp" placeholder="Ex: {{nome}}, topa uma parceria com a {{marca}}?">
            </div>

            <div id="areaModoTextoProsp">
              <div class="campo-admin">
                <label for="campoCorpoTextoProsp">Mensagem</label>
                <textarea id="campoCorpoTextoProsp" class="campo-corpo-prospeccao" placeholder="Oi {{nome}}, tudo bem? Sou a Laura, UGC creator, e adoraria criar conteúdo pra {{marca}}..."></textarea>
              </div>
              <div class="linha-campos">
                <div class="campo-admin">
                  <label for="campoBotaoTextoProsp">Texto do botão (opcional)</label>
                  <input id="campoBotaoTextoProsp" placeholder="Ex: Ver meu portfólio">
                </div>
                <div class="campo-admin">
                  <label for="campoBotaoLinkProsp">Link do botão (opcional)</label>
                  <input id="campoBotaoLinkProsp" placeholder="https://ugclauraoliveira.github.io/lauraoliveira/">
                </div>
              </div>
            </div>

            <div id="areaModoHtmlProsp" hidden>
              <button type="button" class="link-discreto" id="botaoComecarModeloProsp" style="margin-bottom:10px;">Começar do modelo pronto</button>
              <div class="campo-admin">
                <label for="campoCorpoHtmlProsp">HTML do e-mail</label>
                <textarea id="campoCorpoHtmlProsp" class="campo-corpo-prospeccao campo-html-prospeccao"></textarea>
              </div>
            </div>
          </div>

          <div class="cartao">
            <h2>Enviar</h2>
            <div class="grupo-modo-prospeccao" style="margin-bottom:16px;">
              <button type="button" class="botao-modo-prospeccao ativo" id="botaoEnvioResendProsp">Via Resend (automático)</button>
              <button type="button" class="botao-modo-prospeccao" id="botaoEnvioRascunhoProsp">Rascunho (envio manual)</button>
            </div>

            <div id="areaEnvioResendProsp">
              <div style="display:flex; gap:10px; flex-wrap:wrap; margin-bottom:12px;">
                <button type="button" class="btn btn-secundario" id="botaoEnviarTesteProsp">${ICONES.enviar(16)} Enviar teste pra mim</button>
                <button type="button" class="btn btn-primario" id="botaoDispararProsp">${ICONES.enviar(16)} Disparar</button>
              </div>
              <div id="areaProgressoDisparoProsp" hidden>
                <p id="textoProgressoDisparoProsp" style="font-size:.86rem;">Enviando...</p>
                <div class="barra-progresso-disparo"><div id="barraProgressoDisparoProsp" style="width:0%;"></div></div>
              </div>
              <div id="areaResumoDisparoProsp"></div>
            </div>

            <div id="areaEnvioRascunhoProsp" hidden>
              <p class="vazio-explicativo" style="text-align:left; padding:0 0 10px;">Sem Resend nenhum: eu monto o e-mail de cada marca e você manda pelo seu próprio Gmail.</p>
              <button type="button" class="btn btn-primario" id="botaoMontarFilaProsp">Montar fila de envio</button>
              <div id="filaRascunhoContainerProsp" style="margin-top:14px;"></div>
            </div>
          </div>
        </div>

        <div class="coluna-preview-prospeccao">
          <button type="button" class="btn btn-secundario" id="botaoPreviewTelaCheiaProsp" style="margin-bottom:10px;">Ver em tela cheia</button>
          <div class="palco-preview-prospeccao">
            <div class="janela-email-prospeccao">
              <div class="cabecalho-janela-email-prospeccao">
                <div class="avatar-remetente-prospeccao">L</div>
                <div>
                  <div class="assunto-preview-prospeccao" id="previewAssuntoProsp">Assunto do e-mail</div>
                  <div class="remetente-preview-prospeccao" id="previewRemetenteProsp">Laura Oliveira · para você</div>
                </div>
              </div>
              <div class="corpo-janela-email-prospeccao" id="previewCorpoProsp"></div>
            </div>
          </div>
          <p class="dica-preview-prospeccao">Lembrete: manda um teste pra você mesma e abre no celular antes de disparar de verdade.</p>
        </div>
      </div>

      <div class="cartao" style="margin-top:20px;">
        <div class="barra-filtros">
          <h2 style="flex:1;">Histórico de envios</h2>
          <div class="campo-busca">
            ${ICONES.busca(16)}
            <input type="text" id="campoBuscaHistoricoProsp" placeholder="Buscar por e-mail">
          </div>
        </div>
        <div class="tabela-wrap">
          <table class="tabela-admin">
            <thead><tr><th>E-mail</th><th>Assunto</th><th>Quando</th><th>Status</th><th>Erro</th></tr></thead>
            <tbody id="corpoHistoricoProsp"><tr><td colspan="5" class="vazio-explicativo">Carregando...</td></tr></tbody>
          </table>
        </div>
      </div>
    `;

    ligarEventos();

    const { data, error } = await window.banco.from("marcas").select("*").order("criado_em", { ascending: false });
    if (error) avisoFaltando(container, "marcas", error);
    marcasCache = data || [];

    popularSelectDestinatarios();
    verificarBaseSemEmail(container);
    await carregarEstatisticas(container);
    await carregarHistorico(container);
    renderizarPreview();
  }

  function ligarEventos() {
    $("selectDestinatariosProsp").addEventListener("change", atualizarContadorDestinatarios);
    $("checkboxPularJaRecebeuProsp").addEventListener("change", atualizarContadorDestinatarios);

    $("botaoModoTextoProsp").addEventListener("click", () => alternarModoComposicao("texto"));
    $("botaoModoHtmlProsp").addEventListener("click", () => alternarModoComposicao("html"));
    $("botaoComecarModeloProsp").addEventListener("click", comecarDoModeloPronto);
    ["campoAssuntoProsp", "campoCorpoTextoProsp", "campoBotaoTextoProsp", "campoBotaoLinkProsp", "campoCorpoHtmlProsp"].forEach((id) => {
      $(id).addEventListener("input", renderizarPreview);
    });

    $("botaoEnvioResendProsp").addEventListener("click", () => alternarModoEnvio("resend"));
    $("botaoEnvioRascunhoProsp").addEventListener("click", () => alternarModoEnvio("rascunho"));
    $("botaoEnviarTesteProsp").addEventListener("click", enviarTeste);
    $("botaoDispararProsp").addEventListener("click", prepararDisparo);
    $("botaoMontarFilaProsp").addEventListener("click", montarFilaRascunho);

    $("botaoPreviewTelaCheiaProsp").addEventListener("click", abrirPreviewTelaCheia);
    $("campoBuscaHistoricoProsp").addEventListener("input", () => renderizarHistorico($("campoBuscaHistoricoProsp").value));
  }

  /* ---------- TEXTO E MODELO DE E-MAIL ---------- */

  function primeiroNomeMarca(nomeCompleto) {
    return (nomeCompleto || "").trim().split(/\s+/)[0] || "";
  }

  function aplicarVariaveis(texto, nomeMarca) {
    return (texto || "")
      .split("{{marca}}").join(nomeMarca || "")
      .split("{{nome}}").join(primeiroNomeMarca(nomeMarca));
  }

  function linkificar(textoEscapado) {
    return textoEscapado.replace(/((https?:\/\/|www\.)[^\s<]+)/g, (trecho) => {
      const href = trecho.indexOf("http") === 0 ? trecho : "https://" + trecho;
      return `<a href="${href}" style="color:#b5563a;">${trecho}</a>`;
    });
  }

  function montarHtmlPadrao(textoBruto, textoBotao, linkBotao) {
    const textoPronto = linkificar(escapeHtml(textoBruto || ""));
    let botaoHtml = "";
    if (textoBotao && linkBotao) {
      botaoHtml = `<div style="text-align:center; margin-top:22px;">
        <a href="${attrEsc(linkBotao)}" style="background:#b5563a; color:#ffffff; text-decoration:none; padding:12px 26px; border-radius:999px; font-weight:600; display:inline-block; font-family:Arial, sans-serif;">${escapeHtml(textoBotao)}</a>
      </div>`;
    }
    return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f2e9dc; padding:24px 0;">
      <tr><td align="center">
        <table role="presentation" width="560" cellpadding="0" cellspacing="0" style="max-width:560px; width:100%; background:#fffdf8; border-radius:14px; overflow:hidden; font-family:Arial, sans-serif; color:#3a2b22;">
          <tr><td style="padding:32px 28px 22px;">
            <div style="font-size:15px; line-height:1.7; white-space:pre-wrap;">${textoPronto}</div>
            ${botaoHtml}
          </td></tr>
          <tr><td style="padding:16px 28px; border-top:1px solid #e7dac2; font-size:12px; color:#8a7a68;">
            Se não quiser mais receber e-mails como este, é só responder com a palavra SAIR.
          </td></tr>
        </table>
      </td></tr>
    </table>`;
  }

  function montarTemplateAtual() {
    const assunto = $("campoAssuntoProsp").value.trim();
    if (modoComposicao === "html") {
      return { assunto, corpoHtml: $("campoCorpoHtmlProsp").value };
    }
    return {
      assunto,
      corpoHtml: montarHtmlPadrao($("campoCorpoTextoProsp").value, $("campoBotaoTextoProsp").value, $("campoBotaoLinkProsp").value),
    };
  }

  function comecarDoModeloPronto() {
    $("campoCorpoHtmlProsp").value = montarHtmlPadrao($("campoCorpoTextoProsp").value, $("campoBotaoTextoProsp").value, $("campoBotaoLinkProsp").value);
    renderizarPreview();
  }

  function obterTextoSimplesDeHtml(html) {
    const div = document.createElement("div");
    div.innerHTML = html;
    return (div.textContent || "").replace(/\n{3,}/g, "\n\n").trim();
  }

  function alternarModoComposicao(modo) {
    modoComposicao = modo;
    $("botaoModoTextoProsp").classList.toggle("ativo", modo === "texto");
    $("botaoModoHtmlProsp").classList.toggle("ativo", modo === "html");
    $("areaModoTextoProsp").hidden = modo !== "texto";
    $("areaModoHtmlProsp").hidden = modo !== "html";
    renderizarPreview();
  }

  function alternarModoEnvio(modo) {
    modoEnvio = modo;
    $("botaoEnvioResendProsp").classList.toggle("ativo", modo === "resend");
    $("botaoEnvioRascunhoProsp").classList.toggle("ativo", modo === "rascunho");
    $("areaEnvioResendProsp").hidden = modo !== "resend";
    $("areaEnvioRascunhoProsp").hidden = modo !== "rascunho";
  }

  function renderizarPreview() {
    const template = montarTemplateAtual();
    const nomeExemplo = "Marca Exemplo Ltda";
    const assuntoResolvido = aplicarVariaveis(template.assunto, nomeExemplo) || "(sem assunto ainda)";
    const corpoResolvido = aplicarVariaveis(template.corpoHtml, nomeExemplo) || `<p style="color:#8a7a68;">Comece a escrever pra ver a prévia aqui.</p>`;
    $("previewAssuntoProsp").textContent = assuntoResolvido;
    $("previewRemetenteProsp").textContent = `Laura Oliveira · ${EMAIL_AUTORIZADO} · para você`;
    $("previewCorpoProsp").innerHTML = corpoResolvido;
  }

  function abrirPreviewTelaCheia() {
    abrirModalAdmin(
      escapeHtml($("previewAssuntoProsp").textContent),
      `<p style="font-size:.82rem; color:var(--tinta-suave); margin-bottom:14px;">${escapeHtml($("previewRemetenteProsp").textContent)}</p>${$("previewCorpoProsp").innerHTML}`
    );
    const caixa = document.querySelector(".modal-admin-caixa");
    if (caixa) caixa.style.maxWidth = "640px";
  }

  /* ---------- PRA QUEM VAI ---------- */

  function situacoesConhecidas() {
    return (window.AdminMarcas && window.AdminMarcas.SITUACOES) || ["lead", "conversando", "cliente", "parada"];
  }

  function situacoesDisponiveis() {
    const conhecidas = situacoesConhecidas();
    const extras = [];
    marcasCache.forEach((m) => {
      const s = (m.situacao || "").trim();
      if (s && !conhecidas.includes(s) && !extras.includes(s)) extras.push(s);
    });
    return conhecidas.concat(extras);
  }

  function verificarBaseSemEmail(container) {
    const totalComEmail = marcasCache.filter((m) => !!(m.email && m.email.trim())).length;
    const aviso = $("avisoBaseSemEmailProsp");
    const area = $("areaFormularioProsp");
    if (totalComEmail === 0) {
      area.hidden = true;
      aviso.innerHTML = `
        <div class="aviso-faltando">
          <span class="aviso-icone">${ICONES.aviso(20)}</span>
          <div>
            <strong>Sua base ainda está sem nenhum e-mail cadastrado.</strong>
            <p>Cadastre ou importe suas marcas na aba Marcas antes de mandar a prospecção.</p>
            <button type="button" class="btn btn-primario" id="botaoIrMarcasVazioProsp" style="margin-top:8px;">Ir para a aba Marcas</button>
          </div>
        </div>`;
      $("botaoIrMarcasVazioProsp").addEventListener("click", () => irParaAba("marcas"));
      return true;
    }
    area.hidden = false;
    aviso.innerHTML = "";
    return false;
  }

  function popularSelectDestinatarios() {
    const select = $("selectDestinatariosProsp");
    const anterior = select.value;

    const opcoes = [
      { valor: "selecionadas", texto: "Só as marcas selecionadas" },
      { valor: "teste", texto: "Só pra mim (teste)" },
      { valor: "com-email", texto: "Todas as marcas com e-mail preenchido" },
    ];
    situacoesDisponiveis().forEach((s) => {
      const nome = s.charAt(0).toUpperCase() + s.slice(1);
      opcoes.push({ valor: `situacao:${s}`, texto: `Só situação: ${nome}` });
    });

    select.innerHTML = opcoes.map((o) => `<option value="${attrEsc(o.valor)}">${escapeHtml(o.texto)}</option>`).join("");
    if (opcoes.some((o) => o.valor === anterior)) select.value = anterior;

    atualizarContadorDestinatarios();
  }

  function montarListaDestinatarios(filtro) {
    if (filtro === "teste") {
      return { lista: [{ email: EMAIL_AUTORIZADO, nomeMarca: "Marca de Teste" }], comEmail: 1, semEmail: 0 };
    }

    let base;
    if (filtro === "selecionadas") base = marcasCache.filter((m) => m.selecionada);
    else if (filtro === "com-email") base = marcasCache.slice();
    else if (filtro && filtro.indexOf("situacao:") === 0) {
      const valor = filtro.slice("situacao:".length);
      base = marcasCache.filter((m) => (m.situacao || "") === valor);
    } else base = [];

    const semEmail = base.filter((m) => !(m.email && m.email.trim())).length;
    const vistos = {};
    const lista = [];
    base.filter((m) => !!(m.email && m.email.trim())).forEach((m) => {
      const chave = m.email.trim().toLowerCase();
      if (vistos[chave]) return;
      vistos[chave] = true;
      lista.push({ email: m.email.trim(), nomeMarca: m.nome || "" });
    });

    return { lista, comEmail: lista.length, semEmail };
  }

  function atualizarContadorDestinatarios() {
    const filtro = $("selectDestinatariosProsp").value;
    const resultado = montarListaDestinatarios(filtro);
    let texto = `${resultado.comEmail} marca(s) vão receber`;
    if (resultado.semEmail > 0) texto += `, ${resultado.semEmail} ficaram de fora por não ter e-mail`;

    const alvo = $("contadorDestinatariosProsp");
    if (filtro === "selecionadas" && resultado.comEmail === 0) {
      alvo.innerHTML = `${texto}. <button type="button" class="link-discreto" id="botaoIrMarcasVazioSelecaoProsp">Ir para a aba Marcas</button>`;
      $("botaoIrMarcasVazioSelecaoProsp").addEventListener("click", () => irParaAba("marcas"));
    } else {
      alvo.textContent = texto;
    }
  }

  async function buscarAssuntosJaEnviados(emails) {
    if (!emails.length) return new Set();
    try {
      const { data, error } = await window.banco.from("email_envios").select("email,assunto").eq("status", "ok").in("email", emails);
      if (error) return new Set();
      return new Set((data || []).map((l) => `${String(l.email).toLowerCase()}||${l.assunto}`));
    } catch (e) {
      return new Set();
    }
  }

  /* ---------- ESTATÍSTICAS E HISTÓRICO ---------- */

  async function contarLinhas(tabela, aplicarFiltro) {
    let consulta = window.banco.from(tabela).select("id", { count: "exact", head: true });
    if (aplicarFiltro) consulta = aplicarFiltro(consulta);
    const { count, error } = await consulta;
    if (error) throw error;
    return count;
  }

  async function carregarEstatisticas(container) {
    const comEmail = marcasCache.filter((m) => !!(m.email && m.email.trim())).length;
    const jaReceberam = marcasCache.filter((m) => !!m.ultimo_envio_em).length;
    $("metricaComEmailProsp").textContent = comEmail;
    $("metricaAEnviarProsp").textContent = comEmail - jaReceberam;
    $("metricaJaReceberamProsp").textContent = jaReceberam;

    let erroTabelas = null;

    try {
      const totalOk = await contarLinhas("email_envios", (q) => q.eq("status", "ok"));
      $("numeroTotalEnviadosProsp").textContent = totalOk == null ? "—" : totalOk;
    } catch (e) { erroTabelas = e; $("numeroTotalEnviadosProsp").textContent = "—"; }

    try {
      const totalErro = await contarLinhas("email_envios", (q) => q.eq("status", "erro"));
      $("metricaFalhasProsp").textContent = totalErro == null ? "—" : totalErro;
    } catch (e) { erroTabelas = erroTabelas || e; $("metricaFalhasProsp").textContent = "—"; }

    try {
      const totalOptout = await contarLinhas("email_optout");
      $("metricaDescadastradosProsp").textContent = totalOptout == null ? "—" : totalOptout;
    } catch (e) { erroTabelas = erroTabelas || e; $("metricaDescadastradosProsp").textContent = "—"; }

    if (erroTabelas) avisoFaltando(container, "email_envios / email_optout (rode o prospeccao.sql)", erroTabelas);
  }

  function renderizarHistorico(filtro) {
    const alvo = $("corpoHistoricoProsp");
    if (!alvo) return;
    const termo = (filtro || "").toLowerCase().trim();
    const lista = !termo ? historicoCache : historicoCache.filter((h) => String(h.email || "").toLowerCase().includes(termo));
    if (lista.length === 0) {
      alvo.innerHTML = `<tr><td colspan="5" class="vazio-explicativo">Nenhum envio encontrado.</td></tr>`;
      return;
    }
    alvo.innerHTML = lista.map((h) => {
      const tag = h.status === "ok" ? `<span class="tag-status-envio ok">ok</span>` : `<span class="tag-status-envio erro">erro</span>`;
      return `<tr>
        <td>${escapeHtml(h.email)}</td>
        <td>${escapeHtml(h.assunto)}</td>
        <td>${formatarDataHora(h.criado_em)}</td>
        <td>${tag}</td>
        <td>${escapeHtml(h.erro || "")}</td>
      </tr>`;
    }).join("");
  }

  async function carregarHistorico(container) {
    $("corpoHistoricoProsp").innerHTML = `<tr><td colspan="5" class="vazio-explicativo">Carregando...</td></tr>`;
    const { data, error } = await window.banco.from("email_envios").select("*").order("criado_em", { ascending: false }).limit(300);
    if (error) {
      historicoCache = [];
      $("corpoHistoricoProsp").innerHTML = `<tr><td colspan="5" class="vazio-explicativo">O histórico ainda não existe. Rode o prospeccao.sql no Supabase.</td></tr>`;
      return;
    }
    historicoCache = data || [];
    renderizarHistorico($("campoBuscaHistoricoProsp").value);
  }

  /* ---------- ENVIAR VIA RESEND ---------- */

  async function chamarFuncaoEnviarEmails(destinatarios, assunto, corpoHtml) {
    const { data: sessao } = await window.banco.auth.getSession();
    const token = sessao && sessao.session ? sessao.session.access_token : null;
    const res = await fetch(`${URL_SUPABASE}/functions/v1/enviar-emails`, {
      method: "POST",
      headers: { "Content-Type": "application/json", apikey: CHAVE_SUPABASE_PUBLICA, Authorization: `Bearer ${token}` },
      body: JSON.stringify({ destinatarios, assunto, corpoHtml }),
    });
    const dados = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(dados.erro || "Falha ao chamar a função de envio.");
    return dados;
  }

  function enviarTeste() {
    const template = montarTemplateAtual();
    if (!template.assunto || !template.corpoHtml) {
      mostrarToast("Preencha o assunto e a mensagem antes de mandar o teste", "erro");
      return;
    }
    const botao = $("botaoEnviarTesteProsp");
    botao.disabled = true;
    const textoOriginal = botao.textContent;
    botao.textContent = "Enviando teste...";
    chamarFuncaoEnviarEmails([{ email: EMAIL_AUTORIZADO, nomeMarca: "Marca de Teste" }], template.assunto, template.corpoHtml)
      .then((resultado) => {
        mostrarToast(resultado.enviados > 0 ? "Teste enviado! Confira sua caixa de entrada." : "O teste não foi enviado.", resultado.enviados > 0 ? "sucesso" : "erro");
      })
      .catch((erro) => mostrarToast("Não deu pra mandar o teste: " + erro.message, "erro"))
      .finally(() => { botao.disabled = false; botao.textContent = textoOriginal; });
  }

  async function prepararDisparo() {
    const template = montarTemplateAtual();
    if (!template.assunto || !template.corpoHtml) {
      mostrarToast("Preencha o assunto e a mensagem antes de disparar", "erro");
      return;
    }
    if (modoComposicao === "html" && template.corpoHtml.toLowerCase().indexOf("sair") === -1) {
      if (!confirm("Não encontrei a palavra SAIR no seu HTML (o rodapé de descadastro é obrigatório). Quer continuar mesmo assim?")) return;
    }

    const filtro = $("selectDestinatariosProsp").value;
    const resultado = montarListaDestinatarios(filtro);

    if (filtro === "selecionadas" && resultado.lista.length === 0) {
      mostrarToast("Você não tem nenhuma marca selecionada. Indo pra aba Marcas.", "erro");
      irParaAba("marcas");
      return;
    }
    if (resultado.lista.length === 0) {
      mostrarToast("Não há nenhuma marca com e-mail nessa lista", "erro");
      return;
    }

    let listaFinal = resultado.lista;
    if ($("checkboxPularJaRecebeuProsp").checked) {
      const comAssunto = listaFinal.map((d) => ({ email: d.email, nomeMarca: d.nomeMarca, assuntoFinal: aplicarVariaveis(template.assunto, d.nomeMarca) }));
      const jaEnviados = await buscarAssuntosJaEnviados(comAssunto.map((d) => d.email));
      listaFinal = comAssunto
        .filter((d) => !jaEnviados.has(`${d.email.toLowerCase()}||${d.assuntoFinal}`))
        .map((d) => ({ email: d.email, nomeMarca: d.nomeMarca }));
    }

    if (listaFinal.length === 0) {
      mostrarToast("Todo mundo dessa lista já recebeu este mesmo assunto", "erro");
      return;
    }

    destinatariosPendentes = listaFinal;
    templatePendente = template;

    const nomeFiltro = $("selectDestinatariosProsp").selectedOptions[0].textContent;
    abrirModalAdmin("Confirmar disparo", `
      <p>Vai para <strong>${listaFinal.length}</strong> marca(s), da lista "${escapeHtml(nomeFiltro)}".</p>
      <p style="font-weight:700;">Isso não pode ser desfeito.</p>
      <div class="linha-botoes-modal">
        <button type="button" class="btn btn-secundario" id="botaoCancelarDisparoProsp">Cancelar</button>
        <button type="button" class="btn btn-primario" id="botaoConfirmarDisparoProsp">Sim, disparar</button>
      </div>
    `);
    const caixa = document.querySelector(".modal-admin-caixa");
    if (caixa) caixa.style.maxWidth = "";
    $("botaoCancelarDisparoProsp").addEventListener("click", fecharModalAdmin);
    $("botaoConfirmarDisparoProsp").addEventListener("click", executarDisparoConfirmado);
  }

  async function executarDisparoConfirmado() {
    fecharModalAdmin();
    const container = document.getElementById("conteudoAba");
    $("botaoDispararProsp").disabled = true;
    $("areaProgressoDisparoProsp").hidden = false;
    $("areaResumoDisparoProsp").innerHTML = "";

    const lista = destinatariosPendentes || [];
    const total = lista.length;
    let totalEnviados = 0, totalFalharam = 0, totalPulados = 0, totalFaltaram = 0, paradaPorCota = false;

    for (let i = 0; i < lista.length; i += TAMANHO_LOTE_DISPARO) {
      if (paradaPorCota) break;
      const lote = lista.slice(i, i + TAMANHO_LOTE_DISPARO);
      try {
        const resultado = await chamarFuncaoEnviarEmails(lote, templatePendente.assunto, templatePendente.corpoHtml);
        totalEnviados += resultado.enviados || 0;
        totalFalharam += resultado.falharam || 0;
        totalPulados += resultado.pulados || 0;
        totalFaltaram += resultado.faltaram || 0;
        if (resultado.cotaEsgotada) {
          paradaPorCota = true;
          totalFaltaram += total - (i + lote.length);
        }
      } catch (erro) {
        $("areaResumoDisparoProsp").innerHTML = `<div class="aviso-cota-prospeccao">Parou no meio por um erro: ${escapeHtml(erro.message)}. O que já foi enviado ficou registrado no histórico.</div>`;
        break;
      }
      const processados = Math.min(i + lote.length, total);
      $("textoProgressoDisparoProsp").textContent = `Enviando ${processados} de ${total}...`;
      $("barraProgressoDisparoProsp").style.width = `${Math.round((processados / total) * 100)}%`;
    }

    $("areaProgressoDisparoProsp").hidden = true;
    $("botaoDispararProsp").disabled = false;

    let resumoHtml = `<div class="resumo-disparo-prospeccao">${totalEnviados} enviados, ${totalFalharam} falharam, ${totalPulados} pulados.</div>`;
    if (paradaPorCota) {
      resumoHtml += `<div class="aviso-cota-prospeccao">A cota diária do Resend acabou (${totalFaltaram} ainda faltando). Volte amanhã, cole o mesmo assunto e o mesmo texto, e deixe marcada a caixinha de pular quem já recebeu: ele manda só pros que faltaram.</div>`;
    }
    $("areaResumoDisparoProsp").innerHTML = resumoHtml;

    const { data } = await window.banco.from("marcas").select("*").order("criado_em", { ascending: false });
    marcasCache = data || [];
    popularSelectDestinatarios();
    await carregarEstatisticas(container);
    await carregarHistorico(container);

    if (marcasCache.some((m) => m.selecionada)) {
      abrirModalAdmin("Limpar a seleção?", `
        <p>O disparo terminou. Quer limpar as marcas selecionadas ou manter marcadas pra mandar de novo depois?</p>
        <div class="linha-botoes-modal">
          <button type="button" class="btn btn-secundario" id="botaoManterSelecaoProsp">Manter selecionadas</button>
          <button type="button" class="btn btn-primario" id="botaoLimparSelecaoPosEnvioProsp">Limpar seleção</button>
        </div>
      `);
      $("botaoManterSelecaoProsp").addEventListener("click", fecharModalAdmin);
      $("botaoLimparSelecaoPosEnvioProsp").addEventListener("click", async () => {
        fecharModalAdmin();
        const pendentes = marcasCache.filter((m) => m.selecionada);
        for (const m of pendentes) {
          await window.banco.from("marcas").update({ selecionada: false }).eq("id", m.id);
          m.selecionada = false;
        }
        mostrarToast("Seleção limpa");
      });
    }
  }

  /* ---------- MODO RASCUNHO ---------- */

  function montarFilaRascunho() {
    const template = montarTemplateAtual();
    if (!template.assunto || !template.corpoHtml) {
      mostrarToast("Preencha o assunto e a mensagem antes de montar a fila", "erro");
      return;
    }
    const filtro = $("selectDestinatariosProsp").value;
    const resultado = montarListaDestinatarios(filtro);
    if (resultado.lista.length === 0) {
      mostrarToast("Não há marcas nessa lista", "erro");
      return;
    }

    filaRascunho = resultado.lista.map((d) => {
      const assuntoFinal = aplicarVariaveis(template.assunto, d.nomeMarca);
      const corpoFinalHtml = aplicarVariaveis(template.corpoHtml, d.nomeMarca);
      const marca = marcasCache.find((m) => m.email && m.email.toLowerCase() === d.email.toLowerCase());
      return {
        email: d.email,
        nomeMarca: d.nomeMarca,
        assunto: assuntoFinal,
        corpoTexto: obterTextoSimplesDeHtml(corpoFinalHtml),
        marcaId: marca ? marca.id : null,
      };
    });
    indiceFila = 0;
    renderizarFilaRascunho();
  }

  function renderizarFilaRascunho() {
    const alvo = $("filaRascunhoContainerProsp");
    if (filaRascunho.length === 0) { alvo.innerHTML = ""; return; }
    if (indiceFila >= filaRascunho.length) {
      alvo.innerHTML = `<div class="resumo-disparo-prospeccao">Fila concluída! Todas as marcas dessa lista foram passadas.</div>`;
      return;
    }
    const item = filaRascunho[indiceFila];
    const linkGmail = `https://mail.google.com/mail/?view=cm&fs=1&to=${encodeURIComponent(item.email)}&su=${encodeURIComponent(item.assunto)}&body=${encodeURIComponent(item.corpoTexto)}`;

    alvo.innerHTML = `
      <div class="fila-rascunho-prospeccao">
        <div class="fila-rascunho-topo-prospeccao"><span>Marca ${indiceFila + 1} de ${filaRascunho.length}</span><span>${escapeHtml(item.email)}</span></div>
        <p style="font-weight:700; margin-bottom:6px;">${escapeHtml(item.assunto)}</p>
        <div class="fila-rascunho-corpo-prospeccao">${escapeHtml(item.corpoTexto)}</div>
        <div class="fila-rascunho-botoes-prospeccao">
          <button type="button" class="btn btn-secundario" id="botaoCopiarFilaProsp">${ICONES.copiar(16)} Copiar texto</button>
          <a class="btn btn-secundario" id="linkAbrirGmailProsp" href="${linkGmail}" target="_blank" rel="noopener noreferrer">Abrir no Gmail</a>
          <button type="button" class="btn btn-primario" id="botaoMarcarEnviadaProsp">Marcar como enviada</button>
        </div>
      </div>
    `;

    $("botaoCopiarFilaProsp").addEventListener("click", () => {
      navigator.clipboard.writeText(item.corpoTexto)
        .then(() => mostrarToast("Texto copiado"))
        .catch(() => mostrarToast("Não consegui copiar sozinho, selecione o texto na tela", "erro"));
    });
    $("botaoMarcarEnviadaProsp").addEventListener("click", () => marcarItemFilaComoEnviado(item));
  }

  async function marcarItemFilaComoEnviado(item) {
    const agora = new Date().toISOString();
    await window.banco.from("email_envios").insert({ email: item.email, assunto: item.assunto, status: "ok", erro: null, resend_id: null });
    if (item.marcaId) {
      await window.banco.from("marcas").update({ ultimo_envio_em: agora, ultimo_envio_assunto: item.assunto }).eq("id", item.marcaId);
      const marca = marcasCache.find((m) => m.id === item.marcaId);
      if (marca) marca.ultimo_envio_em = agora;
    }
    indiceFila++;
    renderizarFilaRascunho();
    const container = document.getElementById("conteudoAba");
    await carregarEstatisticas(container);
    await carregarHistorico(container);
  }

  return { render };
})();
