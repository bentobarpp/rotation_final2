// Remove as tabelas da antiga função de Trocas (peer-to-peer) e de Cupons
// (do checkout que não existe mais) — ambas descontinuadas. Confirmado antes
// de rodar que trocas/troca_mensagens estavam vazias; cupons tinha só os
// 3 códigos de exemplo do checkout antigo.
require("dotenv").config({ path: ".env.local" });
const pool = require("../db");

async function main() {
  await pool.query("DROP TABLE IF EXISTS troca_mensagens");
  await pool.query("DROP TABLE IF EXISTS trocas");
  await pool.query("DROP TABLE IF EXISTS cupons");
  console.log("Tabelas trocas, troca_mensagens e cupons removidas.");
  await pool.end();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
