const CONDICAO_LABEL = { novo: "Novo", seminovo: "Seminovo", usado: "Usado" };
const CATEGORIA_LABEL = { tenis: "Tênis", roupas: "Peça de roupa", acessorios: "Acessório" };

function getQueryParam(param) {
  return new URLSearchParams(window.location.search).get(param);
}

const productId = getQueryParam("id");
const usuario = window.barppGetUser ? window.barppGetUser() : null;

function displayProduct(product) {
  const container = document.getElementById("productDetails");
  const images = product.images;
  const hasMultipleImages = images.length > 1;
  const condicaoLabel = CONDICAO_LABEL[product.condicao] || "Usado";

  container.innerHTML = `
    <div class="pdp${hasMultipleImages ? " has-thumbs" : ""}">
      ${hasMultipleImages ? `
      <div class="pdp-thumbs" id="pdpThumbs">
        ${images.map((img, i) => `<img src="${escapeHtml(img)}" data-index="${i}" alt="Miniatura ${i + 1}" class="${i === 0 ? "selected" : ""}">`).join("")}
      </div>` : ""}
      <div class="pdp-main">
        <img id="pdpMainImage" src="${escapeHtml(images[0])}" alt="${escapeHtml(product.name)}">
        ${hasMultipleImages ? `
          <button type="button" class="pdp-nav pdp-prev" id="pdpPrev" aria-label="Imagem anterior">&laquo;</button>
          <button type="button" class="pdp-nav pdp-next" id="pdpNext" aria-label="Próxima imagem">&raquo;</button>
          <span class="pdp-counter" id="pdpCounter">1 / ${images.length}</span>
        ` : ""}
      </div>
      <div class="pdp-info">
        ${product.marca ? `<p class="pdp-brand">${escapeHtml(product.marca)}</p>` : ""}
        <h1 class="pdp-title">${escapeHtml(product.name)}</h1>
        <p class="pdp-price">${formatPreco(product.price)}</p>
        <div class="pdp-size-row"><b>Tamanho</b> ${escapeHtml(product.size)}</div>
        <div class="pdp-tags">
          <span class="filled">Peça Única</span>
          <span>${escapeHtml(condicaoLabel)}</span>
        </div>
        <div class="pdp-cta">
          <a class="btn" id="btnInstagram" target="_blank" rel="noopener">Tenho interesse — chamar no Instagram</a>
          <p class="pdp-cta-hint">Mencione o nome da peça na conversa.</p>
        </div>
        ${usuario && usuario.isAdmin ? `
          <div class="pdp-admin-actions">
            <button type="button" class="btn btn-outline" id="btnMarcarVendido">Marcar vendido</button>
            <button type="button" class="btn btn-danger" id="btnRemover">Remover peça</button>
          </div>` : ""}
        <div class="pdp-details">
          <h2>Detalhes da peça</h2>
          <p>${escapeHtml(product.description)}</p>
          <div class="pdp-specs">
            ${product.marca ? `<div><span>Marca</span><b>${escapeHtml(product.marca)}</b></div>` : ""}
            <div><span>Categoria</span><b>${escapeHtml(CATEGORIA_LABEL[product.categoria] || "Peça")}</b></div>
            <div><span>Tamanho</span><b>${escapeHtml(product.size)}</b></div>
            <div><span>Condição</span><b>${escapeHtml(condicaoLabel)}</b></div>
          </div>
        </div>
        <div id="message" role="alert" aria-live="polite"></div>
      </div>
    </div>
  `;

  document.getElementById("btnInstagram").href = instagramDmLink();

  if (hasMultipleImages) {
    let currentIndex = 0;
    const mainImage = document.getElementById("pdpMainImage");
    const thumbs = document.querySelectorAll("#pdpThumbs img");
    const counter = document.getElementById("pdpCounter");

    function update(i) {
      if (i < 0) i = images.length - 1;
      if (i >= images.length) i = 0;
      currentIndex = i;
      mainImage.src = images[i];
      counter.textContent = `${i + 1} / ${images.length}`;
      thumbs.forEach((t) => t.classList.remove("selected"));
      if (thumbs[i]) thumbs[i].classList.add("selected");
    }

    document.getElementById("pdpPrev").addEventListener("click", () => update(currentIndex - 1));
    document.getElementById("pdpNext").addEventListener("click", () => update(currentIndex + 1));
    thumbs.forEach((t) => t.addEventListener("click", () => update(parseInt(t.dataset.index, 10))));
  }

  if (usuario && usuario.isAdmin) {
    document.getElementById("btnMarcarVendido").addEventListener("click", async () => {
      if (!confirm("Marcar esta peça como vendida?")) return;
      const data = await apiFetch(`/api/produtos/${productId}/vendido`, { method: "PUT" });
      const msg = document.getElementById("message");
      if (data.success) {
        toast("Marcado como vendido!", "success");
        msg.textContent = "Esta peça já está marcada como vendida.";
      } else {
        toast(data.message || "Erro ao marcar como vendido.", "error");
      }
    });
    document.getElementById("btnRemover").addEventListener("click", async () => {
      if (!confirm("Remover esta peça permanentemente do site?")) return;
      const data = await apiFetch(`/api/produtos/${productId}`, { method: "DELETE" });
      if (data.success) {
        toast("Peça removida.", "success");
        setTimeout(() => (window.location.href = "/shop.html"), 800);
      } else {
        toast(data.message || "Erro ao remover peça.", "error");
      }
    });
  }
}

async function carregarProduto() {
  const notFound = '<div class="empty-state"><p>Produto não encontrado. <a href="/shop.html">Voltar para as Peças</a></p></div>';
  if (!productId) {
    document.getElementById("productDetails").innerHTML = notFound;
    return;
  }
  try {
    const data = await apiFetch(`/api/produtos/${encodeURIComponent(productId)}`);
    if (!data.success) {
      document.getElementById("productDetails").innerHTML = notFound;
      return;
    }
    const p = data.produto;
    displayProduct({
      name: p.nome,
      images: [p.imagemUrl],
      price: parseFloat(p.preco) || 0,
      size: p.tamanho || "N/D",
      description: p.descricao || "Sem descrição disponível.",
      categoria: p.categoria,
      marca: p.marca,
      condicao: p.condicao,
    });
  } catch (err) {
    console.error(err);
    document.getElementById("productDetails").innerHTML = notFound;
  }
}

carregarProduto();
