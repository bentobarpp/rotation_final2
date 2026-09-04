// Protege a página se não estiver logado
const user = JSON.parse(localStorage.getItem("usuarioLogado"));
if (!user) {
  window.location.href = "/index.html";
}

function validarSenha(senha) {
  if (senha.length < 6) return "A senha precisa ter no mínimo 6 caracteres.";
  if (!/[^A-Za-z0-9]/.test(senha)) return "A senha precisa ter pelo menos um caractere especial (ex: ! @ # $ % *).";
  return null;
}

function mostrarAvatar(foto, nome) {
  const el = document.getElementById("fotoPerfilAvatar");
  if (foto) {
    el.innerHTML = `<img src="${foto}" alt="Foto de perfil">`;
  } else {
    el.textContent = (nome || "?").trim().charAt(0).toUpperCase();
  }
}

document.addEventListener("DOMContentLoaded", () => {
  // Preenche o formulário com dados do usuário
  document.getElementById("nome").value = user.nome || "";
  document.getElementById("email").value = user.email || "";
  mostrarAvatar(user.foto, user.nome);

  let fotoAtual = user.foto || null;
  let novaFotoBase64 = null;

  fetch("/api/me", {
    headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
  })
    .then((res) => res.json())
    .then((data) => {
      if (data.success) {
        document.getElementById("nome").value = data.user.nome || "";
        document.getElementById("email").value = data.user.email || "";
        fotoAtual = data.user.foto || null;
        mostrarAvatar(fotoAtual, data.user.nome);
      }
    })
    .catch(() => {});

  document.getElementById("fotoPerfil").addEventListener("change", function () {
    const file = this.files[0];
    if (!file || !file.type.startsWith("image/")) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      novaFotoBase64 = e.target.result;
      mostrarAvatar(novaFotoBase64, null);
    };
    reader.readAsDataURL(file);
  });

  document.querySelector("form").addEventListener("submit", function (e) {
    e.preventDefault();

    const nome = document.getElementById("nome").value;
    const email = document.getElementById("email").value;
    const senha = document.getElementById("senha").value;
    const confirma = document.getElementById("confirma-senha").value;

    if (senha && senha !== confirma) {
      toast("Senhas não conferem!", "error");
      return;
    }
    if (senha) {
      const erroSenha = validarSenha(senha);
      if (erroSenha) {
        toast(erroSenha, "error");
        return;
      }
    }

    const foto = novaFotoBase64 !== null ? novaFotoBase64 : fotoAtual;

    fetch("/api/update-user", {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${localStorage.getItem("token")}`,
      },
      body: JSON.stringify({
        id: user.id,
        nome,
        email,
        senha: senha || undefined,
        foto,
      }),
    })
      .then((res) => res.json())
      .then((data) => {
        toast(data.message, data.success ? "success" : "error");
        if (data.success) {
          localStorage.setItem("usuarioLogado", JSON.stringify({ id: user.id, nome, email, foto: data.foto || null }));
          const navAvatar = document.getElementById("navAvatar");
          if (navAvatar) {
            if (data.foto) {
              navAvatar.innerHTML = `<img src="${data.foto}" alt="Foto de perfil">`;
            } else {
              navAvatar.textContent = (nome || "?").trim().charAt(0).toUpperCase();
            }
          }
        }
      })
      .catch(() => toast("Erro ao atualizar!", "error"));
  });

  // Botão de deletar conta
  const deleteBtn = document.createElement("button");
  deleteBtn.textContent = "Excluir Conta";
  deleteBtn.type = "button";
  deleteBtn.className = "btn-excluir";
  document.querySelector("form").appendChild(deleteBtn);

  deleteBtn.addEventListener("click", () => {
    if (confirm("Tem certeza que deseja excluir sua conta? Essa ação não pode ser desfeita.")) {
      fetch(`/api/delete-user/${user.id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
      })
        .then((res) => res.json())
        .then((data) => {
          toast(data.message, data.success ? "success" : "error");
          localStorage.removeItem("usuarioLogado");
          localStorage.removeItem("token");
          setTimeout(() => window.location.href = "/index.html", 900);
        })
        .catch(() => toast("Erro ao deletar a conta.", "error"));
    }
  });
});
