// Alterna o canto direito do menu entre "Entrar" (visitante) e avatar/"Sair"
// (logado). É o que permite navegar no site inteiro sem precisar de conta —
// login só é pedido quando uma ação específica (comprar, vender, trocar,
// conversar) realmente precisa dele.
(function () {
  function getUser() {
    try { return JSON.parse(localStorage.getItem("usuarioLogado")); } catch { return null; }
  }

  function logout() {
    localStorage.removeItem("usuarioLogado");
    localStorage.removeItem("token");
    window.location.href = "/login.html";
  }
  window.barppLogout = logout;
  window.barppGetUser = getUser;

  // Destaca a aba do menu correspondente à página/categoria atual, já que o
  // menu é o mesmo HTML repetido em todas as páginas (sem templating).
  function highlightActiveNav() {
    const path = window.location.pathname;
    const categoria = new URLSearchParams(window.location.search).get("categoria");
    document.querySelectorAll(".nav-links a").forEach((a) => {
      a.classList.remove("selected");
      let url;
      try { url = new URL(a.getAttribute("href"), window.location.origin); } catch { return; }
      if (url.pathname !== path) return;
      if (path === "/shop.html") {
        const linkCategoria = url.searchParams.get("categoria");
        if (linkCategoria === categoria) a.classList.add("selected");
      } else {
        a.classList.add("selected");
      }
    });
  }

  document.addEventListener("DOMContentLoaded", () => {
    highlightActiveNav();
    const slot = document.getElementById("navAuth");
    if (!slot) return;
    const user = getUser();
    const token = localStorage.getItem("token");

    if (user && token) {
      if (user.isAdmin) {
        const addLink = document.createElement("a");
        addLink.href = "/upload.html";
        addLink.className = "nav-enter-link";
        addLink.textContent = "+ Peça";
        slot.appendChild(addLink);
      }

      const logoutLink = document.createElement("a");
      logoutLink.href = "#";
      logoutLink.className = "nav-logout";
      logoutLink.textContent = "Sair";
      logoutLink.addEventListener("click", (e) => { e.preventDefault(); logout(); });

      const avatar = document.createElement("a");
      avatar.href = "/perfil.html";
      avatar.className = "nav-avatar";
      avatar.id = "navAvatar";
      avatar.setAttribute("aria-label", "Perfil");
      avatar.title = "Perfil";
      if (user.foto) {
        const img = document.createElement("img");
        img.src = user.foto;
        img.alt = "Foto de perfil";
        avatar.appendChild(img);
      } else {
        avatar.textContent = (user.nome || "?").trim().charAt(0).toUpperCase();
      }

      slot.appendChild(logoutLink);
      slot.appendChild(avatar);
    } else {
      const enter = document.createElement("a");
      enter.href = "/login.html?next=" + encodeURIComponent(window.location.pathname + window.location.search);
      enter.className = "nav-enter-link";
      enter.textContent = "Entrar";
      slot.appendChild(enter);
    }
  });
})();
