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
  const youtubeAdsGrid = document.getElementById("youtubeAdsGrid");
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

  // ---------- DESTAQUES (carrossel que passa sozinho a cada 5s) ----------
  const destaques = videos.filter(v => (v.destaque || "").trim() !== "");
  if (destaques.length === 0) {
    destaquesGrid.innerHTML = `<p class="vazio-explicativo" style="text-align:center; color: var(--tinta-suave);">Assim que você marcar um vídeo como destaque no painel admin, ele aparece aqui.</p>`;
  } else {
    destaquesGrid.innerHTML = destaques.map(v => `
      <div class="destaque-slot">
        ${v.marca ? `<p class="destaque-marca">${textoSeguro(v.marca)}</p>` : ""}
        <a class="destaque-card visivel" href="${atributoSeguro(v.link)}" target="_blank" rel="noopener" aria-label="Assistir ao vídeo: ${textoSeguro(v.titulo)}">
          <div class="destaque-capa">
            ${capaDoTrabalho(v)}
            <span class="play-botao" aria-hidden="true"></span>
          </div>
        </a>
        ${v.destaque ? `<p class="destaque-legenda">${textoSeguro(v.destaque)}</p>` : ""}
      </div>
    `).join("");
  }
  iniciarCarrosselDestaques(destaques.length);

  // ---------- YOUTUBE ADS (vídeos marcados com o campo "YouTube Ads") ----------
  // Esse campo é separado do "Destaque": um vídeo pode aparecer só aqui,
  // só em Destaques, nos dois, ou em nenhum.
  if (youtubeAdsGrid) {
    const destaquesParaYoutube = videos.filter(v => (v.youtube_ads || "").trim() !== "").slice(0, 2);
    if (destaquesParaYoutube.length === 0) {
      youtubeAdsGrid.innerHTML = `<p class="vazio-explicativo" style="color: rgba(255,253,248,0.75);">Marque vídeos como "YouTube Ads" no painel admin pra eles aparecerem aqui.</p>`;
    } else {
      youtubeAdsGrid.innerHTML = destaquesParaYoutube.map(v => `
        <a class="destaque-card youtube-ads-card" href="${atributoSeguro(v.link)}" target="_blank" rel="noopener" aria-label="Assistir ao vídeo: ${textoSeguro(v.titulo)}">
          ${capaDoTrabalho(v)}
          <span class="youtube-ads-selo">${textoSeguro(v.youtube_ads)}</span>
          <span class="play-botao" aria-hidden="true"></span>
        </a>
      `).join("");
    }
  }

  // ---------- FILTRO DE NICHO + TRABALHOS (agrupados por nicho) ----------
  if (videos.length === 0) {
    if (filtrosNicho) filtrosNicho.innerHTML = "";
    trabalhosGrid.innerHTML = `<p class="vazio-explicativo" style="text-align:center; color: var(--tinta-suave);">Seus vídeos aparecem aqui assim que forem cadastrados no painel admin.</p>`;
    return;
  }

  // Ordem preferida dos nichos. Qualquer nicho que não estiver nessa lista
  // aparece depois, na ordem em que for encontrado nos vídeos.
  const ORDEM_NICHOS = ["Tech & Apps", "Educação", "Moda e Beleza", "Autocuidado", "Experiência", "Casa e Gastronomia", "Promoções"];

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

  function capaDoTrabalho(v) {
    const thumb = obterThumbnailYoutube(v.link);
    if (thumb) {
      // Se a miniatura falhar ao carregar (raro, mas acontece com algum vídeo
      // específico), "capaFalhou" troca a imagem quebrada pelo bloco de degradê.
      return `<img src="${atributoSeguro(thumb)}" alt="" loading="lazy" data-formato="${atributoSeguro(v.formato)}" onerror="capaFalhou(this)">`;
    }
    return `<div class="midia-placeholder" role="img" aria-label="${atributoSeguro(v.formato)} do trabalho ${atributoSeguro(v.titulo)}">${textoSeguro(v.formato)}</div>`;
  }

  function cartaoTrabalho(v) {
    return `
      <a class="trabalho-card visivel" href="${atributoSeguro(v.link)}" target="_blank" rel="noopener" aria-label="Assistir ao vídeo: ${textoSeguro(v.titulo)}">
        <div class="trabalho-capa">
          ${capaDoTrabalho(v)}
          <div class="trabalho-badges">
            ${v.marca ? `<span class="trabalho-selo">${textoSeguro(v.marca)}</span>` : ""}
            ${v.destaque ? `<span class="trabalho-selo trabalho-selo-destaque">${textoSeguro(v.destaque)}</span>` : ""}
          </div>
          <span class="play-botao" aria-hidden="true"></span>
          <div class="trabalho-legenda">
            <h3>${textoSeguro(v.titulo)}</h3>
            <span class="trabalho-niche">${textoSeguro(v.nicho)}</span>
          </div>
        </div>
      </a>`;
  }

  // Um bloco por nicho, cada um com seu título, a quantidade de vídeos
  // e um carrossel mostrando alguns por vez (ver "iniciarCarrosseis").
  // "videos" já vem ordenado por "ordem" (ver a consulta lá em cima),
  // então dentro de cada nicho os vídeos mantêm a ordem cadastrada.
  trabalhosGrid.innerHTML = nichos.map(nicho => {
    const videosDoNicho = videos.filter(v => (v.nicho || "").trim() === nicho);
    return `
      <div class="trabalhos-grupo" data-niche="${atributoSeguro(nicho)}">
        <div class="trabalhos-grupo-cabecalho">
          <h3 class="trabalhos-grupo-titulo">${textoSeguro(nicho)}<span class="contagem">${videosDoNicho.length}</span></h3>
          <div class="trabalhos-grupo-setas">
            <button type="button" class="seta-carrossel seta-anterior" aria-label="Ver vídeos anteriores de ${textoSeguro(nicho)}">‹</button>
            <button type="button" class="seta-carrossel seta-proxima" aria-label="Ver mais vídeos de ${textoSeguro(nicho)}">›</button>
          </div>
        </div>
        <div class="trabalhos-pista">
          <div class="trabalhos-trilho">
            ${videosDoNicho.map(v => `<div class="trabalho-slot">${cartaoTrabalho(v)}</div>`).join("")}
          </div>
        </div>
      </div>`;
  }).join("");

  iniciarCarrosseis(trabalhosGrid);
})();

