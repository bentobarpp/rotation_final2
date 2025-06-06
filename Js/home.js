// Seleciona o contêiner e as imagens
const container = document.querySelector('.container');
const images = Array.from(document.querySelectorAll('.container img'));
const totalImages = images.length;
let currentIndex = 0;
let imageWidth = images[0].clientWidth; // Captura a largura da primeira imagem

// Função para atualizar o carrossel
function updateCarousel() {
    container.style.transform = `translateX(${-currentIndex * imageWidth}px)`; // Aplica a transformação
}

// Função para ir para a próxima imagem
function nextImage() {
    currentIndex = (currentIndex + 1) % totalImages; // Se chegar à última imagem, volta para a primeira
    updateCarousel();
}

// Função para ir para a imagem anterior
function prevImage() {
    currentIndex = (currentIndex - 1 + totalImages) % totalImages; // Se estiver na primeira, volta para a última
    updateCarousel();
}

// Adiciona eventos de clique para os botões "Next" e "Prev"
document.getElementById('next').addEventListener('click', nextImage);
document.getElementById('prev').addEventListener('click', prevImage);

// Carrossel automático com intervalo de 3 segundos
const autoSlideInterval = setInterval(nextImage, 3000);

// Ajusta o carrossel ao redimensionar a janela
window.addEventListener('resize', () => {
    imageWidth = images[0].clientWidth; // Atualiza a largura da imagem
    updateCarousel(); // Recalcula a posição do carrossel
});
