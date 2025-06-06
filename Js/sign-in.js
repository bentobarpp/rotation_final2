document.getElementById("signInForm").addEventListener("submit", function(e) {
    e.preventDefault();
  
    const nome = document.getElementById("nome").value;
    const email = document.getElementById("email").value;
    const senha = document.getElementById("senha").value;
  
    fetch("/sign-in", {
      method: "POST",
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ nome, email, senha })
    })
    .then(res => res.json())
    .then(data => {
      document.getElementById("msg").textContent = data.message;
      this.reset();
    });
  });
  