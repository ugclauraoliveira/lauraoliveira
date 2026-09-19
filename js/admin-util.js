/* =========================================================
   ADMIN-UTIL.JS
   Funções pequenas que todas as abas do painel usam:
   ícones de traço, formatação de moeda/data, o modal (janela
   de adicionar/editar), o aviso de "algo faltou no banco" e
   a exportação de CSV com acento certo pro Excel.
========================================================= */

/* ---------- ÍCONES DE TRAÇO (sem emoji) ---------- */
function icone(caminho, tamanho = 18) {
  return `<svg width="${tamanho}" height="${tamanho}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${caminho}</svg>`;
}

const ICONES = {
  portfolio:   (t) => icone('<rect x="3" y="3" width="18" height="14" rx="2"/><path d="M3 14l5-5 4 4 4-5 5 6"/><circle cx="8" cy="8" r="1.3"/>', t),
  marcas:      (t) => icone('<path d="M4 20V9a2 2 0 0 1 2-2h3V5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2h3a2 2 0 0 1 2 2v11"/><path d="M4 20h16"/><path d="M9 9h6"/><path d="M9 13h6"/>', t),
  calendario:  (t) => icone('<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 10h18"/><path d="M8 3v4"/><path d="M16 3v4"/>', t),
  campanhas:   (t) => icone('<path d="M4 4v16"/><path d="M4 4h11l-2 4 2 4H4"/>', t),
  checklist:   (t) => icone('<path d="M9 11l2 2 4-4"/><rect x="3" y="3" width="18" height="18" rx="3"/>', t),
  sair:        (t) => icone('<path d="M9 4H5a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h4"/><path d="M16 17l5-5-5-5"/><path d="M21 12H9"/>', t),
  menu:        (t) => icone('<path d="M3 6h18"/><path d="M3 12h18"/><path d="M3 18h18"/>', t),
  fechar:      (t) => icone('<path d="M6 6l12 12"/><path d="M18 6L6 18"/>', t),
  mais:        (t) => icone('<path d="M12 5v14"/><path d="M5 12h14"/>', t),
  lapis:       (t) => icone('<path d="M4 20l1-4L16 5l3 3L8 19l-4 1z"/>', t),
  lixeira:     (t) => icone('<path d="M4 7h16"/><path d="M9 7V4h6v3"/><path d="M6 7l1 13h10l1-13"/>', t),
  olhoAberto:  (t) => icone('<path d="M2 12s3.5-6 10-6 10 6 10 6-3.5 6-10 6-10-6-10-6z"/><circle cx="12" cy="12" r="2.5"/>', t),
  olhoFechado: (t) => icone('<path d="M3 3l18 18"/><path d="M10.6 5.2A11 11 0 0 1 12 5c6.5 0 10 6 10 6a15 15 0 0 1-3.3 3.6M6.5 7.6C4 9.2 2 12 2 12s3.5 6 10 6c1 0 1.9-.1 2.8-.4"/><path d="M9.5 10a2.5 2.5 0 0 0 3.5 3.5"/>', t),
  alcinha:     (t) => icone('<circle cx="9" cy="6" r="1"/><circle cx="9" cy="12" r="1"/><circle cx="9" cy="18" r="1"/><circle cx="15" cy="6" r="1"/><circle cx="15" cy="12" r="1"/><circle cx="15" cy="18" r="1"/>', t),
  busca:       (t) => icone('<circle cx="11" cy="11" r="7"/><path d="M21 21l-4-4"/>', t),
  baixar:      (t) => icone('<path d="M12 3v12"/><path d="M7 10l5 5 5-5"/><path d="M5 21h14"/>', t),
  whatsapp:    (t) => icone('<path d="M12 3a9 9 0 0 0-7.8 13.5L3 21l4.7-1.2A9 9 0 1 0 12 3z"/><path d="M8.5 9.5c0 3 2.5 5.5 5.5 5.5"/>', t),
  instagram:   (t) => icone('<rect x="3" y="3" width="18" height="18" rx="5"/><circle cx="12" cy="12" r="4"/><circle cx="17" cy="7" r="1"/>', t),
  estrela:     (t) => icone('<path d="M12 3l2.6 5.6 6 .7-4.4 4.1 1.2 6-5.4-3-5.4 3 1.2-6-4.4-4.1 6-.7z"/>', t),
  setaCima:    (t) => icone('<path d="M12 19V5"/><path d="M6 11l6-6 6 6"/>', t),
  setaBaixo:   (t) => icone('<path d="M12 5v14"/><path d="M6 13l6 6 6-6"/>', t),
  ordenar:     (t) => icone('<path d="M8 9l4-4 4 4"/><path d="M8 15l4 4 4-4"/>', t),
  esquerda:    (t) => icone('<path d="M15 5l-7 7 7 7"/>', t),
  direita:     (t) => icone('<path d="M9 5l7 7-7 7"/>', t),
  aviso:       (t) => icone('<path d="M12 3l10 18H2z"/><path d="M12 10v4"/><path d="M12 17.5v.01"/>', t),
  video:       (t) => icone('<rect x="3" y="5" width="14" height="14" rx="2"/><path d="M17 9l4-2v10l-4-2"/>', t),
};

