const form = document.getElementById("sneakerForm"),
  list = document.getElementById("sneaker-list"),
  imgInput = document.getElementById("shoeImgs"),
  imgPreview = document.getElementById("imgPreview");

let sneakers = [],
  activeChat = null;

const usuario = window.barppGetUser ? window.barppGetUser() : null;

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

imgInput.addEventListener("change", async function () {
  imgPreview.innerHTML = "";
  const files = Array.from(this.files).slice(0, 3);
  const resultados = await Promise.all(files.map(lerImagemValida));
  const invalidas = resultados.filter((r) => r === null).length;
  if (invalidas > 0) {
    toast(`${invalidas} arquivo(s) não é/são imagens compatíveis (formatos RAW como .DNG não são suportados). Envie JPG, PNG ou WEBP.`, "error");
  }
  resultados.filter(Boolean).forEach((dataUrl) => {
    const imgEl = document.createElement("img");
    imgEl.src = dataUrl;
    imgPreview.appendChild(imgEl);
  });
});

async function getBase64Images(files, cb) {
  const valid = Array.from(files).slice(0, 3);
  const resultados = await Promise.all(valid.map(lerImagemValida));
  cb(resultados.filter(Boolean));
}

function createCard(sneaker) {
  const card = document.createElement("div");
  card.className = "sneaker-card";
  card.dataset.id = sneaker.id;
  let gal = "";
  (sneaker.imagens || []).forEach((img) => {
    gal += `<img src="${escapeHtml(img)}">`;
  });
  const isOwner = usuario && sneaker.usuarioId === usuario.id;
  card.innerHTML = `
    <div class="card-gallery">${gal}</div>
    <div class="sneaker-name">${escapeHtml(sneaker.nome)}</div>
    <div class="sneaker-desc">${escapeHtml(sneaker.descricao || "")}</div>
    <div class="sneaker-request"><b>Trocar por:</b> ${escapeHtml(sneaker.trocaPor)}</div>
    <div class="buttons-container">
      <button type="button" class="btn proposta-btn" data-action="proposta">Proposta</button>
      <button type="button" class="btn btn-outline chat-btn" data-action="chat">Chat</button>
      ${isOwner ? `<button type="button" class="btn btn-outline vendido-btn" data-action="vendido">Marcar como Vendido</button>` : ""}
    </div>`;
  list.appendChild(card);
  setTimeout(() => card.classList.add("visible"), 100);
}

list.addEventListener("click", (e) => {
  const card = e.target.closest(".sneaker-card");
  if (!card) return;
  const id = Number(card.dataset.id);
  const sneaker = sneakers.find((s) => s.id === id);
  if (!sneaker) return;

  const action = e.target.closest("[data-action]")?.dataset.action;
  if (action === "proposta") {
    window.location.href = `/produto.html?id=${id}`;
  } else if (action === "chat") {
    openChat(id, sneaker.nome);
  } else if (action === "vendido") {
    markAsSold(id, e.target);
  } else if (!action) {
    window.location.href = `/produto.html?id=${id}`;
  }
});

async function carregarTrocas() {
  try {
    const data = await apiFetch("/api/trocas");
    sneakers = data.results || [];
  } catch (err) {
    console.error("Erro ao carregar trocas:", err);
    sneakers = [];
  }
  renderSneakers();
}

function renderSneakers() {
  list.innerHTML = "";
  if (sneakers.length === 0) {
    list.innerHTML = `
      <div class="empty-state">
        <span class="empty-emoji">🔄</span>
        <p>Nenhuma troca anunciada ainda. Seja o primeiro lá em cima!</p>
      </div>`;
    return;
  }
  sneakers.forEach(createCard);
  observeAllCards();
}

form.addEventListener("submit", function (e) {
  e.preventDefault();
  const nome = this.shoeName.value.trim(),
    descricao = this.shoeDesc.value.trim(),
    trocaPor = this.shoeRequest.value.trim(),
    files = this.shoeImgs.files;

  if (!nome || !trocaPor || files.length === 0) {
    toast("Preencha todos os campos obrigatórios!", "error");
    return;
  }
  if (!requireLogin("Você precisa estar logado para anunciar uma troca.")) return;

  getBase64Images(files, async (imagens) => {
    if (imagens.length === 0) {
      toast("Nenhuma das imagens enviadas é compatível (formatos RAW como .DNG não são suportados). Envie JPG, PNG ou WEBP.", "error");
      return;
    }
    try {
      const data = await apiFetch("/api/trocas", {
        method: "POST",
        body: JSON.stringify({ nome, descricao, trocaPor, imagens }),
      });
      if (!data.success) { toast(data.message || "Erro ao criar anúncio.", "error"); return; }
      toast("Anúncio criado com sucesso!", "success");
      await carregarTrocas();
      form.reset();
      imgPreview.innerHTML = "";
    } catch (err) {
      console.error(err);
      toast("Erro ao criar anúncio.", "error");
    }
  });
});

