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

// Todo <script>/<style> inline foi removido do front-end (ver public/), então
// dá pra manter um CSP restrito: só scripts/estilos do próprio site, sem
// inline e sem eval. Google Fonts é a única origem externa permitida.
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'"],
        // script-src fica estrito (sem inline, sem eval) — é o que impede
        // XSS de executar código. style-src permite inline porque todo
        // style="" do site é string fixa escrita pelo dev (nunca interpola
        // dado de usuário), então o risco de CSS-injection aqui é baixo.
        styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
        fontSrc: ["'self'", "https://fonts.gstatic.com"],
        imgSrc: ["'self'", "data:"],
        connectSrc: ["'self'"],
        objectSrc: ["'none'"],
        baseUri: ["'self'"],
        formAction: ["'self'"],
        frameAncestors: ["'none'"],
        upgradeInsecureRequests: [],
      },
    },
  })
);

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

// Limite mais permissivo para ações de escrita autenticadas do admin
// (publicar/remover peça) — evita abuso sem atrapalhar o uso normal.
const writeLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 60,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: "Muitas requisições. Tente novamente em alguns minutos." },
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

// Só a conta admin (sinalizada em usuarios.is_admin, carregada no token no
// login) pode adicionar/remover peças do catálogo — o site agora é uma loja
// curada por uma pessoa só, não um marketplace aberto.
function adminOnly(req, res, next) {
  if (!req.usuario || !req.usuario.isAdmin) {
    return res.status(403).json({ success: false, message: "Apenas o administrador pode gerenciar peças." });
  }
  next();
}

const router = express.Router();

const SPECIAL_CHAR_REGEX = /[^A-Za-z0-9]/;
function senhaInvalida(senha) {
  if (!senha || senha.length < 6) return "A senha precisa ter no mínimo 6 caracteres.";
  if (!SPECIAL_CHAR_REGEX.test(senha)) return "A senha precisa ter pelo menos um caractere especial (ex: ! @ # $ % *).";
  return null;
}

// --- Validação de entrada compartilhada ---
// Mesmo com queries parametrizadas (sem risco de SQL injection), limitamos
// tamanho/formato dos campos vindos do cliente: evita payloads gigantes no
// banco e dados que quebrariam a UI.
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const CATEGORIAS_VALIDAS = ["tenis", "roupas", "acessorios"];
const CONDICOES_VALIDAS = ["novo", "seminovo", "usado"];

function textoInvalido(valor, { min = 1, max = 255, label = "Campo" } = {}) {
  if (typeof valor !== "string" || valor.trim().length < min) return `${label} precisa ter pelo menos ${min} caractere(s).`;
  if (valor.length > max) return `${label} pode ter no máximo ${max} caracteres.`;
  return null;
}

function emailInvalido(email) {
  if (!email) return null; // e-mail é opcional no cadastro
  if (typeof email !== "string" || email.length > 160 || !EMAIL_REGEX.test(email)) return "E-mail inválido.";
  return null;
}

function isDataUrlImagem(valor) {
  return typeof valor === "string" && /^data:image\/(png|jpeg|jpg|webp|gif);base64,/.test(valor);
}

// ---------- AUTENTICAÇÃO ----------

