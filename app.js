const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const pool = require("./db");

const app = express();
const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
  throw new Error("JWT_SECRET não configurado.");
}

// A maioria das páginas usa <script>/<style> inline, então um CSP restrito
// quebraria o site inteiro sem uma reescrita grande; mantemos os outros
// cabeçalhos de segurança do helmet (HSTS, no-sniff, referrer-policy, etc).
app.use(helmet({ contentSecurityPolicy: false }));

const allowedOrigins = [
  process.env.SITE_URL,
  "https://rotationfinal2.vercel.app",
  "http://localhost:3000",
  "http://localhost:3001",
].filter(Boolean);

app.use(
  cors({
    origin: allowedOrigins,
  })
);

// Limita tentativas de login/cadastro por IP para dificultar força bruta.
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: "Muitas tentativas. Tente novamente em alguns minutos." },
});

app.use(express.json({ limit: "5mb" }));
app.use(express.urlencoded({ extended: true }));

function authMiddleware(req, res, next) {
  const header = req.headers.authorization || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : null;
  if (!token) {
    return res.status(401).json({ success: false, message: "Não autenticado." });
  }
  try {
    req.usuario = jwt.verify(token, JWT_SECRET);
    next();
  } catch {
    return res.status(401).json({ success: false, message: "Token inválido ou expirado." });
  }
}

const router = express.Router();

// ---------- AUTENTICAÇÃO ----------

router.post("/sign-in", authLimiter, async (req, res) => {
  const { nome, email, senha } = req.body;
  if (!nome || !senha) {
    return res.status(400).json({ success: false, message: "Nome e senha são obrigatórios." });
  }
  try {
    const senha_hash = await bcrypt.hash(senha, 10);
    const { rows } = await pool.query(
      "INSERT INTO usuarios (nome, email, senha_hash) VALUES ($1,$2,$3) RETURNING id, nome, email",
      [nome, email || null, senha_hash]
    );
    res.status(201).json({ success: true, message: "Usuário criado!", user: rows[0] });
  } catch (err) {
    if (err.code === "23505") {
      return res.status(409).json({ success: false, message: "Nome de usuário ou e-mail já cadastrado." });
    }
    console.error(err);
    res.status(500).json({ success: false, message: "Erro ao cadastrar usuário." });
  }
});

router.post("/login", authLimiter, async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) {
    return res.status(400).json({ success: false, message: "Usuário e senha são obrigatórios." });
  }
  try {
    const { rows } = await pool.query(
      "SELECT * FROM usuarios WHERE lower(nome) = lower($1) OR lower(email) = lower($1)",
      [username]
    );
    const user = rows[0];
    if (!user || !(await bcrypt.compare(password, user.senha_hash))) {
      return res.status(401).json({ success: false, message: "Usuário ou senha incorretos." });
    }
    const token = jwt.sign({ usuario_id: user.id, nome: user.nome }, JWT_SECRET, { expiresIn: "2h" });
    res.json({
      success: true,
      message: "Login OK",
      token,
      user: { id: user.id, nome: user.nome, email: user.email },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: "Erro no servidor." });
  }
});

router.get("/me", authMiddleware, async (req, res) => {
  try {
    const { rows } = await pool.query(
      "SELECT id, nome, email FROM usuarios WHERE id = $1",
      [req.usuario.usuario_id]
    );
    if (rows.length === 0) return res.status(404).json({ success: false, message: "Usuário não encontrado." });
    res.json({ success: true, user: rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: "Erro ao buscar usuário." });
  }
});

router.put("/update-user", authMiddleware, async (req, res) => {
  const { nome, email, senha } = req.body;
  if (req.usuario.usuario_id !== Number(req.body.id)) {
    return res.status(403).json({ success: false, message: "Não autorizado." });
  }
  try {
    if (senha) {
      const senha_hash = await bcrypt.hash(senha, 10);
      await pool.query("UPDATE usuarios SET nome=$1, email=$2, senha_hash=$3 WHERE id=$4", [
        nome, email, senha_hash, req.usuario.usuario_id,
      ]);
    } else {
      await pool.query("UPDATE usuarios SET nome=$1, email=$2 WHERE id=$3", [
        nome, email, req.usuario.usuario_id,
      ]);
    }
    res.json({ success: true, message: "Dados atualizados!" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: "Erro ao atualizar." });
  }
});

