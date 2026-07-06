const pool = require("./db");

const SQL = `
CREATE TABLE IF NOT EXISTS noticias (
  id serial PRIMARY KEY,
  slug text UNIQUE NOT NULL,
  editoria text NOT NULL,
  titulo text NOT NULL,
  linha text NOT NULL,
  resumo30s jsonb NOT NULL DEFAULT '[]',
  corpo jsonb NOT NULL DEFAULT '[]',
  fontes jsonb NOT NULL DEFAULT '[]',
  tempo_leitura int NOT NULL DEFAULT 3,
  destaque boolean NOT NULL DEFAULT false,
  imagem_cor text NOT NULL DEFAULT 'teal',
  publicado_em timestamptz NOT NULL DEFAULT now(),
  criado_em timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_noticias_editoria ON noticias (editoria);
CREATE INDEX IF NOT EXISTS idx_noticias_publicado_em ON noticias (publicado_em DESC);

CREATE TABLE IF NOT EXISTS newsletter_assinantes (
  id serial PRIMARY KEY,
  email text UNIQUE NOT NULL,
  criado_em timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS usuarios (
  id serial PRIMARY KEY,
  nome text NOT NULL,
  email text UNIQUE NOT NULL,
  senha_hash text NOT NULL,
  role text NOT NULL DEFAULT 'editor' CHECK (role IN ('admin', 'editor')),
  permissoes jsonb NOT NULL DEFAULT '{"publicar": false, "editorias": []}',
  ativo boolean NOT NULL DEFAULT true,
  criado_em timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE noticias ADD COLUMN IF NOT EXISTS autor_id integer REFERENCES usuarios(id);
ALTER TABLE noticias ADD COLUMN IF NOT EXISTS imagem_url text;
ALTER TABLE noticias ADD COLUMN IF NOT EXISTS video_url text;
`;

async function migrate() {
  try {
    await pool.query(SQL);
    console.log("Migração concluída: tabelas noticias e newsletter_assinantes prontas.");
  } catch (err) {
    console.error("Erro na migração:", err.message);
    process.exitCode = 1;
  } finally {
    await pool.end();
  }
}

migrate();
