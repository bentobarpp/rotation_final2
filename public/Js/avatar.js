document.addEventListener("DOMContentLoaded", () => {
  const el = document.getElementById("navAvatar");
  if (!el) return;
  try {
    const user = JSON.parse(localStorage.getItem("usuarioLogado"));
    if (!user) return;
    if (user.foto) {
      el.innerHTML = "";
      const img = document.createElement("img");
      img.src = user.foto;
      img.alt = "Foto de perfil";
      el.appendChild(img);
    } else if (user.nome) {
      el.textContent = user.nome.trim().charAt(0).toUpperCase();
    }
  } catch {}
});
