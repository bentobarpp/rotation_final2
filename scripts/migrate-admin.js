// Migração aditiva: adiciona usuarios.is_admin e marca a conta do dono do
// site como admin. A partir daqui só essa conta pode adicionar/remover
// peças do catálogo (ver adminOnly em app.js).
require("dotenv").config({ path: ".env.local" });
const pool = require("../db");

const ADMIN_EMAIL = "bentobarpp@gmail.com";

async function columnExists(table, column) {
  const { rows } = await pool.query(
    `SELECT 1 FROM information_schema.columns WHERE table_name = $1 AND column_name = $2`,
    [table, column]
  );
  return rows.length > 0;
}

async function main() {
  if (!(await columnExists("usuarios", "is_admin"))) {
    await pool.query(`ALTER TABLE usuarios ADD COLUMN is_admin BOOLEAN NOT NULL DEFAULT false`);
    console.log("Coluna is_admin adicionada.");
  } else {
    console.log("Coluna is_admin já existe, pulando.");
  }

  const { rowCount } = await pool.query(
    `UPDATE usuarios SET is_admin = true WHERE lower(email) = lower($1)`,
    [ADMIN_EMAIL]
  );
  console.log(rowCount > 0 ? `Conta ${ADMIN_EMAIL} marcada como admin.` : `Nenhuma conta encontrada com e-mail ${ADMIN_EMAIL}.`);

  await pool.end();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
