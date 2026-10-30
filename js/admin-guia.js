/* =========================================================
   ADMIN-GUIA.JS
   Aba "Guia da Imersão": mostra, dentro do próprio painel, o
   conteúdo de um guia externo (site separado, de outra pessoa),
   carregado ao vivo direto de lá. O guia tem uma página por dia;
   pra adicionar um novo dia, é só incluir mais um item na lista
   DIAS abaixo.
========================================================= */

window.AdminGuia = (function () {

  const DIAS = [
    { rotulo: "Dia 1", url: "https://eilaradam.github.io/guia-imersao/#e1" },
    { rotulo: "Dia 2", url: "https://eilaradam.github.io/guia-imersao/dia2/#e1" },
  ];

  let diaAtual = 0;

  function $(id) { return document.getElementById(id); }

  function render(container) {
    container.innerHTML = `
      <div class="cartao" style="padding:0; overflow:hidden;">
        <div style="display:flex; align-items:center; justify-content:space-between; flex-wrap:wrap; gap:10px; padding:14px 16px; border-bottom:1px solid rgba(58,43,34,0.1);">
          <div class="barra-filtros" style="margin:0;" id="chipsDiasGuia">
            ${DIAS.map((d, i) => `<button class="chip-filtro ${i === diaAtual ? "ativo" : ""}" data-dia="${i}">${escapeHtml(d.rotulo)}</button>`).join("")}
          </div>
          <a class="btn btn-secundario" id="linkAbrirGuia" href="${attrEsc(DIAS[diaAtual].url)}" target="_blank" rel="noopener">Abrir em nova aba</a>
        </div>
        <iframe id="iframeGuia" src="${attrEsc(DIAS[diaAtual].url)}" title="Guia da Imersão" style="width:100%; height:75vh; border:0; display:block;"></iframe>
        <p class="vazio-explicativo" style="padding:10px 16px;">Se a página não aparecer aqui dentro, use o botão "Abrir em nova aba" acima — alguns sites não deixam ser mostrados dentro de outra página.</p>
      </div>
    `;

    $("chipsDiasGuia").querySelectorAll(".chip-filtro").forEach((chip) => {
      chip.addEventListener("click", () => {
        diaAtual = Number(chip.dataset.dia);
        $("chipsDiasGuia").querySelectorAll(".chip-filtro").forEach((c) => c.classList.remove("ativo"));
        chip.classList.add("ativo");
        $("iframeGuia").src = DIAS[diaAtual].url;
        $("linkAbrirGuia").href = DIAS[diaAtual].url;
      });
    });
  }

  return { render };
})();