/* =========================================================
   CARROSSEL DOS DESTAQUES
   Passa sozinho a cada 5 segundos, e também dá pra usar as
   setinhas pra navegar manualmente.
========================================================= */
function iniciarCarrosselDestaques(totalVideos) {
  const pista = document.querySelector(".destaques-pista");
  const trilho = document.getElementById("destaquesGrid");
  const botaoAnterior = document.querySelector(".seta-destaque-anterior");
  const botaoProxima = document.querySelector(".seta-destaque-proxima");
  if (!pista || !trilho || !botaoAnterior || !botaoProxima) return;

  if (totalVideos === 0) {
    botaoAnterior.hidden = true;
    botaoProxima.hidden = true;
    return;
  }

  let indiceAtivo = 0;
  let temporizador = null;

  function atualizar() {
    indiceAtivo = ((indiceAtivo % totalVideos) + totalVideos) % totalVideos;
    const slots = Array.from(trilho.children);

    slots.forEach((slot, i) => slot.classList.toggle("destaque-slot-ativo", i === indiceAtivo));

    const ativo = slots[indiceAtivo];
    if (ativo) {
      const centroAtivo = ativo.offsetLeft + ativo.offsetWidth / 2;
      trilho.style.transform = `translateX(${pista.clientWidth / 2 - centroAtivo}px)`;
    }

    const precisaDeSetas = totalVideos > 1;
    botaoAnterior.hidden = !precisaDeSetas;
    botaoProxima.hidden = !precisaDeSetas;
  }

  function reiniciarAutoAvanco() {
    clearInterval(temporizador);
    if (totalVideos <= 1) return;
    temporizador = setInterval(() => { indiceAtivo++; atualizar(); }, 5000);
  }

  botaoAnterior.addEventListener("click", () => { indiceAtivo--; atualizar(); reiniciarAutoAvanco(); });
  botaoProxima.addEventListener("click", () => { indiceAtivo++; atualizar(); reiniciarAutoAvanco(); });

  atualizar();
  reiniciarAutoAvanco();

  let redimensionando = null;
  window.addEventListener("resize", () => {
    clearTimeout(redimensionando);
    redimensionando = setTimeout(atualizar, 120);
  });
}

