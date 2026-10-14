const CATEGORY_META = {
  "": { title: "Todas as Peças", sub: "Tênis, roupas e acessórios autenticados pela comunidade barpp." },
  tenis: { title: "Tênis", sub: "Sneakers raros e cobiçados, verificados antes de chegar até você." },
  roupas: { title: "Peças", sub: "Camisas, calças, casacos e tricôs autenticados." },
  acessorios: { title: "Acessórios", sub: "Bonés, bolsas, joias e outros detalhes que fecham o look." },
};

const CONDICAO_LABEL = { novo: "Novo", seminovo: "Seminovo", usado: "Peça Única" };

const params = new URLSearchParams(window.location.search);
const categoria = params.get("categoria") || "";
const buscaInicial = params.get("busca") || "";

let produtos = [];
const usuario = window.barppGetUser ? window.barppGetUser() : null;

const productList = document.getElementById("productList");
const txtBusca = document.getElementById("txtBusca");

function setupCategoryHeader() {
  const meta = CATEGORY_META[categoria] || CATEGORY_META[""];
  document.getElementById("categoryTitle").textContent = meta.title;
  document.getElementById("categorySub").textContent = meta.sub;
  document.title = meta.title + " - barpp";
  if (txtBusca && buscaInicial) txtBusca.value = buscaInicial;
  if (usuario && usuario.isAdmin) document.getElementById("adminAddBtn").hidden = false;
}

async function carregarProdutos() {
  try {
    const qs = categoria ? `?categoria=${encodeURIComponent(categoria)}` : "";
    const data = await apiFetch(`/api/produtos${qs}`);
    produtos = data.success ? data.results : [];
  } catch (err) {
    console.error("Erro ao buscar peças:", err);
    produtos = [];
  }
  popularFiltros(produtos);
  aplicarFiltros();
}

function popularFiltros(lista) {
  const marcas = [...new Set(lista.map((p) => p.marca).filter(Boolean))].sort();
  const tamanhos = [...new Set(lista.map((p) => p.tamanho).filter(Boolean))].sort();

  const fMarca = document.getElementById("fMarca");
  marcas.forEach((m) => {
    const opt = document.createElement("option");
    opt.value = m;
    opt.textContent = m;
    fMarca.appendChild(opt);
  });

  const fTamanho = document.getElementById("fTamanho");
  tamanhos.forEach((t) => {
    const opt = document.createElement("option");
    opt.value = t;
    opt.textContent = t;
    fTamanho.appendChild(opt);
  });
}

function aplicarFiltros() {
  const termo = (txtBusca.value || "").trim().toLowerCase();
  const marca = document.getElementById("fMarca").value;
  const condicao = document.getElementById("fCondicao").value;
  const tamanho = document.getElementById("fTamanho").value;
  const precoMin = parseFloat(document.getElementById("fPrecoMin").value);
  const precoMax = parseFloat(document.getElementById("fPrecoMax").value);
  const ordenar = document.getElementById("fOrdenar").value;

  let resultado = produtos.filter((p) => {
    if (termo && !p.nome.toLowerCase().includes(termo)) return false;
    if (marca && p.marca !== marca) return false;
    if (condicao && (p.condicao || "usado") !== condicao) return false;
    if (tamanho && p.tamanho !== tamanho) return false;
    if (!isNaN(precoMin) && Number(p.preco) < precoMin) return false;
    if (!isNaN(precoMax) && Number(p.preco) > precoMax) return false;
    return true;
  });

  if (ordenar === "menor-preco") resultado.sort((a, b) => Number(a.preco) - Number(b.preco));
  else if (ordenar === "maior-preco") resultado.sort((a, b) => Number(b.preco) - Number(a.preco));
  else if (ordenar === "recentes") resultado.sort((a, b) => new Date(b.criadoEm || 0) - new Date(a.criadoEm || 0));

  renderProducts(resultado);
  document.getElementById("categoryCount").textContent =
    resultado.length + (resultado.length === 1 ? " peça disponível" : " peças disponíveis");
}

function renderProducts(lista) {
  productList.innerHTML = "";

  if (lista.length === 0) {
    const adminHint = usuario && usuario.isAdmin ? ` <a href="/upload.html">Adicionar peça</a>.` : "";
    productList.innerHTML = `
      <div class="empty-state">
        <p>Nenhuma peça encontrada.${adminHint}</p>
      </div>`;
    return;
  }

  const isAdmin = usuario && usuario.isAdmin;

  lista.forEach((prod) => {
    const tag = CONDICAO_LABEL[prod.condicao] || "Peça Única";
    const card = document.createElement("div");
    card.className = "product-card reveal visible";
    card.innerHTML = `
      <span class="tag">${escapeHtml(tag)}</span>
      <a href="/detalhes.html?id=${encodeURIComponent(prod.id)}" class="thumb">
        <img src="${escapeHtml(prod.imagemUrl)}" alt="${escapeHtml(prod.nome)}" loading="lazy">
      </a>
      <div class="info">
        <a href="/detalhes.html?id=${encodeURIComponent(prod.id)}" style="text-decoration:none;color:inherit;">
          <p class="name">${escapeHtml(prod.nome)}</p>
        </a>
        <p class="meta">${escapeHtml(prod.marca || "")}${prod.marca && prod.tamanho ? " · " : ""}${prod.tamanho ? "Tam. " + escapeHtml(prod.tamanho) : ""}</p>
        <p class="price">${formatPreco(prod.preco)}</p>
        <div class="card-actions">
          <a href="/detalhes.html?id=${encodeURIComponent(prod.id)}" class="btn btn-outline" style="flex:1;">Ver</a>
        </div>
        ${isAdmin ? `
          <div class="card-actions">
            <button type="button" class="btn mark-sold" data-id="${prod.id}" style="flex:1;">Vendido</button>
            <button type="button" class="btn btn-danger remove-produto" data-id="${prod.id}" style="flex:1;">Remover</button>
          </div>` : ""}
      </div>`;
    productList.appendChild(card);
  });

  productList.querySelectorAll(".mark-sold").forEach((button) => {
    button.addEventListener("click", function () {
      if (confirm("Você tem certeza que deseja marcar este item como vendido?")) {
        marcarVendido(this.getAttribute("data-id"));
      }
    });
  });

  productList.querySelectorAll(".remove-produto").forEach((button) => {
    button.addEventListener("click", function () {
      if (confirm("Remover esta peça permanentemente do site?")) {
        removerProduto(this.getAttribute("data-id"));
      }
    });
  });
}

async function marcarVendido(id) {
  const data = await apiFetch(`/api/produtos/${id}/vendido`, { method: "PUT" });
  if (data.success) {
    toast("Produto marcado como vendido!", "success");
    carregarProdutos();
  } else {
    toast(data.message || "Erro ao marcar como vendido.", "error");
  }
}

async function removerProduto(id) {
  const data = await apiFetch(`/api/produtos/${id}`, { method: "DELETE" });
  if (data.success) {
    toast("Peça removida.", "success");
    carregarProdutos();
  } else {
    toast(data.message || "Erro ao remover peça.", "error");
  }
}

["fMarca", "fCondicao", "fTamanho", "fPrecoMin", "fPrecoMax", "fOrdenar"].forEach((id) => {
  document.getElementById(id).addEventListener("change", aplicarFiltros);
});
document.getElementById("filterForm").addEventListener("submit", (e) => e.preventDefault());
txtBusca.addEventListener("input", aplicarFiltros);

setupCategoryHeader();
carregarProdutos();
