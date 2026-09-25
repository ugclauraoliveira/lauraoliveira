/* =========================================================
   SITE.JS
   Liga o portfólio publicado ao banco de dados:
   1) mostra os vídeos cadastrados no painel admin
   2) manda o formulário de contato para a tabela "marcas"
   3) registra uma visita simples na tabela "visitas"

   Se o banco ainda não tiver nenhuma tabela criada (banco.sql
   não rodado ainda), o site continua funcionando normalmente,
   só sem esses vídeos/registro.
========================================================= */

(async function carregarVideosDoPortfolio() {
  const destaquesGrid = document.getElementById("destaquesGrid");
  const filtrosNicho = document.getElementById("filtrosNicho");
  const trabalhosGrid = document.getElementById("trabalhosGrid");
  if (!destaquesGrid || !trabalhosGrid) return;

  let videos = [];
  try {
    const { data, error } = await window.banco
      .from("videos")
      .select("*")
      .eq("visivel", true)
      .order("ordem", { ascending: true });
    if (error) throw error;
    videos = data || [];
  } catch (erro) {
    console.warn("Não consegui carregar os vídeos do banco:", erro);
    videos = [];
  }

  // ---------- DESTAQUES ----------
  const destaques = videos.filter(v => (v.destaque || "").trim() !== "");
  if (destaques.length === 0) {
    destaquesGrid.innerHTML = `<p class="vazio-explicativo" style="grid-column:1/-1; text-align:center; color: var(--tinta-suave);">Assim que você marcar um vídeo como destaque no painel admin, ele aparece aqui.</p>`;
  } else {
    destaquesGrid.innerHTML = destaques.map(v => `
      <a class="destaque-card visivel" href="${atributoSeguro(v.link)}" target="_blank" rel="noopener" aria-label="Assistir ao vídeo: ${textoSeguro(v.titulo)}">
        <div class="destaque-capa">
          <div class="midia-placeholder" role="img" aria-label="Capa vertical 9:16 do conteúdo">${textoSeguro(v.formato) || "capa vertical 9:16"}</div>
          <span class="play-botao" aria-hidden="true"></span>
        </div>
        <div class="destaque-info">
          <span class="destaque-numero">${textoSeguro(v.destaque)}</span>
          <span class="destaque-rotulo">${textoSeguro(v.nicho)}</span>
          <h3>${textoSeguro(v.titulo)}</h3>
          <p class="destaque-contexto">${v.marca ? "Trabalho para " + textoSeguro(v.marca) : ""}</p>
        </div>
      </a>
    `).join("");
  }

  // ---------- FILTRO DE NICHO + TRABALHOS (agrupados por nicho) ----------
  if (videos.length === 0) {
    if (filtrosNicho) filtrosNicho.innerHTML = "";
    trabalhosGrid.innerHTML = `<p class="vazio-explicativo" style="text-align:center; color: var(--tinta-suave);">Seus vídeos aparecem aqui assim que forem cadastrados no painel admin.</p>`;
    return;
  }

  // Ordem preferida dos nichos. Qualquer nicho que não estiver nessa lista
  // aparece depois, na ordem em que for encontrado nos vídeos.
  const ORDEM_NICHOS = ["Tech", "Educação", "Moda e Beleza", "Autocuidado", "Experiência", "Casa & Decoração", "Promoções"];

  const nichosEncontrados = [...new Set(videos.map(v => (v.nicho || "").trim()).filter(Boolean))];
  const nichos = ORDEM_NICHOS.filter(n => nichosEncontrados.includes(n))
    .concat(nichosEncontrados.filter(n => !ORDEM_NICHOS.includes(n)));

  if (filtrosNicho) {
    filtrosNicho.innerHTML = [`<button class="filtro-btn ativo" data-niche="todos" aria-pressed="true">Todos</button>`]
      .concat(nichos.map(n => `<button class="filtro-btn" data-niche="${atributoSeguro(n)}" aria-pressed="false">${textoSeguro(n)}</button>`))
      .join("");

    filtrosNicho.addEventListener("click", (evento) => {
      const botao = evento.target.closest(".filtro-btn");
      if (!botao) return;
      const niche = botao.dataset.niche;

      filtrosNicho.querySelectorAll(".filtro-btn").forEach(b => { b.classList.remove("ativo"); b.setAttribute("aria-pressed", "false"); });
      botao.classList.add("ativo");
      botao.setAttribute("aria-pressed", "true");

      trabalhosGrid.querySelectorAll(".trabalhos-grupo").forEach(grupo => {
        grupo.hidden = !(niche === "todos" || grupo.dataset.niche === niche);
      });
    });
  }

  function cartaoTrabalho(v) {
    return `
      <article class="trabalho-card visivel">
        <div class="trabalho-capa">
          <div class="midia-placeholder" role="img" aria-label="${atributoSeguro(v.formato)} do trabalho ${atributoSeguro(v.titulo)}">${textoSeguro(v.formato)}</div>
        </div>
        <div class="trabalho-corpo">
          <span class="trabalho-niche">${textoSeguro(v.nicho)}</span>
          <h3>${textoSeguro(v.titulo)}</h3>
          <p>${textoSeguro(v.marca)}</p>
        </div>
      </article>`;
  }

  // Um bloco por nicho, cada um com seu título e sua própria grade.
  // "videos" já vem ordenado por "ordem" (ver a consulta lá em cima),
  // então dentro de cada nicho os vídeos mantêm a ordem cadastrada.
  trabalhosGrid.innerHTML = nichos.map(nicho => {
    const videosDoNicho = videos.filter(v => (v.nicho || "").trim() === nicho);
    return `
      <div class="trabalhos-grupo" data-niche="${atributoSeguro(nicho)}">
        <h3 class="trabalhos-grupo-titulo">${textoSeguro(nicho)}</h3>
        <div class="trabalhos-grid">
          ${videosDoNicho.map(cartaoTrabalho).join("")}
        </div>
      </div>`;
  }).join("");
})();