/* =========================================================
   CARROSSEL DOS TRABALHOS
   Mostra só alguns vídeos por vez (a quantidade muda sozinha
   conforme a largura da tela) e usa as setinhas pra avançar.
========================================================= */
function itensPorPaginaAtual() {
  const largura = window.innerWidth;
  if (largura <= 420) return 1;
  if (largura <= 680) return 2;
  if (largura <= 1100) return 3;
  return 5;
}

function iniciarCarrosseis(trabalhosGrid) {
  const grupos = Array.from(trabalhosGrid.querySelectorAll(".trabalhos-grupo"));
  const paginaPorGrupo = new WeakMap();

  function atualizarGrupo(grupo) {
    const trilho = grupo.querySelector(".trabalhos-trilho");
    const botaoAnterior = grupo.querySelector(".seta-anterior");
    const botaoProxima = grupo.querySelector(".seta-proxima");
    const total = trilho.children.length;
    const itensPorPagina = itensPorPaginaAtual();
    const totalPaginas = Math.max(1, Math.ceil(total / itensPorPagina));

    // Quando o nicho tem menos vídeos do que cabe na tela, os cards
    // crescem pra preencher a linha inteira em vez de deixar espaço vazio.
    trilho.style.setProperty("--colunas-grupo", Math.min(total, itensPorPagina));

    let pagina = paginaPorGrupo.get(grupo) || 0;
    pagina = Math.max(0, Math.min(pagina, totalPaginas - 1));
    paginaPorGrupo.set(grupo, pagina);

    // Em vez de andar por múltiplos exatos de "itensPorPagina" (o que deixa
    // a última página com buracos quando sobra menos vídeo do que cabe na
    // tela), o índice inicial fica "grudado" no fim: a última página sempre
    // mostra a tela cheia, repetindo alguns cards da página anterior se
    // precisar.
    const indiceMaximo = Math.max(0, total - itensPorPagina);
    const indiceInicial = Math.min(pagina * itensPorPagina, indiceMaximo);
    const larguraSlot = trilho.children[0] ? trilho.children[0].offsetWidth : 0;
    trilho.style.transform = `translateX(-${indiceInicial * larguraSlot}px)`;

    const precisaDeSetas = total > itensPorPagina;
    grupo.querySelector(".trabalhos-grupo-setas").hidden = !precisaDeSetas;
    if (precisaDeSetas) {
      botaoAnterior.disabled = pagina === 0;
      botaoProxima.disabled = pagina >= totalPaginas - 1;
    }
  }

  document.documentElement.style.setProperty("--itens-pagina", itensPorPaginaAtual());

  grupos.forEach(grupo => {
    paginaPorGrupo.set(grupo, 0);
    grupo.querySelector(".seta-anterior").addEventListener("click", () => {
      paginaPorGrupo.set(grupo, (paginaPorGrupo.get(grupo) || 0) - 1);
      atualizarGrupo(grupo);
    });
    grupo.querySelector(".seta-proxima").addEventListener("click", () => {
      paginaPorGrupo.set(grupo, (paginaPorGrupo.get(grupo) || 0) + 1);
      atualizarGrupo(grupo);
    });
    atualizarGrupo(grupo);
  });

  let redimensionando = null;
  window.addEventListener("resize", () => {
    document.documentElement.style.setProperty("--itens-pagina", itensPorPaginaAtual());
    clearTimeout(redimensionando);
    redimensionando = setTimeout(() => grupos.forEach(atualizarGrupo), 120);
  });
}

