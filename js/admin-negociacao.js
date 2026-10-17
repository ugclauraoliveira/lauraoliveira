/* =========================================================
   ADMIN-NEGOCIACAO.JS
   Aba "Negociação": cola a mensagem (ou envia um print) de uma
   negociação com marca, e uma IA sugere a resposta seguindo o
   manual de negociação (aulas que a Laura foi fazendo).
========================================================= */

window.AdminNegociacao = (function () {

  let historicoCache = [];
  let imagemSelecionada = null; // { base64, mimeType, nomeArquivo }

  function $(id) { return document.getElementById(id); }

  async function render(container) {
    container.innerHTML = `
      <div class="cartao">
        <h2>Nova negociação</h2>
        <form id="formularioNegociacao">
          <div class="campo-admin">
            <label for="campoMarcaNeg">Marca (opcional)</label>
            <input id="campoMarcaNeg" placeholder="Ex: Marca Tal">
          </div>
          <div class="campo-admin">
            <label for="campoMensagemNeg">Cole aqui a mensagem que a marca mandou</label>
            <textarea id="campoMensagemNeg" placeholder="Cole o texto da conversa..." style="min-height:110px;"></textarea>
          </div>
          <div class="campo-admin">
            <label for="campoImagemNeg">Ou envie um print da conversa (opcional)</label>
            <input id="campoImagemNeg" type="file" accept="image/*">
            <span id="nomeImagemNeg" style="font-size:.78rem; color:var(--tinta-suave);"></span>
          </div>
          <div class="linha-botoes-modal" style="margin-top:4px;">
            <button type="submit" class="btn btn-primario" id="botaoGerarNeg">${ICONES.enviar(16)} Gerar resposta</button>
          </div>
        </form>
        <div id="areaRespostaNeg" style="margin-top:16px;"></div>
      </div>

      <div class="cartao">
        <h2>Histórico</h2>
        <div id="areaHistoricoNeg"></div>
      </div>
    `;

    $("formularioNegociacao").addEventListener("submit", gerarResposta);
    $("campoImagemNeg").addEventListener("change", aoSelecionarImagem);

    await carregarHistorico(container);
  }

  function aoSelecionarImagem(evento) {
    const arquivo = evento.target.files[0];
    if (!arquivo) { imagemSelecionada = null; $("nomeImagemNeg").textContent = ""; return; }

    const leitor = new FileReader();
    leitor.onload = () => {
      const resultado = String(leitor.result || "");
      const base64 = resultado.split(",")[1] || "";
      imagemSelecionada = { base64, mimeType: arquivo.type, nomeArquivo: arquivo.name };
      $("nomeImagemNeg").textContent = `Selecionado: ${arquivo.name}`;
    };
    leitor.onerror = () => mostrarToast("Não consegui ler essa imagem", "erro");
    leitor.readAsDataURL(arquivo);
  }

  async function gerarResposta(evento) {
    evento.preventDefault();
    const marca = $("campoMarcaNeg").value.trim();
    const mensagem = $("campoMensagemNeg").value.trim();

    if (!mensagem && !imagemSelecionada) {
      mostrarToast("Cole o texto da marca ou envie um print", "erro");
      return;
    }

    const botao = $("botaoGerarNeg");
    botao.disabled = true;
    const textoOriginal = botao.textContent;
    botao.textContent = "Gerando...";

    try {
      const { data: sessao } = await window.banco.auth.getSession();
      const token = sessao && sessao.session ? sessao.session.access_token : null;

      const corpo = { marca, mensagem };
      if (imagemSelecionada) {
        corpo.imagemBase64 = imagemSelecionada.base64;
        corpo.imagemMimeType = imagemSelecionada.mimeType;
      }

      const res = await fetch(`${URL_SUPABASE}/functions/v1/gerar-resposta-negociacao`, {
        method: "POST",
        headers: { "Content-Type": "application/json", apikey: CHAVE_SUPABASE_PUBLICA, Authorization: `Bearer ${token}` },
        body: JSON.stringify(corpo),
      });
      const dados = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(dados.erro || "Falha ao gerar a resposta.");

      mostrarResposta(dados.resposta);
      await carregarHistorico(document.getElementById("conteudoAba"));
    } catch (erro) {
      mostrarToast("Não consegui gerar a resposta: " + erro.message, "erro");
    } finally {
      botao.disabled = false;
      botao.textContent = textoOriginal;
    }
  }

  function mostrarResposta(texto) {
    const area = $("areaRespostaNeg");
    area.innerHTML = `
      <div class="campo-admin">
        <label>Resposta sugerida</label>
        <textarea id="campoRespostaGeradaNeg" style="min-height:140px;" readonly>${escapeHtml(texto)}</textarea>
      </div>
      <button type="button" class="btn btn-secundario" id="botaoCopiarRespostaNeg">${ICONES.copiar(16)} Copiar</button>
    `;
    $("botaoCopiarRespostaNeg").addEventListener("click", () => {
      navigator.clipboard.writeText(texto)
        .then(() => mostrarToast("Resposta copiada"))
        .catch(() => mostrarToast("Não consegui copiar sozinho, selecione o texto", "erro"));
    });
  }

  async function carregarHistorico(container) {
    const { data, error } = await window.banco.from("negociacoes_historico").select("*").order("criado_em", { ascending: false }).limit(30);
    if (error) {
      avisoFaltando(container, "negociacoes_historico (rode o adicionar-negociacao.sql)", error);
      return;
    }
    historicoCache = data || [];
    renderHistorico();
  }

  function renderHistorico() {
    const area = $("areaHistoricoNeg");
    if (!area) return;
    if (historicoCache.length === 0) {
      area.innerHTML = `<p class="vazio-explicativo">Nenhuma negociação registrada ainda.</p>`;
      return;
    }
    area.innerHTML = historicoCache.map((h) => `
      <div class="cartao" style="margin-bottom:10px; box-shadow:none; border:1px solid rgba(58,43,34,0.1);">
        <div style="display:flex; justify-content:space-between; gap:10px; flex-wrap:wrap;">
          <strong>${escapeHtml(h.marca || "Marca não informada")}</strong>
          <span style="font-size:.78rem; color:var(--tinta-suave);">${formatarDataHora(h.criado_em)}</span>
        </div>
        <p style="font-size:.85rem; margin:8px 0 2px;"><strong>Marca disse:</strong> ${escapeHtml(h.mensagem_recebida)}</p>
        <p style="font-size:.85rem; margin:2px 0 0;"><strong>Resposta sugerida:</strong> ${escapeHtml(h.resposta_sugerida)}</p>
      </div>
    `).join("");
  }

  return { render };
})();