/* ---------- FORMATADORES ---------- */
function formatarMoeda(valor) {
  const n = Number(valor) || 0;
  return n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}
function formatarData(dataISO) {
  if (!dataISO) return "";
  const [ano, mes, dia] = String(dataISO).slice(0, 10).split("-");
  if (!ano || !mes || !dia) return dataISO;
  return `${dia}/${mes}/${ano}`;
}
function dataDeHoje() {
  return new Date().toISOString().slice(0, 10);
}
function diasEntre(dataISO) {
  const hoje = new Date(dataDeHoje() + "T00:00:00");
  const outra = new Date(String(dataISO).slice(0, 10) + "T00:00:00");
  return Math.round((hoje - outra) / 86400000);
}
function escapeHtml(texto) {
  return String(texto ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}

/* ---------- AVISO DE ALGO FALTANDO NO BANCO ---------- */
// Usado quando uma tabela ou coluna esperada pelo painel não existe.
// O painel continua funcionando, só avisa o que faltou.
function avisoFaltando(container, nomeTabela, erro) {
  const caixa = document.createElement("div");
  caixa.className = "aviso-faltando";
  caixa.innerHTML = `
    <span class="aviso-icone">${ICONES.aviso(20)}</span>
    <div>
      <strong>Não consegui carregar "${escapeHtml(nomeTabela)}".</strong>
      <p>Confira se você já rodou o arquivo banco.sql no Supabase. O resto do painel continua funcionando normalmente.</p>
      <p class="aviso-detalhe">Detalhe técnico: ${escapeHtml(erro?.message || erro || "erro desconhecido")}</p>
    </div>`;
  container.prepend(caixa);
}

/* ---------- MODAL (janela de adicionar/editar) ---------- */
function abrirModalAdmin(tituloHtml, corpoHtml) {
  const fundo = document.getElementById("modalAdmin");
  fundo.querySelector(".modal-admin-titulo").innerHTML = tituloHtml;
  fundo.querySelector(".modal-admin-corpo").innerHTML = corpoHtml;
  fundo.classList.add("aberto");
  const primeiroInput = fundo.querySelector("input, textarea, select");
  if (primeiroInput) setTimeout(() => primeiroInput.focus(), 50);
}
function fecharModalAdmin() {
  document.getElementById("modalAdmin").classList.remove("aberto");
}

/* ---------- TOAST (mensagem rápida no canto) ---------- */
function mostrarToast(mensagem, tipo = "sucesso") {
  const area = document.getElementById("toastArea");
  if (!area) return;
  const item = document.createElement("div");
  item.className = `toast toast-${tipo}`;
  item.textContent = mensagem;
  area.appendChild(item);
  setTimeout(() => item.classList.add("saindo"), 2600);
  setTimeout(() => item.remove(), 3000);
}

/* ---------- EXPORTAR CSV (abre certinho no Excel, com acento) ---------- */
function exportarCsv(nomeArquivo, colunas, linhas) {
  const linhaTexto = (valores) => valores.map((v) => `"${String(v ?? "").replace(/"/g, '""')}"`).join(";");
  const conteudo = [linhaTexto(colunas), ...linhas.map(linhaTexto)].join("\r\n");
  const blob = new Blob(["﻿" + conteudo], { type: "text/csv;charset=utf-8;" });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = nomeArquivo;
  document.body.appendChild(link);
  link.click();
  link.remove();
}

/* ---------- ESCAPE PRA USAR EM ATRIBUTOS ---------- */
function attrEsc(texto) {
  return escapeHtml(texto).replace(/`/g, "&#96;");
}