/* =========================================================
   CAPA REAL DO YOUTUBE (Shorts ou vídeo normal)
   Usa a miniatura pública do YouTube, sem precisar guardar
   nenhuma imagem no site. Se o link não for do YouTube ou o
   ID não for encontrado, o card cai no bloco de degradê.
========================================================= */
function obterIdYoutube(link) {
  if (!link) return null;
  const padroes = [
    /youtube\.com\/shorts\/([a-zA-Z0-9_-]{6,})/,
    /youtu\.be\/([a-zA-Z0-9_-]{6,})/,
    /[?&]v=([a-zA-Z0-9_-]{6,})/,
  ];
  for (const padrao of padroes) {
    const encontrado = link.match(padrao);
    if (encontrado) return encontrado[1];
  }
  return null;
}
function obterThumbnailYoutube(link) {
  const id = obterIdYoutube(link);
  return id ? `https://i.ytimg.com/vi/${id}/hqdefault.jpg` : null;
}
function capaFalhou(img) {
  const div = document.createElement("div");
  div.className = "midia-placeholder";
  div.setAttribute("role", "img");
  div.textContent = img.dataset.formato || "Vídeo vertical 9:16";
  img.replaceWith(div);
}

/* =========================================================
   MODAL DE VÍDEO
   Ao clicar num card de destaque ou de trabalho, o vídeo do
   YouTube abre por cima da própria página (sem sair do site).
   Se o link não for do YouTube, o clique segue o comportamento
   normal (abre em outra aba).
========================================================= */
(function configurarModalVideo() {
  const fundo = document.getElementById("modalVideoFundo");
  const iframe = document.getElementById("modalVideoIframe");
  const botaoFechar = document.getElementById("modalVideoFechar");
  if (!fundo || !iframe || !botaoFechar) return;

  function abrirVideo(idVideo) {
    iframe.src = `https://www.youtube.com/embed/${idVideo}?autoplay=1&rel=0`;
    fundo.classList.add("aberto");
    document.body.style.overflow = "hidden";
  }
  function fecharVideo() {
    fundo.classList.remove("aberto");
    iframe.src = "";
    document.body.style.overflow = "";
  }

  document.addEventListener("click", (evento) => {
    const card = evento.target.closest(".destaque-card, .trabalho-card");
    if (!card) return;
    const idVideo = obterIdYoutube(card.getAttribute("href"));
    if (!idVideo) return; // não é do YouTube: deixa abrir normal em outra aba
    evento.preventDefault();
    abrirVideo(idVideo);
  });

  botaoFechar.addEventListener("click", fecharVideo);
  fundo.addEventListener("click", (evento) => { if (evento.target === fundo) fecharVideo(); });
  document.addEventListener("keydown", (evento) => {
    if (evento.key === "Escape" && fundo.classList.contains("aberto")) fecharVideo();
  });
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
    const marca = document.getElementById("campoMarca").value.trim();
    const orcamento = document.getElementById("campoOrcamento").value.trim();
    const mensagem = document.getElementById("campoMensagem").value.trim();
    const botaoEnviar = formularioContato.querySelector('button[type="submit"]');
    botaoEnviar.disabled = true;

    // Marca/empresa e orçamento não têm coluna própria no banco, então
    // entram junto da mensagem no campo "obs" pra ficar tudo num só lugar.
    const partesObs = [];
    if (marca) partesObs.push("Marca/empresa: " + marca);
    if (orcamento) partesObs.push("Orçamento estimado: " + orcamento);
    partesObs.push(mensagem);

    try {
      await window.banco.from("marcas").insert({
        nome: nome,
        email: email,
        obs: partesObs.join("\n"),
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
   Se você estiver logada (editando no painel admin), a sessão é
   a mesma em todo o site, então essa visita não é contabilizada.
========================================================= */
(async function registrarVisita() {
  try {
    const { data: sessaoAtual } = await window.banco.auth.getSession();
    if (sessaoAtual.session) return;

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