router.delete("/delete-user/:id", authMiddleware, async (req, res) => {
  if (req.usuario.usuario_id !== Number(req.params.id)) {
    return res.status(403).json({ success: false, message: "Não autorizado." });
  }
  try {
    await pool.query("DELETE FROM usuarios WHERE id=$1", [req.params.id]);
    res.json({ success: true, message: "Conta excluída com sucesso." });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: "Erro ao deletar conta." });
  }
});

// ---------- PRODUTOS ----------

router.get("/produtos", async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT p.id, p.nome, p.preco, p.imagem_url AS "imagemUrl", p.tamanho, p.descricao,
              p.usuario_id AS "usuarioId", u.nome AS "vendedorNome"
       FROM produtos p LEFT JOIN usuarios u ON u.id = p.usuario_id
       WHERE p.vendido = false ORDER BY p.criado_em DESC`
    );
    res.json({ success: true, results: rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: "Erro ao listar produtos." });
  }
});

router.get("/produtos/:id", async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT id, nome, preco, imagem_url AS "imagemUrl", tamanho, descricao, usuario_id AS "usuarioId"
       FROM produtos WHERE id = $1`,
      [req.params.id]
    );
    if (rows.length === 0) return res.status(404).json({ success: false, message: "Produto não encontrado." });
    res.json({ success: true, produto: rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: "Erro ao buscar produto." });
  }
});

router.post("/produtos", authMiddleware, async (req, res) => {
  const { nome, preco, imagemUrl, tamanho, descricao } = req.body;
  if (!nome || !preco || !imagemUrl) {
    return res.status(400).json({ success: false, message: "Campos obrigatórios: nome, preço e imagem." });
  }
  try {
    const { rows } = await pool.query(
      `INSERT INTO produtos (nome, preco, imagem_url, tamanho, descricao, usuario_id)
       VALUES ($1,$2,$3,$4,$5,$6)
       RETURNING id, nome, preco, imagem_url AS "imagemUrl", tamanho, descricao, usuario_id AS "usuarioId"`,
      [nome, preco, imagemUrl, tamanho || null, descricao || null, req.usuario.usuario_id]
    );
    res.status(201).json({ success: true, message: "Tênis criado com sucesso!", produto: rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: "Erro ao criar tênis." });
  }
});

router.put("/produtos/:id/vendido", authMiddleware, async (req, res) => {
  try {
    const { rows } = await pool.query("SELECT usuario_id FROM produtos WHERE id=$1", [req.params.id]);
    if (rows.length === 0) return res.status(404).json({ success: false, message: "Produto não encontrado." });
    if (rows[0].usuario_id !== req.usuario.usuario_id) {
      return res.status(403).json({ success: false, message: "Não autorizado." });
    }
    await pool.query("UPDATE produtos SET vendido = true WHERE id=$1", [req.params.id]);
    res.json({ success: true, message: "Produto marcado como vendido." });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: "Erro ao atualizar produto." });
  }
});

// ---------- CUPONS ----------

router.get("/cupons", async (req, res) => {
  try {
    const { rows } = await pool.query("SELECT codigo, desconto FROM cupons ORDER BY codigo");
    res.json({ success: true, results: rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: "Erro ao listar cupons." });
  }
});

router.post("/cupons", authMiddleware, async (req, res) => {
  const { codigo, desconto } = req.body;
  if (!codigo || codigo.length < 2 || !(desconto > 0 && desconto < 1)) {
    return res.status(400).json({ success: false, message: "Código e desconto (entre 0 e 1) são obrigatórios." });
  }
  try {
    await pool.query("INSERT INTO cupons (codigo, desconto) VALUES ($1,$2)", [codigo.toUpperCase(), desconto]);
    res.status(201).json({ success: true, message: "Cupom adicionado!" });
  } catch (err) {
    if (err.code === "23505") {
      return res.status(409).json({ success: false, message: "Já existe esse cupom." });
    }
    console.error(err);
    res.status(500).json({ success: false, message: "Erro ao adicionar cupom." });
  }
});

router.post("/cupons/validar", async (req, res) => {
  const { codigo } = req.body;
  try {
    const { rows } = await pool.query("SELECT desconto FROM cupons WHERE codigo=$1", [(codigo || "").toUpperCase()]);
    if (rows.length === 0) return res.json({ success: true, valido: false });
    res.json({ success: true, valido: true, desconto: Number(rows[0].desconto) });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: "Erro ao validar cupom." });
  }
});

// ---------- TROCAS ----------

