/* =========================================================
   ADMIN.JS
   O maestro do painel: confere se você está logada, monta o
   menu lateral, troca de aba e cuida do botão Sair.
   Este é o ÚLTIMO script carregado, depois de todas as abas.
========================================================= */

// Painel simples usado pelas abas que ainda vão ganhar sua funcionalidade
// de verdade nas próximas etapas (Dashboard, Propostas, Financeiro, Instagram).
function renderEmConstrucao(nomeAba, descricao) {
  document.getElementById("conteudoAba").innerHTML = `
    <div class="cartao">
      <h2>${escapeHtml(nomeAba)}</h2>
      <p class="vazio-explicativo" style="text-align:left; padding:10px 0 0;">${escapeHtml(descricao)}</p>
    </div>`;
}

const ABAS = {
  dashboard:  { titulo: "Dashboard",   render: () => window.AdminDashboard.render(document.getElementById("conteudoAba")) },
  portfolio:  { titulo: "Portfólio",  render: () => window.AdminPortfolio.render(document.getElementById("conteudoAba")) },
  marcas:     { titulo: "Marcas",     render: () => window.AdminMarcas.render(document.getElementById("conteudoAba")) },
  prospeccao: { titulo: "Prospecção", render: () => window.AdminProspeccao.render(document.getElementById("conteudoAba")) },
  calendario: { titulo: "Calendário", render: () => window.AdminCalendario.render(document.getElementById("conteudoAba")) },
  campanhas:  { titulo: "Campanhas",  render: () => window.AdminCampanhas.render(document.getElementById("conteudoAba")) },
  checklist:  { titulo: "Checklist",  render: () => window.AdminChecklist.render(document.getElementById("conteudoAba")) },
  guiaimersao: { titulo: "Guia da Imersão", render: () => window.AdminGuia.render(document.getElementById("conteudoAba")) },
  propostas:  { titulo: "Propostas",  render: () => window.AdminPropostas.render(document.getElementById("conteudoAba")) },
  financeiro: { titulo: "Financeiro", render: () => window.AdminFinanceiro.render(document.getElementById("conteudoAba")) },
  roteiros:   { titulo: "Transcrições", render: () => window.AdminRoteiros.render(document.getElementById("conteudoAba")) },
  instagram:  { titulo: "Instagram",  render: () => window.AdminInstagram.render(document.getElementById("conteudoAba")) },
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
  irParaAba("dashboard");

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