async function openChat(trocaId, sneakerName) {
  activeChat = trocaId;
  document.getElementById("chatTitle").textContent = "Chat - " + sneakerName;
  document.getElementById("chatMessages").innerHTML = "";
  document.getElementById("chatModal").hidden = false;
  document.getElementById("chatModal").classList.add("active");

  if (!localStorage.getItem("token")) {
    addMsgToChat("seller", "Você precisa estar logado para conversar. Faça login e tente novamente.");
    document.getElementById("chatInput").disabled = true;
    document.getElementById("chatSendBtn").disabled = true;
    return;
  }
  document.getElementById("chatInput").disabled = false;
  await loadMessages(trocaId);
  document.getElementById("chatInput").value = "";
  document.getElementById("chatSendBtn").disabled = true;
  document.getElementById("chatInput").focus();
}

function closeChat() {
  document.getElementById("chatModal").classList.remove("active");
  document.getElementById("chatModal").hidden = true;
  activeChat = null;
}

document.getElementById("closeChat").addEventListener("click", closeChat);
document.getElementById("chatModal").addEventListener("click", (e) => {
  if (e.target === document.getElementById("chatModal")) closeChat();
});

async function loadMessages(trocaId) {
  const chatMessages = document.getElementById("chatMessages");
  chatMessages.innerHTML = "";
  try {
    const data = await apiFetch(`/api/trocas/${trocaId}/mensagens`);
    (data.results || []).forEach((m) => addMsgToChat(m.remetente, m.texto));
  } catch (err) {
    console.error(err);
  }
  chatMessages.scrollTop = chatMessages.scrollHeight;
}

function addMsgToChat(sender, text) {
  const msgDiv = document.createElement("div");
  msgDiv.textContent = text;
  msgDiv.className = "msg " + (sender === "user" ? "sent" : "received");
  document.getElementById("chatMessages").appendChild(msgDiv);
  document.getElementById("chatMessages").scrollTop = document.getElementById("chatMessages").scrollHeight;
}

document.getElementById("chatInput").addEventListener("input", () => {
  document.getElementById("chatSendBtn").disabled = document.getElementById("chatInput").value.trim() === "";
});

document.getElementById("chatSendBtn").addEventListener("click", async () => {
  const texto = document.getElementById("chatInput").value.trim();
  if (!activeChat || texto === "") return;
  if (!requireLogin("Você precisa estar logado para enviar mensagens.")) return;
  document.getElementById("chatInput").value = "";
  document.getElementById("chatSendBtn").disabled = true;
  try {
    const data = await apiFetch(`/api/trocas/${activeChat}/mensagens`, {
      method: "POST",
      body: JSON.stringify({ texto }),
    });
    if (!data.success) { toast(data.message || "Erro ao enviar mensagem.", "error"); return; }
    data.mensagens.forEach((m) => addMsgToChat(m.remetente, m.texto));
  } catch (err) {
    console.error(err);
    toast("Erro ao enviar mensagem.", "error");
  }
});

const observer = new IntersectionObserver(
  (entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add("visible");
        observer.unobserve(entry.target);
      }
    });
  },
  { threshold: 0.13 }
);

function observeAllCards() {
  document.querySelectorAll(".sneaker-card").forEach((card) => {
    if (!card.classList.contains("visible")) observer.observe(card);
  });
}

async function markAsSold(id, button) {
  if (!requireLogin("Você precisa estar logado.")) return;
  try {
    const data = await apiFetch(`/api/trocas/${id}/vendido`, { method: "PUT" });
    if (!data.success) { toast(data.message || "Erro ao marcar como vendido.", "error"); return; }
    toast("Marcado como vendido!", "success");
    const card = button.closest(".sneaker-card");
    if (card) card.style.opacity = "0.5";
    button.textContent = "Vendido";
    button.disabled = true;
  } catch (err) {
    console.error(err);
    toast("Erro ao marcar como vendido.", "error");
  }
}

document.getElementById("buscaTroca").addEventListener("input", function () {
  const term = this.value.trim().toLowerCase();
  document.querySelectorAll(".sneaker-card").forEach((card) => {
    const txt = card.innerText.toLowerCase();
    card.style.display = term.length === 0 || txt.includes(term) ? "" : "none";
  });
});

carregarTrocas().then(() => {
  const chatId = new URLSearchParams(window.location.search).get("chat");
  if (chatId) {
    const troca = sneakers.find((s) => String(s.id) === chatId);
    if (troca) openChat(troca.id, troca.nome);
  }
});
