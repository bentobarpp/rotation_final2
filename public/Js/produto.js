function getQueryParam(param) {
  return new URLSearchParams(window.location.search).get(param);
}

async function init() {
  const id = getQueryParam("id");
  const container = document.getElementById("product-container");
  const notFound = '<div class="empty-state"><span class="empty-emoji">🚫</span><p>Produto não encontrado. <a href="/trocas.html">Voltar para Trocas</a></p></div>';
  if (!id) {
    container.innerHTML = notFound;
    return;
  }
  try {
    const data = await apiFetch(`/api/trocas/${encodeURIComponent(id)}`);
    if (!data.success) {
      container.innerHTML = notFound;
      return;
    }
    const product = data.troca;
    const gallery = (product.imagens || [])
      .map((img) => `<img src="${escapeHtml(img)}" alt="${escapeHtml(product.nome)}">`)
      .join("");
    container.innerHTML = `
      <div class="product-gallery">${gallery}</div>
      <div class="product-details">
        <h1 class="product-name">${escapeHtml(product.nome)}</h1>
        <p class="description">${escapeHtml(product.descricao || "Sem descrição disponível.")}</p>
        <p class="request"><strong>Trocar por:</strong> ${escapeHtml(product.trocaPor)}</p>
      </div>
      <div class="buttons-container">
        <button class="btn" id="btnChat">Conversar / Fazer Proposta</button>
        <button class="btn btn-outline" id="btnVoltar">Voltar</button>
      </div>
    `;
    document.getElementById("btnChat").addEventListener("click", () => {
      window.location.href = `/trocas.html?chat=${encodeURIComponent(product.id)}`;
    });
    document.getElementById("btnVoltar").addEventListener("click", () => window.history.back());
  } catch (err) {
    console.error(err);
    container.innerHTML = notFound;
  }
}

document.addEventListener("DOMContentLoaded", init);
