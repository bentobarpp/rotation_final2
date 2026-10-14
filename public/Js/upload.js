document.addEventListener("DOMContentLoaded", () => {
  const usuario = window.barppGetUser ? window.barppGetUser() : null;
  const isAdmin = usuario && usuario.isAdmin && localStorage.getItem("token");
  if (!isAdmin) {
    document.getElementById("restrictedNote").hidden = false;
    document.getElementById("uploadForm").hidden = true;
  }
});

const MAX_IMAGENS = 5;
const shoeMainImageInput = document.getElementById("shoeMainImage");
const imgPreview = document.getElementById("imgPreview");
let shoeImagens = [];

function renderPreview() {
  imgPreview.innerHTML = "";
  shoeImagens.forEach((dataUrl, index) => {
    const item = document.createElement("div");
    item.className = "upload-img-item";
    item.innerHTML = `
      <img src="${dataUrl}" alt="Foto ${index + 1}">
      <button type="button" class="upload-img-remove" aria-label="Remover foto ${index + 1}">&times;</button>
    `;
    item.querySelector(".upload-img-remove").addEventListener("click", () => {
      shoeImagens.splice(index, 1);
      renderPreview();
    });
    imgPreview.appendChild(item);
  });
}

function lerImagemValida(file) {
  return new Promise((resolve) => {
    if (!file.type.startsWith("image/")) return resolve(null);
    const reader = new FileReader();
    reader.onload = async (e) => {
      const dataUrl = e.target.result;
      const ok = await testarImagem(dataUrl);
      resolve(ok ? dataUrl : null);
    };
    reader.onerror = () => resolve(null);
    reader.readAsDataURL(file);
  });
}

shoeMainImageInput.addEventListener("change", async function () {
  const espacoLivre = MAX_IMAGENS - shoeImagens.length;
  if (espacoLivre <= 0) {
    toast(`Máximo de ${MAX_IMAGENS} fotos por peça.`, "error");
    this.value = "";
    return;
  }
  const files = Array.from(this.files).slice(0, espacoLivre);
  const resultados = await Promise.all(files.map(lerImagemValida));
  const invalidas = resultados.filter((r) => r === null).length;
  if (invalidas > 0) {
    toast(`${invalidas} arquivo(s) não é/são imagens compatíveis (formatos RAW como .DNG não são suportados). Envie JPG, PNG ou WEBP.`, "error");
  }
  shoeImagens = shoeImagens.concat(resultados.filter(Boolean));
  this.value = "";
  renderPreview();
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

  if (!shoeName || !shoePrice || !shoeSize || !shoeDescription || shoeImagens.length === 0) {
    toast("Preencha todos os campos obrigatórios, incluindo ao menos uma foto válida.", "error");
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
    imagens: shoeImagens,
  };

  apiFetch("/api/produtos", { method: "POST", body: JSON.stringify(shoeData) })
    .then((data) => {
      if (data.success) {
        toast("Peça adicionada com sucesso!", "success");
        document.getElementById("uploadForm").reset();
        shoeImagens = [];
        renderPreview();
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
