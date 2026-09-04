function validateForm(event) {
  event.preventDefault();

  const username = document.getElementById("username").value.trim();
  const password = document.getElementById("password").value.trim();

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
        document.getElementById("errorMessage").textContent =
          data.message || "Usuário ou senha inválidos.";
      }
    })
    .catch(() => {
      document.getElementById("errorMessage").textContent =
        "Erro ao conectar com o servidor.";
    });
}

// Faz o form executar validateForm ao enviar
document
  .getElementById("loginForm")
  .addEventListener("submit", validateForm);
