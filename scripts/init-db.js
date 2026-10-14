// Cria/verifica as tabelas (schema.sql) numa instalação nova. O catálogo
// começa vazio de propósito — só a conta admin adiciona peças, pela tela
// /upload.html.
require("dotenv").config({ path: ".env.local" });
const fs = require("fs");
const path = require("path");
const pool = require("../db");

async function main() {
  const schema = fs.readFileSync(path.join(__dirname, "..", "schema.sql"), "utf8");
  await pool.query(schema);
  console.log("Tabelas criadas/verificadas.");
  await pool.end();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
