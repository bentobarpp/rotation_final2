const slide = document.getElementById("carousel-slide");
let allItems = [];

slide.innerHTML = '<div class="carousel-skeleton">' + '<div class="skeleton"></div>'.repeat(4) + "</div>";

async function carregarDestaques() {
  try {
    const data = await apiFetch("/api/produtos");
    allItems = (data.results || []).map((p) => ({ img: p.imagemUrl, title: p.nome, id: p.id }));
  } catch (err) {
    console.error("Erro ao carregar produtos:", err);
    allItems = [];
  }
  renderCarousel();
}

function renderCarousel() {
  if (allItems.length === 0) {
    slide.innerHTML = "";
    document.querySelector(".carousel-container").innerHTML = `
      <div class="empty-state">
        <p>Novidades em breve. <a href="https://instagram.com/barpp.oficial" target="_blank" rel="noopener">Acompanhe no Instagram</a>.</p>
      </div>`;
    return;
  }
  slide.style.setProperty("--num-items", allItems.length);
  const itemsToRender = [...allItems, ...allItems];
  slide.innerHTML = "";
  itemsToRender.forEach((item) => {
    const el = document.createElement("div");
    el.className = "carousel-item";
    el.innerHTML = `
      <a href="/detalhes.html?id=${encodeURIComponent(item.id)}" style="text-decoration:none; color:inherit;">
        <img src="${escapeHtml(item.img)}" alt="${escapeHtml(item.title)}">
        <div class="title">${escapeHtml(item.title)}</div>
      </a>`;
    slide.appendChild(el);
  });
}

carregarDestaques();
