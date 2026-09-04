// Confirma que um data URL realmente decodifica como imagem no navegador.
// Formatos RAW (.DNG, .CR2, .NEF, etc.) passam pelo <input accept> em alguns
// sistemas mas não têm decoder nativo no navegador — isso pega esse caso.
function testarImagem(dataUrl) {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => resolve(true);
    img.onerror = () => resolve(false);
    img.src = dataUrl;
  });
}
