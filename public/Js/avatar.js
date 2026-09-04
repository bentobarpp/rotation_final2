document.addEventListener("DOMContentLoaded", () => {
  const el = document.getElementById("navAvatar");
  if (!el) return;
  try {
    const user = JSON.parse(localStorage.getItem("usuarioLogado"));
    if (user && user.nome) {
      el.textContent = user.nome.trim().charAt(0).toUpperCase();
    }
  } catch {}
});
