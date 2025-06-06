// Protege a página se não estiver logado
const user = JSON.parse(localStorage.getItem("usuarioLogado"));
if (!user) {
  window.location.href = "/index.html";
}

document.addEventListener("DOMContentLoaded", () => {
  // Preenche o formulário com dados do usuário
  document.getElementById("nome").value = user.nome || "";
  document.getElementById("email").value = user.email || "";

  document.querySelector("form").addEventListener("submit", function (e) {
    e.preventDefault();

    const nome = document.getElementById("nome").value;
    const email = document.getElementById("email").value;
    const senha = document.getElementById("senha").value;
    const confirma = document.getElementById("confirma-senha").value;

    if (senha && senha !== confirma) {
      alert("Senhas não conferem!");
      return;
    }

    fetch("/update-user", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        id: user.id,
        nome,
        email,
        senha: senha || user.senha,
      }),
    })
      .then((res) => res.json())
      .then((data) => {
        alert(data.message);

        // Atualiza o localStorage
        localStorage.setItem(
          "usuarioLogado",
          JSON.stringify({ id: user.id, nome, email, senha: senha || user.senha })
        );
      })
      .catch(() => alert("Erro ao atualizar!"));
  });

  // Botão de deletar conta
  const deleteBtn = document.createElement("button");
  deleteBtn.textContent = "DELETAR CONTA";
  deleteBtn.type = "button";
  deleteBtn.style.marginTop = "15px";
  document.querySelector("form").appendChild(deleteBtn);

  deleteBtn.addEventListener("click", () => {
    if (confirm("Tem certeza que deseja excluir sua conta? Essa ação não pode ser desfeita.")) {
      fetch(`/delete-user/${user.id}`, {
        method: "DELETE",
      })
        .then((res) => res.json())
        .then((data) => {
          alert(data.message);
          localStorage.removeItem("usuarioLogado");
          window.location.href = "/index.html";
        })
        .catch(() => alert("Erro ao deletar a conta."));
    }
  });
});
