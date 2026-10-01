/* =========================================================
   ADMIN-ROTEIROS.JS
   Aba "Roteiros": cola o link de um vídeo do Instagram,
   TikTok ou YouTube, a Supadata transcreve e o texto fica
   guardado na biblioteca, com etiqueta "Meu" ou "De outra".

   A chave da Supadata NÃO fica neste arquivo: ela é colada
   dentro do painel e guardada na tabela "configuracoes" do
   Supabase (só quem está logada consegue ler).
   As tabelas estão no arquivo sql-roteiros.sql.
========================================================= */

window.AdminRoteiros = (function () {

  const API_SUPADATA = "https://api.supadata.ai/v1";
  const NOME_CHAVE_CONFIG = "supadata_chave";
  const INTERVALO_CONSULTA_MS = 5000;   // de quanto em quanto tempo pergunta se o vídeo longo ficou pronto
  const LIMITE_ESPERA_MS = 6 * 60 * 1000; // desiste depois de 6 minutos

  const MSG_SEM_FALA = "Não achei fala nesse vídeo. Costuma ser reel só com música ou só com texto na tela.";

  const FONTES = {
    instagram: { nome: "Instagram", emoji: "📸" },
    tiktok:    { nome: "TikTok",    emoji: "🎵" },
    youtube:   { nome: "YouTube",   emoji: "▶️" },
    manual:    { nome: "Escrito na mão", emoji: "✍️" },
  };

  let roteirosCache = [];
  let chaveSupadata = "";
  let filtroAtual = "todos";
  let termoBusca = "";
  let idTranscrevendo = null; // linha que está sendo transcrita AGORA, nesta aba

  /* ---------- MONTAGEM DA TELA ---------- */
  async function render(container) {
    container.innerHTML = `
      <div class="rot-topo">
        <h2 class="rot-titulo">📜 Roteiros</h2>
        <p class="rot-frase">Cole o link de um reel e eu transcrevo. Serve pros seus e pros das outras, com etiqueta pra você separar.</p>

        <div class="rot-linha-link">
          <input type="text" id="rotCampoLink" class="rot-campo-link" placeholder="Cole aqui: instagram.com/reel/... · tiktok.com/... · youtube.com/..." autocomplete="off">
          <select id="rotDeQuem" class="rot-seletor" aria-label="De quem é o vídeo">
            <option value="outra">👀 De outra pessoa</option>
            <option value="minha">🙋‍♀️ Meu</option>
          </select>
          <button class="btn btn-primario" id="rotBotaoTranscrever">🎧 Transcrever</button>
          <button class="btn btn-secundario" id="rotBotaoManual">✍️ + Escrever na mão</button>
        </div>

        <div class="rot-aviso" id="rotAviso" hidden></div>
      </div>

      <details class="cartao rot-config" id="rotConfig">
        <summary><span>🔑 Chave da Supadata</span><span class="rot-config-resumo" id="rotConfigResumo">carregando...</span></summary>
        <div class="rot-config-corpo">
          <div class="rot-linha-chave">
            <input type="password" id="rotCampoChave" placeholder="Cole aqui a sua API key da Supadata" autocomplete="off">
            <button class="btn btn-primario" id="rotBotaoSalvarChave">💾 Salvar</button>
          </div>
          <p class="rot-saldo" id="rotSaldo"></p>
          <p class="rot-dica">Não tem chave? Crie uma conta grátis em <a href="https://supadata.ai" target="_blank" rel="noopener">supadata.ai</a> (100 créditos por mês, sem cartão), copie a API key e cole aqui. Cada vídeo transcrito gasta créditos do mês.</p>
        </div>
      </details>

      <div class="cartao">
        <div class="rot-cabeca-biblioteca">
          <h2>📚 Biblioteca</h2>
          <button class="btn btn-secundario" id="rotBotaoEstudar">🧠 Estudar com o Claude</button>
        </div>
        <div class="barra-filtros">
          <div class="campo-busca">${ICONES.busca(16)}<input type="text" id="rotBusca" placeholder="Buscar na transcrição, perfil, título ou notas"></div>
        </div>
        <div class="barra-filtros rot-chips" id="rotChips"></div>
        <div class="rot-lista" id="rotLista"></div>
      </div>
    `;

    document.getElementById("rotBotaoTranscrever").addEventListener("click", aoClicarTranscrever);
    document.getElementById("rotCampoLink").addEventListener("keydown", (e) => { if (e.key === "Enter") aoClicarTranscrever(); });
    document.getElementById("rotBotaoManual").addEventListener("click", () => abrirEdicao(null));
    document.getElementById("rotBotaoSalvarChave").addEventListener("click", salvarChave);
    document.getElementById("rotBotaoEstudar").addEventListener("click", estudarComClaude);
    document.getElementById("rotBusca").addEventListener("input", (e) => { termoBusca = e.target.value.toLowerCase().trim(); renderLista(); });
    document.getElementById("rotLista").addEventListener("click", aoClicarNaLista);
    document.getElementById("rotChips").addEventListener("click", (e) => {
      const chip = e.target.closest(".chip-filtro");
      if (!chip) return;
      filtroAtual = chip.dataset.filtro;
      renderChips();
      renderLista();
    });

    if (idTranscrevendo) travarBotaoTranscrever(true);

    await Promise.all([carregarChave(), carregarRoteiros()]);
  }

  /* ---------- BANCO ---------- */
  async function carregarRoteiros() {
    const { data, error } = await window.banco.from("roteiros").select("*").order("created_at", { ascending: false });
    if (error) avisoBancoRoteiros("roteiros", error);
    roteirosCache = data || [];
    renderChips();
    renderLista();
  }

  async function carregarChave() {
    const { data, error } = await window.banco.from("configuracoes").select("valor").eq("chave", NOME_CHAVE_CONFIG).maybeSingle();
    if (error) avisoBancoRoteiros("configuracoes", error);
    chaveSupadata = (data?.valor || "").trim();
    atualizarResumoChave();
    if (chaveSupadata) atualizarSaldo();
  }

  // Mesmo visual do aviso das outras abas, mas apontando pro arquivo certo.
  function avisoBancoRoteiros(nomeTabela, erro) {
    const container = document.getElementById("conteudoAba");
    if (!container || container.querySelector(`[data-aviso-tabela="${nomeTabela}"]`)) return;
    const caixa = document.createElement("div");
    caixa.className = "aviso-faltando";
    caixa.dataset.avisoTabela = nomeTabela;
    caixa.innerHTML = `
      <span class="aviso-icone">${ICONES.aviso(20)}</span>
      <div>
        <strong>Não consegui carregar "${escapeHtml(nomeTabela)}".</strong>
        <p>Confira se você já rodou o arquivo sql-roteiros.sql no Supabase. O resto do painel continua funcionando normalmente.</p>
        <p class="aviso-detalhe">Detalhe técnico: ${escapeHtml(erro?.message || erro || "erro desconhecido")}</p>
      </div>`;
    container.prepend(caixa);
  }

  async function atualizarLinha(id, dados) {
    const { error } = await window.banco.from("roteiros").update({ ...dados, updated_at: new Date().toISOString() }).eq("id", id);
    const item = roteirosCache.find(r => r.id === id);
    if (!error && item) Object.assign(item, dados);
    return error;
  }

  /* ---------- CHAVE E SALDO ---------- */
  function atualizarResumoChave() {
    const resumo = document.getElementById("rotConfigResumo");
    const config = document.getElementById("rotConfig");
    if (!resumo) return;
    if (chaveSupadata) {
      resumo.textContent = `chave salva ••••${chaveSupadata.slice(-4)}`;
      config.classList.remove("rot-config-pendente");
    } else {
      resumo.textContent = "nenhuma chave salva ainda";
      config.classList.add("rot-config-pendente");
      config.open = true;
    }
  }

  async function salvarChave() {
    const campo = document.getElementById("rotCampoChave");
    const valor = campo.value.trim();
    if (!valor) { mostrarToast("Cole a chave no campo antes de salvar", "erro"); campo.focus(); return; }

    const { error } = await window.banco.from("configuracoes")
      .upsert({ chave: NOME_CHAVE_CONFIG, valor, updated_at: new Date().toISOString() }, { onConflict: "chave" });
    if (error) { mostrarToast("Não consegui salvar a chave. Já rodou o sql-roteiros.sql?", "erro"); return; }

    chaveSupadata = valor;
    campo.value = "";
    atualizarResumoChave();
    mostrarToast("Chave salva ✓");
    esconderAviso();
    atualizarSaldo();
  }

  async function atualizarSaldo() {
    const saldo = document.getElementById("rotSaldo");
    if (!saldo || !chaveSupadata) return;
    saldo.textContent = "📊 Conferindo seu saldo...";
    try {
      const resposta = await fetch(`${API_SUPADATA}/me`, { headers: { "x-api-key": chaveSupadata } });
      if (resposta.status === 401 || resposta.status === 403) {
        saldo.textContent = "⚠️ Essa chave não funcionou. Confere se colou ela inteira, sem espaço.";
        return;
      }
      if (!resposta.ok) { saldo.textContent = "📊 Não consegui ver o saldo agora."; return; }
      const dados = await resposta.json();
      const usados = Number(dados.usedCredits ?? 0);
      const total = Number(dados.maxCredits ?? 0);
      saldo.textContent = `📊 ${usados} de ${total} créditos usados este mês${dados.plan ? ` (plano ${dados.plan})` : ""}`;
      const resumo = document.getElementById("rotConfigResumo");
      if (resumo) resumo.textContent = `chave salva ••••${chaveSupadata.slice(-4)} · ${usados} de ${total} créditos usados`;
    } catch (_) {
      saldo.textContent = "📊 Não consegui ver o saldo agora. Confere a internet.";
    }
  }

  /* ---------- LINKS: limpar, descobrir fonte, perfil e embed ---------- */
  function limparLink(bruto) {
    let texto = String(bruto || "").trim();
    if (!texto) return null;
    // Aceita "instagram.com/reel/..." sem o https na frente.
    if (!/^https?:\/\//i.test(texto) && /^(www\.|m\.|vm\.|vt\.)?(instagram\.com|tiktok\.com|youtube\.com|youtu\.be)\//i.test(texto)) {
      texto = "https://" + texto;
    }
    if (!/^https?:\/\//i.test(texto)) return null;

    let url;
    try { url = new URL(texto); } catch (_) { return null; }

    // Mesmo endereço sempre escrito do mesmo jeito, pra achar repetido na biblioteca.
    const host = url.hostname.toLowerCase();
    if (/^(m\.)?instagram\.com$/.test(host)) url.hostname = "www.instagram.com";
    if (/^(m\.)?tiktok\.com$/.test(host)) url.hostname = "www.tiktok.com";
    if (/^(m\.|music\.)?youtube\.com$/.test(host)) url.hostname = "www.youtube.com";
    url.protocol = "https:";

    url.pathname = url.pathname.replace(/\/reels\//i, "/reel/");
    const fonte = fonteDoLink(url.toString());
    [...url.searchParams.keys()].forEach((nome) => {
      const rastreio = nome === "igsh" || nome === "igshid" || nome === "si" || nome.toLowerCase().startsWith("utm_");
      // Link de reel e de TikTok não precisa de nada depois do "?". No YouTube só o "v" importa.
      const sobra = fonte === "instagram" || fonte === "tiktok" || (fonte === "youtube" && nome !== "v");
      if (rastreio || sobra) url.searchParams.delete(nome);
    });
    url.hash = "";
    return url.toString().replace(/\?$/, "");
  }

  function fonteDoLink(link) {
    if (!link) return "manual";
    let host = "";
    try { host = new URL(link).hostname.toLowerCase(); } catch (_) { return "manual"; }
    if (host.endsWith("instagram.com")) return "instagram";
    if (host.endsWith("tiktok.com")) return "tiktok";
    if (host.endsWith("youtube.com") || host === "youtu.be") return "youtube";
    return "manual";
  }

  // O @ só aparece no link em instagram.com/<perfil>/reel/<id> e tiktok.com/@<perfil>/...
  function perfilDoLink(link) {
    try {
      const url = new URL(link);
      const partes = url.pathname.split("/").filter(Boolean);
      const fonte = fonteDoLink(link);
      if (fonte === "instagram" && partes.length >= 3 && ["reel", "p", "tv"].includes(partes[1])) return partes[0];
      if (fonte === "tiktok" && partes[0] && partes[0].startsWith("@")) return partes[0].slice(1);
    } catch (_) { /* link estranho: sem perfil */ }
    return "";
  }

  function embedDoLink(link) {
    if (!link) return null;
    let url;
    try { url = new URL(link); } catch (_) { return null; }
    const fonte = fonteDoLink(link);
    if (fonte === "instagram") {
      const achou = url.pathname.match(/\/(reel|p|tv)\/([A-Za-z0-9_-]+)/);
      return achou ? `https://www.instagram.com/${achou[1] === "p" ? "p" : "reel"}/${achou[2]}/embed` : null;
    }
    if (fonte === "youtube") {
      const id = idYoutube(url);
      return id ? `https://www.youtube.com/embed/${id}` : null;
    }
    if (fonte === "tiktok") {
      const achou = url.pathname.match(/\/video\/(\d+)/);
      return achou ? `https://www.tiktok.com/embed/v2/${achou[1]}` : null;
    }
    return null;
  }

  function idYoutube(url) {
    if (url.hostname === "youtu.be") return url.pathname.split("/").filter(Boolean)[0] || null;
    if (url.searchParams.get("v")) return url.searchParams.get("v");
    const achou = url.pathname.match(/\/(shorts|embed|live)\/([A-Za-z0-9_-]+)/);
    return achou ? achou[2] : null;
  }

  // Só o YouTube deixa puxar a capa direto do navegador. O Instagram recusa.
  function capaDoLink(link) {
    if (fonteDoLink(link) !== "youtube") return null;
    try {
      const id = idYoutube(new URL(link));
      return id ? `https://i.ytimg.com/vi/${id}/hqdefault.jpg` : null;
    } catch (_) { return null; }
  }

  /* ---------- AVISO (andamento e erros) ---------- */
  function mostrarAviso(tipo, html) {
    const aviso = document.getElementById("rotAviso");
    if (!aviso) return;
    aviso.className = `rot-aviso rot-aviso-${tipo}`;
    aviso.innerHTML = html;
    aviso.hidden = false;
  }
  function esconderAviso() {
    const aviso = document.getElementById("rotAviso");
    if (aviso) aviso.hidden = true;
  }

  function avisoSemChave() {
    mostrarAviso("erro", `
      <strong>🔑 Falta a chave da Supadata, que é o serviço que ouve o vídeo.</strong>
      <ol class="rot-passos">
        <li>Crie uma conta grátis em <a href="https://supadata.ai" target="_blank" rel="noopener">supadata.ai</a> (100 créditos por mês, sem cartão).</li>
        <li>Lá dentro, copie a sua <b>API key</b>.</li>
        <li>Cole no campo "Chave da Supadata" logo abaixo e clique em 💾 Salvar.</li>
      </ol>`);
    const config = document.getElementById("rotConfig");
    config.open = true;
    document.getElementById("rotCampoChave").focus();
  }

  function travarBotaoTranscrever(travar) {
    const botao = document.getElementById("rotBotaoTranscrever");
    if (!botao) return;
    botao.disabled = travar;
    botao.textContent = travar ? "⏳ Transcrevendo..." : "🎧 Transcrever";
  }

  /* ---------- FLUXO DO TRANSCREVER ---------- */
  async function aoClicarTranscrever() {
    if (idTranscrevendo) { mostrarAviso("info", "⏳ Já tem um vídeo sendo ouvido. Espera ele terminar pra mandar o próximo."); return; }

    const campo = document.getElementById("rotCampoLink");
    if (!campo.value.trim()) {
      mostrarAviso("erro", "🔗 Cole o link do vídeo no campo antes de clicar em Transcrever.");
      campo.focus();
      return;
    }

    const link = limparLink(campo.value);
    if (!link || fonteDoLink(link) === "manual") {
      mostrarAviso("erro", `🤔 Esse link não parece ser de um vídeo do Instagram, TikTok ou YouTube. Abra o vídeo, toque em <b>Compartilhar</b>, depois em <b>Copiar link</b>, e cole aqui de novo.`);
      campo.focus();
      return;
    }

    if (!chaveSupadata) { avisoSemChave(); return; }

    const deQuem = document.getElementById("rotDeQuem").value;
    const existente = roteirosCache.find(r => r.url && (r.url === link || limparLink(r.url) === link));
    if (existente) {
      const nome = existente.titulo || (existente.perfil ? "@" + existente.perfil : "sem título");
      if (!confirm(`Esse vídeo já está na sua biblioteca (${nome}).\n\nQuer transcrever de novo? Isso gasta créditos da Supadata e troca o texto que está lá.`)) {
        mostrarAviso("info", "👍 Beleza, não transcrevi de novo. Ele já está na biblioteca aqui embaixo.");
        return;
      }
      await atualizarLinha(existente.id, { status: "processando", erro: null, de_quem: deQuem });
      campo.value = "";
      renderLista();
      transcrever(existente.id, link);
      return;
    }

    const novo = {
      fonte: fonteDoLink(link),
      url: link,
      perfil: perfilDoLink(link) || null,
      de_quem: deQuem,
      status: "processando",
    };
    const { data, error } = await window.banco.from("roteiros").insert(novo).select().single();
    if (error) {
      mostrarAviso("erro", "😕 Não consegui criar o roteiro no banco. Confira se você já rodou o arquivo sql-roteiros.sql no Supabase.");
      return;
    }
    campo.value = "";
    roteirosCache.unshift(data);
    renderChips();
    renderLista();
    transcrever(data.id, link);
  }

  async function transcrever(id, link) {
    idTranscrevendo = id;
    travarBotaoTranscrever(true);
    renderLista();

    const inicio = Date.now();
    const mostrarAndamento = () => {
      const segundos = Math.round((Date.now() - inicio) / 1000);
      const tempo = segundos < 60 ? `${segundos}s` : `${Math.floor(segundos / 60)}min ${String(segundos % 60).padStart(2, "0")}s`;
      mostrarAviso("info", `<span class="rot-relogio" aria-hidden="true">⏳</span> Ouvindo o vídeo… ${tempo}. Costuma levar de 3 a 4 minutos, pode deixar a aba aberta.`);
    };
    mostrarAndamento();
    const relogio = setInterval(mostrarAndamento, 1000);

    let resultado;
    try {
      resultado = await pedirTranscricao(link, inicio);
    } finally {
      clearInterval(relogio);
    }

    idTranscrevendo = null;
    travarBotaoTranscrever(false);

    if (resultado.tipo === "ok") {
      await atualizarLinha(id, { transcricao: resultado.texto, segmentos: resultado.segmentos || null, status: "pronto", erro: null });
      renderChips();
      renderLista();
      esconderAviso();
      const roteiro = roteirosCache.find(r => r.id === id);
      if (roteiro) abrirEdicao(roteiro, "✅ Pronto. Revisa, dá um nome e salva.");
      mostrarAviso("ok", "✅ Pronto. Revisa, dá um nome e salva.");
    } else if (resultado.tipo === "vazio") {
      await atualizarLinha(id, { status: "falhou", erro: MSG_SEM_FALA });
      renderLista();
      mostrarAviso("erro", `🎶 ${MSG_SEM_FALA}<br><button class="btn btn-secundario rot-botao-aviso" data-acao="abrir" data-id="${id}">📝 Guardar assim mesmo</button> <span class="rot-mini">(o link já vai preenchido, aí você escreve o texto na mão)</span>`);
      ligarBotaoDoAviso();
    } else {
      await atualizarLinha(id, { status: "falhou", erro: resultado.mensagem });
      renderLista();
      mostrarAviso("erro", `😕 ${escapeHtml(resultado.mensagem)}`);
    }
    atualizarSaldo();
  }

  function ligarBotaoDoAviso() {
    const botao = document.querySelector("#rotAviso [data-acao='abrir']");
    if (!botao) return;
    botao.addEventListener("click", () => {
      const roteiro = roteirosCache.find(r => r.id === botao.dataset.id);
      if (roteiro) abrirEdicao(roteiro);
    });
  }

  /* ---------- SUPADATA ---------- */
  // Devolve { tipo: "ok", texto, segmentos } | { tipo: "vazio" } | { tipo: "erro", mensagem }
  async function pedirTranscricao(link, inicio) {
    const parametros = new URLSearchParams({ url: link, mode: "auto", text: "true", lang: "pt" });
    let resposta;
    try {
      resposta = await fetch(`${API_SUPADATA}/transcript?${parametros}`, { headers: { "x-api-key": chaveSupadata } });
    } catch (_) {
      return { tipo: "erro", mensagem: "Não consegui falar com o serviço de transcrição. Confere a internet e tenta de novo." };
    }

    const corpo = await lerJson(resposta);

    // Vídeo longo: a Supadata devolve um número de pedido e a gente vai perguntando.
    if (resposta.status === 202 && corpo?.jobId) return esperarPedido(corpo.jobId, inicio);
    if (resposta.status === 206) return { tipo: "vazio" };
    if (!resposta.ok) return { tipo: "erro", mensagem: traduzirErro(resposta.status, corpo) };
    return interpretarConteudo(corpo);
  }

  async function esperarPedido(jobId, inicio) {
    while (Date.now() - inicio < LIMITE_ESPERA_MS) {
      await esperar(INTERVALO_CONSULTA_MS);
      let resposta;
      try {
        resposta = await fetch(`${API_SUPADATA}/transcript/${encodeURIComponent(jobId)}`, { headers: { "x-api-key": chaveSupadata } });
      } catch (_) {
        continue; // internet piscou: tenta de novo na próxima volta
      }
      const corpo = await lerJson(resposta);
      if (!resposta.ok) return { tipo: "erro", mensagem: traduzirErro(resposta.status, corpo) };
      if (corpo?.status === "completed") return interpretarConteudo(corpo);
      if (corpo?.status === "failed") {
        const codigo = corpo?.error?.error || corpo?.error;
        if (codigo === "transcript-unavailable") return { tipo: "vazio" };
        return { tipo: "erro", mensagem: "O serviço não conseguiu ouvir esse vídeo. Ele pode ser privado ou ter sido apagado. Tenta de novo daqui a pouco." };
      }
    }
    return { tipo: "erro", mensagem: "Demorou mais de 6 minutos e eu desisti de esperar. Tenta de novo daqui a pouco, às vezes o serviço está cheio." };
  }

  function interpretarConteudo(corpo) {
    const conteudo = corpo?.content;
    let texto = "";
    let segmentos = null;
    if (Array.isArray(conteudo)) {
      segmentos = conteudo;
      texto = conteudo.map(t => (t?.text || "").trim()).filter(Boolean).join(" ");
    } else if (typeof conteudo === "string") {
      texto = conteudo;
    }
    texto = texto.replace(/[ \t]+/g, " ").trim();
    if (!texto || corpo?.lang === "none") return { tipo: "vazio" };
    return { tipo: "ok", texto, segmentos };
  }

  function traduzirErro(status, corpo) {
    const codigo = corpo?.error || "";
    const detalhes = `${corpo?.details || ""} ${corpo?.message || ""}`.toLowerCase();

    if (codigo === "limit-exceeded" || status === 429) {
      if (detalhes.includes("plan usage")) return "Acabaram os créditos da Supadata deste mês. Eles voltam no começo do próximo ciclo, ou dá pra trocar de plano lá no site deles.";
      if (detalhes.includes("request rate")) return "Foram muitos pedidos seguidos. Espera 1 minutinho e tenta de novo.";
      return "A Supadata pediu pra dar uma pausa. Espera 1 minutinho e tenta de novo.";
    }
    if (status === 401 || status === 403 || codigo === "unauthorized" || codigo === "invalid-api-key") {
      return "A chave da Supadata não funcionou. Confere se você colou ela inteira, sem espaço, lá em 🔑 Chave da Supadata.";
    }
    if (codigo === "transcript-unavailable") return MSG_SEM_FALA;
    if (status === 404 || codigo === "not-found") return "Não achei esse vídeo. Ele pode ser privado, ter sido apagado ou o link veio incompleto.";
    if (codigo === "invalid-request" || status === 400) return "O serviço não aceitou esse link. Copia o link direto do botão Compartilhar do vídeo e tenta de novo.";
    if (codigo === "upgrade-required" || status === 402) return "Esse tipo de vídeo só funciona no plano pago da Supadata.";
    return "O serviço de transcrição deu um problema agora. Tenta de novo daqui a pouco.";
  }

  async function lerJson(resposta) {
    try { return await resposta.json(); } catch (_) { return null; }
  }
  function esperar(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /* ---------- FILTROS ---------- */
  function todasAsTags() {
    const tags = new Set();
    roteirosCache.forEach(r => (r.tags || []).forEach(t => t && tags.add(t)));
    return [...tags].sort((a, b) => a.localeCompare(b, "pt-BR"));
  }

  function renderChips() {
    const area = document.getElementById("rotChips");
    if (!area) return;
    const tags = todasAsTags();
    if (filtroAtual.startsWith("tag:") && !tags.includes(filtroAtual.slice(4))) filtroAtual = "todos";
    const contar = (fn) => roteirosCache.filter(fn).length;
    const chips = [
      { filtro: "todos", rotulo: `Todos (${roteirosCache.length})` },
      { filtro: "minha", rotulo: `🙋‍♀️ Meus (${contar(r => r.de_quem === "minha")})` },
      { filtro: "outra", rotulo: `👀 De outras (${contar(r => r.de_quem !== "minha")})` },
      ...tags.map(t => ({ filtro: "tag:" + t, rotulo: "#" + t })),
    ];
    area.innerHTML = chips.map(c =>
      `<button class="chip-filtro ${c.filtro === filtroAtual ? "ativo" : ""}" data-filtro="${attrEsc(c.filtro)}">${escapeHtml(c.rotulo)}</button>`
    ).join("");
  }

  function listaFiltrada() {
    return roteirosCache.filter(r => {
      let passaFiltro = true;
      if (filtroAtual === "minha") passaFiltro = r.de_quem === "minha";
      else if (filtroAtual === "outra") passaFiltro = r.de_quem !== "minha";
      else if (filtroAtual.startsWith("tag:")) passaFiltro = (r.tags || []).includes(filtroAtual.slice(4));
      const alvo = `${r.transcricao || ""} ${r.perfil || ""} ${r.titulo || ""} ${r.obs || ""} ${r.legenda || ""}`.toLowerCase();
      return passaFiltro && (!termoBusca || alvo.includes(termoBusca));
    });
  }

  /* ---------- CARDS ---------- */
  function renderLista() {
    const area = document.getElementById("rotLista");
    if (!area) return;

    if (roteirosCache.length === 0) {
      area.innerHTML = `<p class="vazio-explicativo">📭 Sua biblioteca ainda está vazia. Cole o link de um reel lá em cima e clique em 🎧 Transcrever.</p>`;
      return;
    }
    const lista = listaFiltrada();
    if (lista.length === 0) {
      area.innerHTML = `<p class="vazio-explicativo">🔍 Nenhum roteiro encontrado com esse filtro ou busca.</p>`;
      return;
    }
    area.innerHTML = lista.map(cardRoteiro).join("");
  }

  function cardRoteiro(r) {
    const fonte = FONTES[r.fonte] || FONTES.manual;
    const minha = r.de_quem === "minha";
    const dataMostrada = r.postado_em ? formatarData(r.postado_em) : formatarData(r.created_at);
    const capaImg = capaDoLink(r.url);
    const embed = embedDoLink(r.url);

    const capa = `
      <div class="rot-capa rot-capa-${r.fonte || "manual"}" ${capaImg ? `style="background-image:url('${attrEsc(capaImg)}')"` : ""}>
        <span class="rot-capa-emoji">${fonte.emoji}</span>
        ${embed
          ? `<button class="rot-botao-video" data-acao="video" data-id="${r.id}">▶ ver vídeo</button>`
          : r.url ? `<a class="rot-botao-video" href="${attrEsc(r.url)}" target="_blank" rel="noopener">↗ abrir link</a>` : `<span class="rot-capa-legenda">sem vídeo</span>`}
      </div>`;

    let miolo;
    if (r.status === "processando") {
      const agora = r.id === idTranscrevendo;
      miolo = `
        <div class="rot-status rot-status-processando">
          <span class="rot-relogio" aria-hidden="true">⏳</span>
          ${agora ? "Ouvindo o vídeo agora. Pode continuar usando o painel." : "Esse ficou pela metade (a aba foi fechada no meio)."}
        </div>
        ${agora ? "" : `<div class="rot-acoes"><button class="btn btn-primario" data-acao="tentar" data-id="${r.id}">🔁 Tentar de novo</button><button class="btn btn-secundario" data-acao="editar" data-id="${r.id}">✏️ Editar</button><button class="btn btn-secundario rot-btn-apagar" data-acao="apagar" data-id="${r.id}">🗑️ Apagar</button></div>`}`;
    } else if (r.status === "falhou") {
      miolo = `
        <div class="rot-status rot-status-falhou">⚠️ ${escapeHtml(r.erro || "Não consegui transcrever esse vídeo.")}</div>
        <div class="rot-acoes">
          <button class="btn btn-primario" data-acao="editar" data-id="${r.id}">📝 Abrir mesmo assim</button>
          ${r.url && !idTranscrevendo ? `<button class="btn btn-secundario" data-acao="tentar" data-id="${r.id}">🔁 Tentar de novo</button>` : ""}
          <button class="btn btn-secundario rot-btn-apagar" data-acao="apagar" data-id="${r.id}">🗑️ Apagar</button>
        </div>`;
    } else {
      miolo = `
        <p class="rot-trecho">${r.transcricao ? escapeHtml(r.transcricao) : `<em>Sem transcrição ainda. Clique em Editar pra escrever.</em>`}</p>
        <div class="rot-acoes">
          <button class="btn btn-primario" data-acao="copiar" data-id="${r.id}" ${r.transcricao ? "" : "disabled"}>📋 Copiar transcrição</button>
          <button class="btn btn-secundario" data-acao="editar" data-id="${r.id}">✏️ Editar</button>
          <button class="btn btn-secundario rot-btn-apagar" data-acao="apagar" data-id="${r.id}">🗑️ Apagar</button>
        </div>`;
    }

    return `
      <article class="rot-card ${minha ? "rot-card-minha" : "rot-card-outra"}" data-id="${r.id}">
        ${capa}
        <div class="rot-info">
          <div class="rot-info-topo">
            <span class="rot-etiqueta ${minha ? "rot-etiqueta-minha" : "rot-etiqueta-outra"}">${minha ? "🙋‍♀️ Meu" : "👀 De outra"}</span>
            <span class="rot-fonte">${fonte.emoji} ${fonte.nome}</span>
            <span class="rot-data">📅 ${dataMostrada}</span>
          </div>
          <h3 class="rot-card-titulo">${r.titulo ? escapeHtml(r.titulo) : `<span class="rot-sem-titulo">Sem título</span>`}</h3>
          ${r.perfil ? `<p class="rot-perfil">@${escapeHtml(r.perfil)}</p>` : ""}
          ${(r.tags || []).length ? `<div class="rot-tags">${r.tags.map(t => `<span class="rot-tag">#${escapeHtml(t)}</span>`).join("")}</div>` : ""}
          ${miolo}
        </div>
      </article>`;
  }

  async function aoClicarNaLista(evento) {
    const botao = evento.target.closest("[data-acao]");
    if (!botao || botao.tagName === "A") return;
    const roteiro = roteirosCache.find(r => r.id === botao.dataset.id);
    if (!roteiro) return;

    switch (botao.dataset.acao) {
      case "video": mostrarVideo(botao, roteiro); break;
      case "copiar": {
        const ok = await copiarTexto(roteiro.transcricao || "");
        botao.textContent = ok ? "copiado ✓" : "não deu pra copiar";
        setTimeout(() => { botao.textContent = "📋 Copiar transcrição"; }, 2000);
        break;
      }
      case "editar": abrirEdicao(roteiro); break;
      case "apagar": apagar(roteiro); break;
      case "tentar": tentarDeNovo(roteiro); break;
    }
  }

  // O embed só carrega quando clica: o do Instagram pesa uns 600KB cada.
  function mostrarVideo(botao, roteiro) {
    const embed = embedDoLink(roteiro.url);
    if (!embed) return;
    const card = botao.closest(".rot-card");
    const capa = card.querySelector(".rot-capa");
    card.classList.add("rot-com-video");
    capa.style.backgroundImage = "";
    capa.innerHTML = `<iframe src="${attrEsc(embed)}" title="Vídeo" loading="lazy" allow="autoplay; encrypted-media; picture-in-picture; fullscreen" allowfullscreen></iframe>`;
  }

  async function apagar(roteiro) {
    const nome = roteiro.titulo || (roteiro.perfil ? "@" + roteiro.perfil : "este roteiro");
    if (!confirm(`Apagar "${nome}" da biblioteca? Não dá pra desfazer.`)) return;
    const { error } = await window.banco.from("roteiros").delete().eq("id", roteiro.id);
    if (error) { mostrarToast("Não consegui apagar", "erro"); return; }
    roteirosCache = roteirosCache.filter(r => r.id !== roteiro.id);
    mostrarToast("Roteiro apagado");
    renderChips();
    renderLista();
  }

  async function tentarDeNovo(roteiro) {
    if (idTranscrevendo) { mostrarAviso("info", "⏳ Já tem um vídeo sendo ouvido. Espera ele terminar."); return; }
    if (!roteiro.url) { abrirEdicao(roteiro); return; }
    if (!chaveSupadata) { avisoSemChave(); return; }
    await atualizarLinha(roteiro.id, { status: "processando", erro: null });
    transcrever(roteiro.id, roteiro.url);
    document.getElementById("rotAviso")?.scrollIntoView({ behavior: "smooth", block: "center" });
  }

  /* ---------- MODAL DE EDIÇÃO ---------- */
  function abrirEdicao(roteiro, avisoTopo) {
    const novo = !roteiro;
    const r = roteiro || { de_quem: document.getElementById("rotDeQuem")?.value || "outra", tags: [] };

    abrirModalAdmin(novo ? "✍️ Escrever roteiro na mão" : "✏️ Editar roteiro", `
      <form id="rotFormulario">
        ${avisoTopo ? `<div class="rot-aviso rot-aviso-ok" style="margin:0 0 14px;">${escapeHtml(avisoTopo)}</div>` : ""}
        <div class="campo-admin">
          <label for="rotCampoTitulo">Título</label>
          <input id="rotCampoTitulo" value="${attrEsc(r.titulo || "")}" placeholder="Ex.: gancho da pergunta polêmica">
        </div>
        <div class="linha-campos">
          <div class="campo-admin">
            <label for="rotCampoDeQuem">De quem</label>
            <select id="rotCampoDeQuem">
              <option value="outra" ${r.de_quem !== "minha" ? "selected" : ""}>👀 De outra</option>
              <option value="minha" ${r.de_quem === "minha" ? "selected" : ""}>🙋‍♀️ Meu</option>
            </select>
          </div>
          <div class="campo-admin">
            <label for="rotCampoPerfil">Perfil</label>
            <input id="rotCampoPerfil" value="${attrEsc(r.perfil ? "@" + r.perfil : "")}" placeholder="@perfil">
          </div>
        </div>
        <div class="linha-campos">
          <div class="campo-admin">
            <label for="rotCampoLinkEdicao">Link</label>
            <input id="rotCampoLinkEdicao" value="${attrEsc(r.url || "")}" placeholder="https://...">
          </div>
          <div class="campo-admin">
            <label for="rotCampoPostado">Data de postagem</label>
            <input id="rotCampoPostado" type="date" value="${attrEsc(r.postado_em || "")}">
          </div>
        </div>
        <div class="campo-admin">
          <label for="rotCampoTags">Tags (separadas por vírgula)</label>
          <input id="rotCampoTags" value="${attrEsc((r.tags || []).join(", "))}" placeholder="gancho, skincare, humor">
        </div>
        <div class="campo-admin">
          <label for="rotCampoLegenda">Legenda do post</label>
          <textarea id="rotCampoLegenda" rows="3">${escapeHtml(r.legenda || "")}</textarea>
        </div>
        <div class="campo-admin">
          <label for="rotCampoTranscricao">Transcrição</label>
          <textarea id="rotCampoTranscricao" class="rot-caixa-grande">${escapeHtml(r.transcricao || "")}</textarea>
        </div>
        <div class="campo-admin">
          <label for="rotCampoObs">Minhas notas</label>
          <textarea id="rotCampoObs" rows="3" placeholder="O que chamou atenção, ideia pra adaptar...">${escapeHtml(r.obs || "")}</textarea>
        </div>
        <div class="linha-botoes-modal">
          <button type="button" class="btn btn-secundario" id="rotBotaoCancelar">Cancelar</button>
          <button type="submit" class="btn btn-primario">💾 Salvar</button>
        </div>
      </form>
    `);
    document.querySelector("#modalAdmin .modal-admin-caixa").classList.add("modal-largo");

    document.getElementById("rotBotaoCancelar").addEventListener("click", fecharModalAdmin);
    document.getElementById("rotFormulario").addEventListener("submit", async (evento) => {
      evento.preventDefault();
      const linkDigitado = document.getElementById("rotCampoLinkEdicao").value.trim();
      const link = linkDigitado ? (limparLink(linkDigitado) || linkDigitado) : null;
      const tags = [...new Set(document.getElementById("rotCampoTags").value.split(",")
        .map(t => t.trim().replace(/^#/, "")).filter(Boolean))];

      const dados = {
        titulo: document.getElementById("rotCampoTitulo").value.trim() || null,
        de_quem: document.getElementById("rotCampoDeQuem").value,
        perfil: document.getElementById("rotCampoPerfil").value.trim().replace(/^@+/, "") || null,
        url: link,
        fonte: fonteDoLink(link),
        postado_em: document.getElementById("rotCampoPostado").value || null,
        tags,
        legenda: document.getElementById("rotCampoLegenda").value.trim() || null,
        transcricao: document.getElementById("rotCampoTranscricao").value.trim() || null,
        obs: document.getElementById("rotCampoObs").value.trim() || null,
      };
      // Salvar à mão transforma o roteiro em "pronto", menos o que está sendo ouvido agora.
      if (novo || r.id !== idTranscrevendo) { dados.status = "pronto"; dados.erro = null; }

      if (novo) {
        const { data, error } = await window.banco.from("roteiros").insert(dados).select().single();
        if (error) { mostrarToast("Não consegui salvar. Já rodou o sql-roteiros.sql?", "erro"); return; }
        roteirosCache.unshift(data);
      } else {
        const error = await atualizarLinha(r.id, dados);
        if (error) { mostrarToast("Não consegui salvar: " + error.message, "erro"); return; }
      }
      fecharModalAdmin();
      mostrarToast(novo ? "Roteiro guardado ✓" : "Roteiro salvo ✓");
      if (!idTranscrevendo) esconderAviso();
      renderChips();
      renderLista();
    });
  }

  /* ---------- ESTUDAR COM O CLAUDE ---------- */
  async function estudarComClaude() {
    const dasOutras = roteirosCache
      .filter(r => r.de_quem !== "minha" && r.status === "pronto" && (r.transcricao || "").trim())
      .slice(0, 10);
    if (dasOutras.length === 0) {
      mostrarToast("Primeiro guarde alguns roteiros marcados como \"De outra\"", "erro");
      return;
    }
    const meus = roteirosCache
      .filter(r => r.de_quem === "minha" && r.status === "pronto" && (r.transcricao || "").trim())
      .slice(0, 3);

    const blocosOutras = dasOutras.map((r, i) =>
      `ROTEIRO ${i + 1}\nPerfil: ${r.perfil ? "@" + r.perfil : "não informado"}${r.titulo ? `\nTítulo: ${r.titulo}` : ""}\nTranscrição:\n${r.transcricao.trim()}`
    ).join("\n\n");

    const blocoMeu = meus.length
      ? `Pra você entender o MEU assunto e o meu jeito de falar, ${meus.length === 1 ? "aqui vai um roteiro meu" : `aqui vão ${meus.length} roteiros meus`}:\n\n` +
        meus.map((r, i) => `MEU ROTEIRO ${i + 1}${r.titulo ? ` (${r.titulo})` : ""}:\n${r.transcricao.trim()}`).join("\n\n")
      : `Ainda não tenho roteiros meus guardados aqui. Antes de escrever os 5 roteiros novos, me pergunte qual é o meu assunto e o meu público.`;

    const prompt =
`Sou a Laura Oliveira, creator de conteúdo e UGC. Separei ${dasOutras.length} ${dasOutras.length === 1 ? "roteiro" : "roteiros"} de outras creators que estão performando bem. Quero estudar o que está funcionando pra aplicar no meu conteúdo.

${blocosOutras}

${blocoMeu}

Com base nos roteiros das outras creators, me entregue:

1. Assuntos em alta: quais temas aparecem mais e por que você acha que estão prendendo a atenção.
2. Expressões que estão prendendo: palavras, bordões e jeitos de falar que se repetem e funcionam.
3. Padrões de gancho: os tipos de abertura usados nos primeiros segundos. Para cada padrão, cite um exemplo real tirado das transcrições acima.
4. Cinco roteiros novos no MEU assunto, reaproveitando a ESTRUTURA desses vídeos (gancho, ritmo, virada, chamada final), nunca o conteúdo. Cada roteiro com gancho, desenvolvimento e fechamento, e a indicação de qual padrão de gancho ele usa.

Regras: escreva em português do Brasil, do jeito que se fala, natural e sem ficar robotizado. Nada de frases de propaganda genéricas. Não use travessão.`;

    const ok = await copiarTexto(prompt);
    if (ok) {
      mostrarToast("🧠 Prompt copiado. Agora é só colar no Claude.");
    } else {
      abrirModalAdmin("🧠 Prompt pra colar no Claude", `
        <p style="margin-top:0;">Não consegui copiar sozinha. Selecione o texto abaixo e copie.</p>
        <textarea class="rot-caixa-grande" style="width:100%;" readonly>${escapeHtml(prompt)}</textarea>`);
      document.querySelector("#modalAdmin .modal-admin-caixa").classList.add("modal-largo");
    }
  }

  async function copiarTexto(texto) {
    try {
      await navigator.clipboard.writeText(texto);
      return true;
    } catch (_) {
      const area = document.createElement("textarea");
      area.value = texto;
      area.style.position = "fixed";
      area.style.opacity = "0";
      document.body.appendChild(area);
      area.select();
      let ok = false;
      try { ok = document.execCommand("copy"); } catch (_) { ok = false; }
      area.remove();
      return ok;
    }
  }

  return { render, limparLink, perfilDoLink, embedDoLink, fonteDoLink };
})();
