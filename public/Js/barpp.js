// Utilitários compartilhados por várias páginas.

// Escapa texto vindo de usuários (nome de produto, descrição, mensagens...)
// antes de inserir via innerHTML — evita XSS armazenado.
function escapeHtml(str) {
  return String(str === undefined || str === null ? "" : str).replace(/[&<>"']/g, (c) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
  }[c]));
}

function formatPreco(valor) {
  return "R$ " + Number(valor || 0).toFixed(2).replace(".", ",");
}

// Número da barpp no WhatsApp (DDI+DDD). Todo contato sobre uma peça vai
// direto pra lá — não há checkout/pagamento no site.
const BARPP_WHATSAPP = "5547988567247";

function whatsappLink(mensagem) {
  const base = "https://wa.me/" + BARPP_WHATSAPP;
  return mensagem ? base + "?text=" + encodeURIComponent(mensagem) : base;
}

async function apiFetch(url, options) {
  options = options || {};
  const token = localStorage.getItem("token");
  const headers = Object.assign({ "Content-Type": "application/json" }, options.headers || {});
  if (token) headers["Authorization"] = "Bearer " + token;
  const res = await fetch(url, Object.assign({}, options, { headers }));
  let data;
  try { data = await res.json(); } catch { data = { success: false, message: "Resposta inválida do servidor." }; }
  return data;
}

// Garante login antes de uma ação; se não houver, avisa e manda pro login
// guardando a página atual em ?next= para voltar depois.
function requireLogin(message) {
  if (localStorage.getItem("token")) return true;
  if (typeof toast === "function") toast(message || "Você precisa estar logado para continuar.", "error");
  setTimeout(() => {
    window.location.href = "/login.html?next=" + encodeURIComponent(window.location.pathname + window.location.search);
  }, 1100);
  return false;
}
