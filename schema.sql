CREATE TABLE IF NOT EXISTS usuarios (
  id SERIAL PRIMARY KEY,
  nome TEXT UNIQUE NOT NULL,
  email TEXT UNIQUE,
  senha_hash TEXT NOT NULL,
  criado_em TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS produtos (
  id SERIAL PRIMARY KEY,
  nome TEXT NOT NULL,
  preco NUMERIC(10,2) NOT NULL,
  imagem_url TEXT NOT NULL,
  tamanho TEXT,
  descricao TEXT,
  usuario_id INTEGER REFERENCES usuarios(id) ON DELETE CASCADE,
  vendido BOOLEAN NOT NULL DEFAULT false,
  criado_em TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS cupons (
  codigo TEXT PRIMARY KEY,
  desconto NUMERIC(4,3) NOT NULL CHECK (desconto > 0 AND desconto < 1)
);

CREATE TABLE IF NOT EXISTS trocas (
  id SERIAL PRIMARY KEY,
  usuario_id INTEGER REFERENCES usuarios(id) ON DELETE CASCADE,
  nome TEXT NOT NULL,
  descricao TEXT,
  troca_por TEXT NOT NULL,
  imagens JSONB NOT NULL DEFAULT '[]',
  vendido BOOLEAN NOT NULL DEFAULT false,
  criado_em TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS troca_mensagens (
  id SERIAL PRIMARY KEY,
  troca_id INTEGER NOT NULL REFERENCES trocas(id) ON DELETE CASCADE,
  remetente TEXT NOT NULL CHECK (remetente IN ('user', 'seller')),
  texto TEXT NOT NULL,
  criado_em TIMESTAMPTZ NOT NULL DEFAULT now()
);
