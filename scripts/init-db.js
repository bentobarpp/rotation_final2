require("dotenv").config({ path: ".env.local" });
const fs = require("fs");
const path = require("path");
const pool = require("../db");

const SITE_PRODUCTS = [
  { nome: "New Balance 9060", preco: 1200, imagem_url: "/Galery/nb.png", tamanho: "42", descricao: "Tênis New Balance 9060, modelo clássico e confortável." },
  { nome: "Vans Knu School", preco: 600, imagem_url: "/Galery/knu.png", tamanho: "40", descricao: "Tênis Vans Knu School, estilo e qualidade." },
  { nome: "Jordan 1", preco: 3500, imagem_url: "/Galery/j1.webp", tamanho: "44", descricao: "Jordan 1, um clássico dos tênis de basquete." },
  { nome: "Adidas Samba", preco: 800, imagem_url: "/Galery/samba.png", tamanho: "39", descricao: "Adidas Samba, estilo e conforto para o dia a dia." },
  { nome: "Yeezy 350", preco: 1500, imagem_url: "/Galery/yeezy350.png", tamanho: "41", descricao: "Yeezy 350, design minimalista e alto conforto." },
  { nome: "Jordan 4", preco: 2800, imagem_url: "/Galery/jordan4.png", tamanho: "43", descricao: "Jordan 4, ícone do basquete e da moda streetwear." },
  { nome: "Adidas Foam Runner", preco: 900, imagem_url: "/Galery/foam runner.webp", tamanho: "40", descricao: "Adidas Foam Runner, leveza e estilo futurista." },
  { nome: "Air Force 1", preco: 700, imagem_url: "/Galery/af1.webp", tamanho: "42", descricao: "Air Force 1, o clássico atemporal da Nike." },
];

const COUPONS = [
  { codigo: "OFF10", desconto: 0.10 },
  { codigo: "ROTATION15", desconto: 0.15 },
  { codigo: "WELCOME5", desconto: 0.05 },
];

async function main() {
  const schema = fs.readFileSync(path.join(__dirname, "..", "schema.sql"), "utf8");
  await pool.query(schema);
  console.log("Tabelas criadas/verificadas.");

  const { rows: produtosExistentes } = await pool.query(
    "SELECT id FROM produtos WHERE usuario_id IS NULL LIMIT 1"
  );
  if (produtosExistentes.length === 0) {
    for (const p of SITE_PRODUCTS) {
      await pool.query(
        "INSERT INTO produtos (nome, preco, imagem_url, tamanho, descricao, usuario_id) VALUES ($1,$2,$3,$4,$5,NULL)",
        [p.nome, p.preco, p.imagem_url, p.tamanho, p.descricao]
      );
    }
    console.log(`Seed: ${SITE_PRODUCTS.length} produtos do site inseridos.`);
  } else {
    console.log("Produtos do site já existem, seed pulado.");
  }

  for (const c of COUPONS) {
    await pool.query(
      "INSERT INTO cupons (codigo, desconto) VALUES ($1,$2) ON CONFLICT (codigo) DO NOTHING",
      [c.codigo, c.desconto]
    );
  }
  console.log("Seed de cupons verificado.");

  await pool.end();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
