// Faz a busca do menu funcionar em qualquer página: Enter leva para a Shop já filtrada.
document.addEventListener("DOMContentLoaded", () => {
  const input = document.getElementById("txtBusca");
  if (!input) return;
  input.addEventListener("keydown", (e) => {
    if (e.key === "Enter" && input.value.trim()) {
      window.location.href = `/shop.html?busca=${encodeURIComponent(input.value.trim())}`;
    }
  });
});
