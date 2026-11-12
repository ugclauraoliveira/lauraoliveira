/* =========================================================
   ADMIN-GUIA.JS
   Aba "Links": uma lista de links externos (sites de fora do
   painel), cada um com seu próprio botão, abrindo numa aba nova.
   Pra adicionar um link novo, é só incluir mais um item na lista
   LINKS abaixo.
========================================================= */

window.AdminGuia = (function () {

  const LINKS = [
    { rotulo: "Guia da Imersão — Dia 1", url: "https://eilaradam.github.io/guia-imersao/#e1" },
    { rotulo: "Guia da Imersão — Dia 2", url: "https://eilaradam.github.io/guia-imersao/dia2/#e1" },
    { rotulo: "Guia de Abordagem", url: "https://eilaradam.github.io/portfolios-brilhos/abordagem/" },
  ];

  function render(container) {
    container.innerHTML = `
      <div class="cartao">
        <h2>Links</h2>
        <p class="vazio-explicativo" style="text-align:left; padding:0 0 14px;">Conteúdo de fora do painel (de outros sites) — cada botão abre numa aba nova.</p>
        <div style="display:flex; flex-wrap:wrap; gap:10px;">
          ${LINKS.map((l) => `<a class="btn btn-secundario" href="${attrEsc(l.url)}" target="_blank" rel="noopener">${ICONES.enviar(16)} ${escapeHtml(l.rotulo)}</a>`).join("")}
        </div>
      </div>
    `;
  }

  return { render };
})();
