const express = require('express');
const path = require('path');
const connection = require('./db');
const cors = require('cors');
const app = express();
const PORT = 3000;
const jwt = require('jsonwebtoken');
const { copyFile } = require('fs');

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static('html'));
const SECRET_KEY = 'seu_segredo_aqui';

// Servir HTML direto da pasta

// LOGIN
app.post('/login', (req, res) => {
  const { username, password } = req.body;
  const sql = 'SELECT * FROM usuarios WHERE nome = ? AND senha = ?';

  console.log("Dados recebidos:", req.body); // Log para depuração

  connection.query(sql, [username, password], (err, results) => {
    // Log para depuração
    if (err) return res.status(500).send('Erro no servidor');
    if (results.length > 0) {
      const user = results[0];

      console.log("Resultados da consulta:", user.id, user.nome); // Log para depuração

      // Gera o token JWT com o usuario_id e nome
      const token = jwt.sign(
        { usuario_id: user.id, nome: user.nome }, // Você pode ajustar os campos que quer enviar
        SECRET_KEY,
        { expiresIn: '1h' } // Token válido por 1 hora
      );

      res.json({
        success: true,
        message: 'Login OK',
        token,  // envia o token para o frontend
        user: {
          id: user.id,
          nome: user.nome
        }
      });
    } else {
      res.status(401).json({ success: false, message: 'Usuário ou senha incorretos' });
    }
  });
});

app.get("/teste", (req, res) => {
  const sql = 'SELECT * FROM usuarios';
  return res.json(connection.query(sql, (err, results) => {
    if (err) return res.status(500).send('Erro no servidor');
    res.json(results);
  }))
})

// UPDATE USER
app.put('/update-user', (req, res) => {
  const { nome, email, senha, id } = req.body;
  const sql = 'UPDATE usuarios SET nome = ?, email = ?, senha = ? WHERE id = ?';

  connection.query(sql, [nome, email, senha, id], (err, results) => {
    if (err) return res.status(500).json({ success: false, message: 'Erro ao atualizar' });
    res.json({ success: true, message: 'Dados atualizados!' });
  });
});

// CADASTRO
app.post('/sign-in', (req, res) => {
  const { nome, email, senha } = req.body;
  const sql = 'INSERT INTO usuarios (nome, email, senha) VALUES (?, ?, ?)';

  connection.query(sql, [nome, email, senha], (err, results) => {
    if (err) {
      console.error(err); // Isso ajuda a depurar no terminal
      return res.status(500).json({ success: false, message: 'Erro ao cadastrar usuário' });
    }
    res.json({ success: true, message: 'Usuário criado!' });
  });
});


// ATUALIZAR PERFIL
app.put('/update-user', (req, res) => {
  const { nome, email, senha, id } = req.body;
  const sql = 'UPDATE usuarios SET nome = ?, email = ?, senha = ? WHERE id = ?';

  connection.query(sql, [nome, email, senha, id], (err, results) => {
    if (err) return res.status(500).send('Erro ao atualizar');
    res.json({ success: true, message: 'Dados atualizados!' });
  });
});
// ADICIONANDO TENIS PRA SER VENDIDO
app.post("/create-tenis", (req, res) => { // Removi async pois não há await
  try {
    const { nome, preco, imagemUrl, tamanho, descricao, usuario_id } = req.body;
    console.log("Dados recebidos:", req.body);

    // Validação básica
    if (!nome || !preco || !imagemUrl) {
      return res.status(400).json({ message: "Campos obrigatórios: nome, preço e imagem" });
    }

    // Query de inserção (adaptada para incluir todos os campos disponíveis)
    const query = 'INSERT INTO tenisvendidos (nome, preco, imagemUrl, tamanho, descricao, usuario_id) VALUES (?, ?, ?, ?, ?, ?)';

    connection.query(query, [nome, preco, imagemUrl, tamanho || null, descricao || null, usuario_id], (err, result) => {
      if (err) {
        console.error("Erro SQL:", err);
        return res.status(500).json({ message: "Erro ao criar tênis no banco de dados" });
      }

      return res.status(201).json({
        message: "Tênis criado com sucesso!",
        tenis: {
          id: result.insertId,
          nome,
          preco,
          imagem_url: imagemUrl,
          tamanho,
          usuario_id,
          descricao
        }
      });
    });
  } catch (error) {
    console.error("Erro ao criar tênis:", error);
    return res.status(500).json({ message: "Erro interno ao processar a requisição" });
  }
});

app.delete('/delete-user/:id', (req, res) => {
  const id = req.params.id;
  const sql = 'DELETE FROM usuarios WHERE id = ?';

  connection.query(sql, [id], (err, results) => {
    if (err) return res.status(500).json({ success: false, message: 'Erro ao deletar conta' });
    res.json({ success: true, message: 'Conta excluída com sucesso.' });
  });
});

app.post('/listar-tenis', (req, res) => {
  const { usuario_id } = req.body;
  const sql = 'Select * FROM tenisvendidos WHERE usuario_id = ?';
  console.log("Listando tênis para o usuário:", usuario_id); // Log para depuração
  if (!usuario_id) {
    return res.status(400).json({ success: false, message: 'Usuário não informado' });
  }
  connection.query(sql, [usuario_id], (err, results) => {
    if (err) return res.status(500).json({ success: false, message: 'Erro ao listar produtos' });
    console.log("Resultados da consulta:", results); // Log para depuração
    res.json({ success: true, message: 'produtos listados', results });
  });
});

app.listen(PORT, () => console.log(`Servidor rodando: http://localhost:${PORT}`));


app.use(express.static(path.join(__dirname, 'html')));
app.use('/Css', express.static(path.join(__dirname, 'Css')));
app.use('/Galery', express.static(path.join(__dirname, 'Galery')));
app.use('/Js', express.static(path.join(__dirname, 'Js')));

