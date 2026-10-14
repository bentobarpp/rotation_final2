document.addEventListener("DOMContentLoaded", () => {
  const usuario = window.barppGetUser ? window.barppGetUser() : null;
  const isAdmin = usuario && usuario.isAdmin && localStorage.getItem("token");
  if (!isAdmin) {
    document.getElementById("restrictedNote").hidden = false;
    document.getElementById("uploadForm").hidden = true;
  }
});

const shoeMainImageInput = document.getElementById("shoeMainImage");
const imgPreview = document.getElementById("imgPreview");
let shoeImageBase64 = null;

shoeMainImageInput.addEventListener("change", function () {
  imgPreview.innerHTML = "";
  shoeImageBase64 = null;
  const file = this.files[0];
  if (!file) return;
  if (!file.type.startsWith("image/")) {
    toast("Esse arquivo não é uma imagem compatível. Envie uma foto em JPG, PNG ou WEBP.", "error");
    this.value = "";
    return;
  }
  const reader = new FileReader();
  reader.onload = async (e) => {
    const dataUrl = e.target.result;
    const ok = await testarImagem(dataUrl);
    if (!ok) {
      toast("Não foi possível ler essa imagem (formatos RAW como .DNG não são suportados). Envie uma foto em JPG, PNG ou WEBP.", "error");
      shoeMainImageInput.value = "";
      return;
    }
    shoeImageBase64 = dataUrl;
    const img = document.createElement("img");
    img.src = dataUrl;
    imgPreview.appendChild(img);
  };
  reader.readAsDataURL(file);
});

document.getElementById("uploadForm").addEventListener("submit", function (event) {
  event.preventDefault();

  const submitBtn = event.target.querySelector('button[type="submit"]');
  const shoeName = document.getElementById("shoeName").value.trim();
  const shoeCategoria = document.getElementById("shoeCategoria").value;
  const shoeCondicao = document.getElementById("shoeCondicao").value;
  const shoeMarca = document.getElementById("shoeMarca").value.trim();
  const shoePrice = parseFloat(document.getElementById("shoePrice").value) || 0;
  const shoeSize = document.getElementById("shoeSize").value.trim();
  const shoeDescription = document.getElementById("shoeDescription").value.trim();

  if (!shoeName || !shoePrice || !shoeSize || !shoeDescription || !shoeImageBase64) {
    toast("Preencha todos os campos obrigatórios, incluindo uma foto válida.", "error");
    return;
  }

  if (!requireLogin("Você precisa estar logado para vender uma peça. Redirecionando...")) return;

  submitBtn.disabled = true;
  submitBtn.textContent = "Enviando...";

  const shoeData = {
    nome: shoeName,
    categoria: shoeCategoria,
    condicao: shoeCondicao,
    marca: shoeMarca || null,
    preco: shoePrice,
    tamanho: shoeSize,
    descricao: shoeDescription,
    imagemUrl: shoeImageBase64,
  };

  apiFetch("/api/produtos", { method: "POST", body: JSON.stringify(shoeData) })
    .then((data) => {
      if (data.success) {
        toast("Peça adicionada com sucesso!", "success");
        document.getElementById("uploadForm").reset();
        imgPreview.innerHTML = "";
        shoeImageBase64 = null;
        setTimeout(() => (window.location.href = "/shop.html"), 900);
      } else {
        toast(data.message || "Erro ao enviar a peça.", "error");
        submitBtn.disabled = false;
        submitBtn.textContent = "Adicionar Peça";
      }
    })
    .catch((error) => {
      console.error("Erro ao enviar a peça:", error);
      toast("Erro ao enviar a peça: " + error.message, "error");
      submitBtn.disabled = false;
      submitBtn.textContent = "Adicionar Peça";
    });
});
