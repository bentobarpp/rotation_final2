// Mega menu das abas de categoria: ao passar o mouse (ou tocar na seta no
// celular), busca as marcas que existem de verdade no catálogo pra essa
// categoria — nada de lista fixa, atualiza sozinho conforme o admin adiciona
// peças.
(function () {
  const cache = {};

  function render(produtos, dropdown) {
    const marcasCol = dropdown.querySelector(".nav-dropdown-marcas");
    const media = dropdown.querySelector(".nav-dropdown-media img");
    const marcas = [...new Set(produtos.map((p) => p.marca).filter(Boolean))].sort();

    marcasCol.innerHTML = "";
    if (marcas.length === 0) {
      marcasCol.innerHTML = '<span class="nav-dropdown-empty">Em breve</span>';
    } else {
      const categoria = dropdown.dataset.categoria;
      marcas.slice(0, 7).forEach((m) => {
        const a = document.createElement("a");
        a.href = `/shop.html?categoria=${encodeURIComponent(categoria)}&marca=${encodeURIComponent(m)}`;
        a.textContent = m;
        marcasCol.appendChild(a);
      });
    }

    if (media && produtos[0] && produtos[0].imagemUrl) {
      media.src = produtos[0].imagemUrl;
      media.alt = produtos[0].nome || "";
      media.style.display = "block";
    }
  }

  async function load(categoria, dropdown) {
    if (cache[categoria]) {
      render(cache[categoria], dropdown);
      return;
    }
    try {
      const res = await fetch(`/api/produtos?categoria=${encodeURIComponent(categoria)}`);
      const data = await res.json();
      const produtos = data.success ? data.results : [];
      cache[categoria] = produtos;
      render(produtos, dropdown);
    } catch (err) {
      console.error("Erro ao carregar menu de categoria:", err);
      render([], dropdown);
    }
  }

  document.addEventListener("DOMContentLoaded", () => {
    document.querySelectorAll(".nav-dropdown[data-categoria]").forEach((dropdown) => {
      const item = dropdown.closest(".nav-item");
      if (!item) return;
      const categoria = dropdown.dataset.categoria;
      let loaded = false;
      const trigger = () => {
        if (loaded) return;
        loaded = true;
        load(categoria, dropdown);
      };
      item.addEventListener("mouseenter", trigger);
      item.addEventListener("focusin", trigger);

      const caret = item.querySelector(".nav-caret");
      if (caret) {
        caret.addEventListener("click", (e) => {
          e.preventDefault();
          trigger();
          document.querySelectorAll(".nav-item.open").forEach((el) => {
            if (el !== item) el.classList.remove("open");
          });
          item.classList.toggle("open");
        });
      }
    });

    document.addEventListener("click", (e) => {
      document.querySelectorAll(".nav-item.open").forEach((item) => {
        if (!item.contains(e.target)) item.classList.remove("open");
      });
    });
  });
})();
