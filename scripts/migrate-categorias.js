// Migração aditiva: adiciona categoria/marca/condicao em produtos que já
// existem em produção (CREATE TABLE IF NOT EXISTS do schema.sql não altera
// tabelas existentes). Não remove nem sobrescreve nenhum dado.
require("dotenv").config({ path: ".env.local" });
const pool = require("../db");

async function columnExists(table, column) {
  const { rows } = await pool.query(
    `SELECT 1 FROM information_schema.columns WHERE table_name = $1 AND column_name = $2`,
    [table, column]
  );
  return rows.length > 0;
}

async function main() {
  if (!(await columnExists("produtos", "categoria"))) {
    await pool.query(`ALTER TABLE produtos ADD COLUMN categoria TEXT NOT NULL DEFAULT 'tenis'`);
    await pool.query(`ALTER TABLE produtos ADD CONSTRAINT produtos_categoria_check CHECK (categoria IN ('tenis','roupas','acessorios'))`);
    console.log("Coluna categoria adicionada.");
  } else {
    console.log("Coluna categoria já existe, pulando.");
  }

  if (!(await columnExists("produtos", "marca"))) {
    await pool.query(`ALTER TABLE produtos ADD COLUMN marca TEXT`);
    console.log("Coluna marca adicionada.");
  } else {
    console.log("Coluna marca já existe, pulando.");
  }

  if (!(await columnExists("produtos", "condicao"))) {
    await pool.query(`ALTER TABLE produtos ADD COLUMN condicao TEXT NOT NULL DEFAULT 'usado'`);
    await pool.query(`ALTER TABLE produtos ADD CONSTRAINT produtos_condicao_check CHECK (condicao IN ('novo','seminovo','usado'))`);
    console.log("Coluna condicao adicionada.");
  } else {
    console.log("Coluna condicao já existe, pulando.");
  }

  // Seed de exemplo: marca/condição variadas para os produtos já cadastrados
  // (usuario_id IS NULL = produtos de demonstração do site).
  const marcasPorNome = {
    "New Balance 9060": ["New Balance", "seminovo"],
    "Vans Knu School": ["Vans", "novo"],
    "Jordan 1": ["Jordan", "usado"],
    "Adidas Samba": ["Adidas", "novo"],
    "Yeezy 350": ["Adidas", "seminovo"],
    "Jordan 4": ["Jordan", "usado"],
    "Adidas Foam Runner": ["Adidas", "seminovo"],
    "Air Force 1": ["Nike", "novo"],
  };
  for (const [nome, [marca, condicao]] of Object.entries(marcasPorNome)) {
    await pool.query(
      `UPDATE produtos SET marca = COALESCE(marca, $1), condicao = $2, categoria = 'tenis'
       WHERE nome = $3 AND usuario_id IS NULL`,
      [marca, condicao, nome]
    );
  }
  console.log("Seed de marca/condição aplicado aos produtos de demonstração.");

  await pool.end();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
