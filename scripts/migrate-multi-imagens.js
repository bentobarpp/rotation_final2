// Migração aditiva: produtos passa a guardar uma GALERIA de fotos (imagens,
// JSONB) em vez de uma imagem só (imagem_url). Migra o que já existe pra
// dentro do array antes de remover a coluna antiga — nenhuma foto se perde.
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
  if (!(await columnExists("produtos", "imagens"))) {
    await pool.query(`ALTER TABLE produtos ADD COLUMN imagens JSONB NOT NULL DEFAULT '[]'`);
    console.log("Coluna imagens adicionada.");
  } else {
    console.log("Coluna imagens já existe, pulando criação.");
  }

  if (await columnExists("produtos", "imagem_url")) {
    const { rowCount } = await pool.query(
      `UPDATE produtos SET imagens = jsonb_build_array(imagem_url)
       WHERE imagem_url IS NOT NULL AND imagens = '[]'::jsonb`
    );
    console.log(`Migradas ${rowCount} peça(s) da foto única pra galeria.`);

    await pool.query(`ALTER TABLE produtos DROP COLUMN imagem_url`);
    console.log("Coluna imagem_url removida.");
  } else {
    console.log("Coluna imagem_url já não existe, nada a migrar.");
  }

  await pool.end();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