router.get("/trocas", async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT t.id, t.nome, t.descricao, t.troca_por AS "trocaPor", t.imagens,
              t.usuario_id AS "usuarioId", t.vendido, u.nome AS "donoNome"
       FROM trocas t LEFT JOIN usuarios u ON u.id = t.usuario_id
       WHERE t.vendido = false ORDER BY t.criado_em DESC`
    );
    res.json({ success: true, results: rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: "Erro ao listar trocas." });
  }
});

router.get("/trocas/:id", async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT id, nome, descricao, troca_por AS "trocaPor", imagens, usuario_id AS "usuarioId", vendido
       FROM trocas WHERE id=$1`,
      [req.params.id]
    );
    if (rows.length === 0) return res.status(404).json({ success: false, message: "Troca não encontrada." });
    res.json({ success: true, troca: rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: "Erro ao buscar troca." });
  }
});

router.post("/trocas", authMiddleware, async (req, res) => {
  const { nome, descricao, trocaPor, imagens } = req.body;
  if (!nome || !trocaPor || !Array.isArray(imagens) || imagens.length === 0) {
    return res.status(400).json({ success: false, message: "Preencha nome, troca desejada e ao menos uma imagem." });
  }
  try {
    const { rows } = await pool.query(
      `INSERT INTO trocas (usuario_id, nome, descricao, troca_por, imagens)
       VALUES ($1,$2,$3,$4,$5)
       RETURNING id, nome, descricao, troca_por AS "trocaPor", imagens, usuario_id AS "usuarioId", vendido`,
      [req.usuario.usuario_id, nome, descricao || null, trocaPor, JSON.stringify(imagens)]
    );
    res.status(201).json({ success: true, message: "Anúncio de troca criado!", troca: rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: "Erro ao criar troca." });
  }
});

router.put("/trocas/:id/vendido", authMiddleware, async (req, res) => {
  try {
    const { rows } = await pool.query("SELECT usuario_id FROM trocas WHERE id=$1", [req.params.id]);
    if (rows.length === 0) return res.status(404).json({ success: false, message: "Troca não encontrada." });
    if (rows[0].usuario_id !== req.usuario.usuario_id) {
      return res.status(403).json({ success: false, message: "Não autorizado." });
    }
    await pool.query("UPDATE trocas SET vendido = true WHERE id=$1", [req.params.id]);
    res.json({ success: true, message: "Marcado como vendido." });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: "Erro ao atualizar troca." });
  }
});

// Cada usuário só enxerga a própria conversa sobre uma troca — nunca a de outra pessoa.
router.get("/trocas/:id/mensagens", authMiddleware, async (req, res) => {
  try {
    const { rows } = await pool.query(
      "SELECT id, remetente, texto, criado_em AS \"criadoEm\" FROM troca_mensagens WHERE troca_id=$1 AND usuario_id=$2 ORDER BY criado_em ASC",
      [req.params.id, req.usuario.usuario_id]
    );
    res.json({ success: true, results: rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: "Erro ao listar mensagens." });
  }
});

router.post("/trocas/:id/mensagens", authMiddleware, async (req, res) => {
  const { texto } = req.body;
  if (!texto || !texto.trim()) {
    return res.status(400).json({ success: false, message: "Mensagem vazia." });
  }
  try {
    const { rows: trocaRows } = await pool.query("SELECT id FROM trocas WHERE id=$1", [req.params.id]);
    if (trocaRows.length === 0) return res.status(404).json({ success: false, message: "Troca não encontrada." });

    const { rows: userMsg } = await pool.query(
      "INSERT INTO troca_mensagens (troca_id, usuario_id, remetente, texto) VALUES ($1,$2,'user',$3) RETURNING id, remetente, texto, criado_em AS \"criadoEm\"",
      [req.params.id, req.usuario.usuario_id, texto.trim()]
    );
    const { rows: sellerMsg } = await pool.query(
      "INSERT INTO troca_mensagens (troca_id, usuario_id, remetente, texto) VALUES ($1,$2,'seller',$3) RETURNING id, remetente, texto, criado_em AS \"criadoEm\"",
      [req.params.id, req.usuario.usuario_id, "Obrigado pela mensagem! Responderemos em breve."]
    );
    res.status(201).json({ success: true, mensagens: [userMsg[0], sellerMsg[0]] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: "Erro ao enviar mensagem." });
  }
});

app.use("/api", router);

module.exports = app;
