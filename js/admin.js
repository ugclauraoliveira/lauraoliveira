/* =========================================================
   ADMIN.JS
   O maestro do painel: confere se você está logada, monta o
   menu lateral, troca de aba e cuida do botão Sair.
   Este é o ÚLTIMO script carregado, depois de todas as abas.
========================================================= */

const ABAS = {
  portfolio:  { titulo: "Portfólio",  render: () => window.AdminPortfolio.render(document.getElementById("conteudoAba")) },
  marcas:     { titulo: "Marcas",     render: () => window.AdminMarcas.render(document.getElementById("conteudoAba")) },
  calendario: { titulo: "Calendário", render: () => window.AdminCalendario.render(document.getElementById("conteudoAba")) },
  campanhas:  { titulo: "Campanhas",  render: () => window.AdminCampanhas.render(document.getElementById("conteudoAba")) },
  checklist:  { titulo: "Checklist",  render: () => window.AdminChecklist.render(document.getElementById("conteudoAba")) },
  prospeccao: { titulo: "Prospecção", render: () => window.AdminProspeccao.render(document.getElementById("conteudoAba")) },
};

async function iniciarAdmin() {
  // 1) Confere a sessão ANTES de mostrar qualquer coisa.
  const { data } = await window.banco.auth.getSession();
  if (!data.session) {
    window.location.replace("../login/");
    return;
  }

  document.getElementById("emailUsuaria").textContent = data.session.user.email || "";

  // Só agora a página aparece.
  document.body.classList.remove("carregando");

  montarNavegacao();
  irParaAba("portfolio");

  window.banco.auth.onAuthStateChange((_evento, sessao) => {
    if (!sessao) window.location.replace("../login/");
  });
}

function montarNavegacao() {
  document.querySelectorAll(".item-nav").forEach((botao) => {
    botao.addEventListener("click", () => {
      irParaAba(botao.dataset.aba);
      fecharSidebarMobile();
    });
  });

  document.getElementById("botaoSair").addEventListener("click", async () => {
    await window.banco.auth.signOut();
    window.location.replace("../login/");
  });

  const menuToggle = document.getElementById("menuToggleAdmin");
  const fundoMobile = document.getElementById("fundoSidebarMobile");
  menuToggle.addEventListener("click", () => {
    document.getElementById("sidebarPainel").classList.add("aberta");
    fundoMobile.classList.add("aberto");
  });
  fundoMobile.addEventListener("click", fecharSidebarMobile);
}

function fecharSidebarMobile() {
  document.getElementById("sidebarPainel").classList.remove("aberta");
  document.getElementById("fundoSidebarMobile").classList.remove("aberto");
}

function irParaAba(nomeAba) {
  const aba = ABAS[nomeAba];
  if (!aba) return;

  document.querySelectorAll(".item-nav").forEach((b) => b.classList.toggle("ativo", b.dataset.aba === nomeAba));
  document.getElementById("tituloAba").textContent = aba.titulo;
  const container = document.getElementById("conteudoAba");
  container.innerHTML = `<p class="vazio-explicativo">Carregando...</p>`;

  aba.render();
}

document.getElementById("modalAdminFechar").addEventListener("click", fecharModalAdmin);
document.getElementById("modalAdmin").addEventListener("click", (evento) => {
  if (evento.target.id === "modalAdmin") fecharModalAdmin();
});
document.addEventListener("keydown", (evento) => {
  if (evento.key === "Escape") fecharModalAdmin();
});

iniciarAdmin();
