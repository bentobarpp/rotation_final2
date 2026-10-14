CREATE TABLE IF NOT EXISTS usuarios (
  id SERIAL PRIMARY KEY,
  nome TEXT UNIQUE NOT NULL,
  email TEXT UNIQUE,
  senha_hash TEXT NOT NULL,
  foto_url TEXT,
  is_admin BOOLEAN NOT NULL DEFAULT false,
  criado_em TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS produtos (
  id SERIAL PRIMARY KEY,
  nome TEXT NOT NULL,
  preco NUMERIC(10,2) NOT NULL,
  imagem_url TEXT NOT NULL,
  tamanho TEXT,
  descricao TEXT,
  categoria TEXT NOT NULL DEFAULT 'tenis' CHECK (categoria IN ('tenis', 'roupas', 'acessorios')),
  marca TEXT,
  condicao TEXT NOT NULL DEFAULT 'usado' CHECK (condicao IN ('novo', 'seminovo', 'usado')),
  usuario_id INTEGER REFERENCES usuarios(id) ON DELETE CASCADE,
  vendido BOOLEAN NOT NULL DEFAULT false,
  criado_em TIMESTAMPTZ NOT NULL DEFAULT now()
);
