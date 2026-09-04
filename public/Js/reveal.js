(function () {
  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add("visible");
          observer.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.12 }
  );

  function observeReveals(root) {
    (root || document).querySelectorAll(".reveal:not(.visible)").forEach((el) => observer.observe(el));
  }

  document.addEventListener("DOMContentLoaded", () => {
    observeReveals();
    // Rede de segurança: se por algum motivo o IntersectionObserver não
    // disparar (aba em segundo plano, navegador atípico, etc.), garante
    // que o conteúdo não fique invisível para sempre.
    setTimeout(() => {
      document.querySelectorAll(".reveal:not(.visible)").forEach((el) => el.classList.add("visible"));
    }, 1200);
  });
  window.observeReveals = observeReveals;
})();
