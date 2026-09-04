function validateForm(event) {
  event.preventDefault();

  const username = document.getElementById("username").value.trim();
  const password = document.getElementById("password").value.trim();
  const btn = document.getElementById("loginBtn");
  const errorEl = document.getElementById("errorMessage");

  errorEl.classList.remove("success");
  errorEl.classList.add("error");
  errorEl.textContent = "";
  btn.disabled = true;
  btn.textContent = "Entrando...";

  fetch("/api/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, password }),
  })
    .then(async (res) => {
      const data = await res.json();
      if (res.ok && data.success) {
        localStorage.setItem("token", data.token);
        localStorage.setItem(
          "usuarioLogado",
          JSON.stringify({
            id: data.user.id,
            nome: data.user.nome,
          })
        );
        window.location.href = "/home.html";
      } else {
        errorEl.textContent = data.message || "Usuário ou senha inválidos.";
        btn.disabled = false;
        btn.textContent = "Entrar";
      }
    })
    .catch(() => {
      errorEl.textContent = "Erro ao conectar com o servidor.";
      btn.disabled = false;
      btn.textContent = "Entrar";
    });
}

// Faz o form executar validateForm ao enviar
document
  .getElementById("loginForm")
  .addEventListener("submit", validateForm);
