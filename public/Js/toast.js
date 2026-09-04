function toast(message, type) {
  let stack = document.getElementById("toast-stack");
  if (!stack) {
    stack = document.createElement("div");
    stack.id = "toast-stack";
    document.body.appendChild(stack);
  }

  const el = document.createElement("div");
  el.className = "toast" + (type ? " toast-" + type : "");
  el.textContent = message;
  stack.appendChild(el);

  setTimeout(() => {
    el.classList.add("toast-out");
    setTimeout(() => el.remove(), 200);
  }, 3800);
}