router.post("/sign-in", authLimiter, async (req, res) => {
  const { nome, email, senha } = req.body;
  if (!nome || !senha) {
    return res.status(400).json({ success: false, message: "Nome e senha são obrigatórios." });
  }
  const erroNome = textoInvalido(nome, { min: 3, max: 40, label: "Nome" });
  if (erroNome) return res.status(400).json({ success: false, message: erroNome });
  const erroEmail = emailInvalido(email);
  if (erroEmail) return res.status(400).json({ success: false, message: erroEmail });
  const erroSenha = senhaInvalida(senha);
  if (erroSenha) {
    return res.status(400).json({ success: false, message: erroSenha });
  }
  try {
    const senha_hash = await bcrypt.hash(senha, 10);
    const { rows } = await pool.query(
      "INSERT INTO usuarios (nome, email, senha_hash) VALUES ($1,$2,$3) RETURNING id, nome, email",
      [nome.trim(), email ? email.trim() : null, senha_hash]
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
    const isAdmin = !!user.is_admin;
    const token = jwt.sign({ usuario_id: user.id, nome: user.nome, isAdmin }, JWT_SECRET, { expiresIn: "2h" });
    res.json({
      success: true,
      message: "Login OK",
      token,
      user: { id: user.id, nome: user.nome, email: user.email, foto: user.foto_url, isAdmin },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: "Erro no servidor." });
  }
});

router.get("/me", authMiddleware, async (req, res) => {
  try {
    const { rows } = await pool.query(
      "SELECT id, nome, email, foto_url AS foto, is_admin AS \"isAdmin\" FROM usuarios WHERE id = $1",
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
  const { nome, email, senha, foto } = req.body;
  if (req.usuario.usuario_id !== Number(req.body.id)) {
    return res.status(403).json({ success: false, message: "Não autorizado." });
  }
  const erroNome = textoInvalido(nome, { min: 3, max: 40, label: "Nome" });
  if (erroNome) return res.status(400).json({ success: false, message: erroNome });
  const erroEmail = emailInvalido(email);
  if (erroEmail) return res.status(400).json({ success: false, message: erroEmail });
  if (senha) {
    const erroSenha = senhaInvalida(senha);
    if (erroSenha) {
      return res.status(400).json({ success: false, message: erroSenha });
    }
  }
  try {
    const { rows } = await pool.query("SELECT foto_url FROM usuarios WHERE id=$1", [req.usuario.usuario_id]);
    const fotoFinal = foto !== undefined ? foto : rows[0]?.foto_url;

    if (senha) {
      const senha_hash = await bcrypt.hash(senha, 10);
      await pool.query("UPDATE usuarios SET nome=$1, email=$2, senha_hash=$3, foto_url=$4 WHERE id=$5", [
        nome, email, senha_hash, fotoFinal, req.usuario.usuario_id,
      ]);
    } else {
      await pool.query("UPDATE usuarios SET nome=$1, email=$2, foto_url=$3 WHERE id=$4", [
        nome, email, fotoFinal, req.usuario.usuario_id,
      ]);
    }
    res.json({ success: true, message: "Dados atualizados!", foto: fotoFinal });
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
    const { categoria } = req.query;
    const params = [];
    let where = "p.vendido = false";
    if (categoria) {
      if (!CATEGORIAS_VALIDAS.includes(categoria)) {
        return res.status(400).json({ success: false, message: "Categoria inválida." });
      }
      params.push(categoria);
      where += ` AND p.categoria = $${params.length}`;
    }
    const { rows } = await pool.query(
      `SELECT p.id, p.nome, p.preco, p.imagem_url AS "imagemUrl", p.tamanho, p.descricao,
              p.categoria, p.marca, p.condicao, p.criado_em AS "criadoEm",
              p.usuario_id AS "usuarioId", u.nome AS "vendedorNome"
       FROM produtos p LEFT JOIN usuarios u ON u.id = p.usuario_id
       WHERE ${where} ORDER BY p.criado_em DESC`,
      params
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
      `SELECT id, nome, preco, imagem_url AS "imagemUrl", tamanho, descricao,
              categoria, marca, condicao, usuario_id AS "usuarioId"
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

router.post("/produtos", authMiddleware, adminOnly, writeLimiter, async (req, res) => {
  const { nome, preco, imagemUrl, tamanho, descricao, categoria, marca, condicao } = req.body;
  if (!nome || !preco || !imagemUrl) {
    return res.status(400).json({ success: false, message: "Campos obrigatórios: nome, preço e imagem." });
  }
  const erroNome = textoInvalido(nome, { min: 2, max: 100, label: "Nome" });
  if (erroNome) return res.status(400).json({ success: false, message: erroNome });
  if (descricao) {
    const erroDesc = textoInvalido(descricao, { min: 1, max: 2000, label: "Descrição" });
    if (erroDesc) return res.status(400).json({ success: false, message: erroDesc });
  }
  if (tamanho && (typeof tamanho !== "string" || tamanho.length > 10)) {
    return res.status(400).json({ success: false, message: "Tamanho inválido." });
  }
  if (marca && (typeof marca !== "string" || marca.length > 60)) {
    return res.status(400).json({ success: false, message: "Marca inválida." });
  }
  const precoNum = Number(preco);
  if (!Number.isFinite(precoNum) || precoNum <= 0 || precoNum > 1000000) {
    return res.status(400).json({ success: false, message: "Preço inválido." });
  }
  if (!isDataUrlImagem(imagemUrl)) {
    return res.status(400).json({ success: false, message: "Imagem inválida." });
  }
  const categoriaFinal = categoria && CATEGORIAS_VALIDAS.includes(categoria) ? categoria : "tenis";
  const condicaoFinal = condicao && CONDICOES_VALIDAS.includes(condicao) ? condicao : "usado";
  try {
    const { rows } = await pool.query(
      `INSERT INTO produtos (nome, preco, imagem_url, tamanho, descricao, categoria, marca, condicao, usuario_id)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
       RETURNING id, nome, preco, imagem_url AS "imagemUrl", tamanho, descricao, categoria, marca, condicao, usuario_id AS "usuarioId"`,
      [nome.trim(), precoNum, imagemUrl, tamanho || null, descricao || null, categoriaFinal, marca ? marca.trim() : null, condicaoFinal, req.usuario.usuario_id]
    );
    res.status(201).json({ success: true, message: "Peça criada com sucesso!", produto: rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: "Erro ao criar peça." });
  }
});

router.put("/produtos/:id/vendido", authMiddleware, adminOnly, async (req, res) => {
  try {
    const { rows } = await pool.query("SELECT id FROM produtos WHERE id=$1", [req.params.id]);
    if (rows.length === 0) return res.status(404).json({ success: false, message: "Produto não encontrado." });
    await pool.query("UPDATE produtos SET vendido = true WHERE id=$1", [req.params.id]);
    res.json({ success: true, message: "Produto marcado como vendido." });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: "Erro ao atualizar produto." });
  }
});

router.delete("/produtos/:id", authMiddleware, adminOnly, async (req, res) => {
  try {
    const { rowCount } = await pool.query("DELETE FROM produtos WHERE id=$1", [req.params.id]);
    if (rowCount === 0) return res.status(404).json({ success: false, message: "Produto não encontrado." });
    res.json({ success: true, message: "Peça removida." });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: "Erro ao remover peça." });
  }
});

app.use("/api", router);

module.exports = app;
