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

// @ da barpp no Instagram. Todo contato sobre uma peça acontece por lá —
// não há checkout/pagamento nem número de telefone expostos no site.
// TODO: trocar pelo @ real assim que o perfil da loja existir.
const BARPP_INSTAGRAM = "barpp.oficial";

function instagramProfileLink() {
  return "https://instagram.com/" + BARPP_INSTAGRAM;
}

// Abre o app/site do Instagram direto na conversa de DM com a loja.
function instagramDmLink() {
  return "https://ig.me/m/" + BARPP_INSTAGRAM;
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