function textoSeguro(valor) {
  return String(valor ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}
function atributoSeguro(valor) {
  return textoSeguro(valor).replace(/`/g, "&#96;");
}

/* =========================================================
   FORMULÁRIO DE CONTATO -> tabela "marcas" (como "lead")
========================================================= */
(function ligarFormularioContato() {
  const formularioContato = document.getElementById("formularioContato");
  const confirmacaoEnvio = document.getElementById("confirmacaoEnvio");
  if (!formularioContato) return;

  formularioContato.addEventListener("submit", async (evento) => {
    evento.preventDefault();
    if (!formularioContato.checkValidity()) {
      formularioContato.reportValidity();
      return;
    }

    const nome = document.getElementById("campoNome").value.trim();
    const email = document.getElementById("campoEmail").value.trim();
    const mensagem = document.getElementById("campoMensagem").value.trim();
    const botaoEnviar = formularioContato.querySelector('button[type="submit"]');
    botaoEnviar.disabled = true;

    try {
      await window.banco.from("marcas").insert({
        nome: nome,
        email: email,
        obs: mensagem,
        situacao: "lead",
        ultimo_contato: new Date().toISOString().slice(0, 10),
      });
    } catch (erro) {
      console.warn("Não consegui salvar esse contato no banco:", erro);
    }

    botaoEnviar.disabled = false;
    formularioContato.hidden = true;
    confirmacaoEnvio.hidden = false;
  });
})();

/* =========================================================
   REGISTRO SIMPLES DE VISITA -> tabela "visitas"
   Não usa nenhum serviço externo e não pede nada ao visitante.
========================================================= */
(async function registrarVisita() {
  try {
    let origem = "direto";
    if (document.referrer) {
      try { origem = new URL(document.referrer).hostname; } catch (e) { /* referrer inválido, mantém "direto" */ }
    }
    await window.banco.from("visitas").insert({
      pagina: window.location.pathname || "/",
      origem: origem,
    });
  } catch (erro) {
    console.warn("Não consegui registrar a visita:", erro);
  }
})();
