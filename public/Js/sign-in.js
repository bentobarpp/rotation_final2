function validarSenha(senha) {
  if (senha.length < 6) return "A senha precisa ter no mínimo 6 caracteres.";
  if (!/[^A-Za-z0-9]/.test(senha)) return "A senha precisa ter pelo menos um caractere especial (ex: ! @ # $ % *).";
  return null;
}

document.getElementById("signInForm").addEventListener("submit", function (e) {
  e.preventDefault();

  const nome = document.getElementById("nome").value.trim();
  const email = document.getElementById("email").value.trim();
  const senha = document.getElementById("senha").value.trim();
  const btn = document.getElementById("signInBtn");
  const msg = document.getElementById("msg");

  msg.classList.remove("success", "error");
  msg.textContent = "";

  const erroSenha = validarSenha(senha);
  if (erroSenha) {
    msg.classList.add("error");
    msg.textContent = erroSenha;
    return;
  }

  btn.disabled = true;
  btn.textContent = "Criando conta...";

  fetch("/api/sign-in", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ nome, email, senha }),
  })
    .then(async (res) => {
      const data = await res.json();
      if (res.ok && data.success) {
        msg.classList.add("success");
        msg.textContent = "Conta criada! Redirecionando para o login...";
        setTimeout(() => {
          window.location.href = "/index.html?cadastro=sucesso";
        }, 900);
      } else {
        msg.classList.add("error");
        msg.textContent = data.message || "Erro ao cadastrar usuário.";
        btn.disabled = false;
        btn.textContent = "Cadastrar";
      }
    })
    .catch(() => {
      msg.classList.add("error");
      msg.textContent = "Erro ao conectar com o servidor.";
      btn.disabled = false;
      btn.textContent = "Cadastrar";
    });
});
