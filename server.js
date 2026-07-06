require("dotenv").config();
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const { execFile } = require("child_process");
const util = require("util");
const execFileAsync = util.promisify(execFile);
const express = require("express");
const cors = require("cors");
const bcrypt = require("bcryptjs");
const multer = require("multer");
const pool = require("./db");
const { MAIS_LIDAS } = require("./assets/js/data.js");
const { assinarToken, requireAuth, requireAdmin, podePublicarEm } = require("./auth");

const app = express();
const PORT = process.env.PORT || 3000;

// ---------------- Upload de imagens ----------------
// Em produção (Vercel) o filesystem é somente leitura fora de /tmp e não persiste
// entre execuções, então as imagens vão para o Vercel Blob. Em dev local, sem
// BLOB_READ_WRITE_TOKEN configurado, caem no disco em ./uploads como antes.
const UPLOADS_DIR = path.join(__dirname, "uploads");
const USANDO_BLOB = !!process.env.BLOB_READ_WRITE_TOKEN;
if (!USANDO_BLOB) fs.mkdirSync(UPLOADS_DIR, { recursive: true });

// ---------------- Áudio das matérias (texto-para-fala local via Windows, sem API paga) ----------------
const AUDIO_DIR = path.join(UPLOADS_DIR, "audio");
if (process.platform === "win32") fs.mkdirSync(AUDIO_DIR, { recursive: true });
const TTS_SCRIPT = path.join(__dirname, "scripts", "tts.ps1");

app.use(cors());
app.use(express.json());

// Somente os diretórios de conteúdo público e as páginas HTML nomeadas são
// servidos como estático — evita expor server.js, migrate.js, seed.js etc.
app.use("/assets", express.static(path.join(__dirname, "assets")));
app.use("/uploads", express.static(UPLOADS_DIR));

const PAGINAS_PUBLICAS = new Set([
  "index.html", "busca.html", "noticia.html", "editor.html", "login.html", "admin.html",
]);
app.use((req, res, next) => {
  const nomeArquivo = req.path.replace(/^\//, "");
  if (PAGINAS_PUBLICAS.has(nomeArquivo)) return res.sendFile(path.join(__dirname, nomeArquivo));
  next();
});

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function nomeArquivoAudio(slug) {
  return `${slug.replace(/[^a-zA-Z0-9_-]/g, "_")}.wav`;
}

function textoParaAudio(noticia) {
  const corpoTexto = (noticia.corpo || [])
    .join(" ")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  const partes = [noticia.titulo, noticia.linha, ...(noticia.resumo30s || []), corpoTexto];
  return partes.filter(Boolean).join(". ");
}

// Gera o .wav sob demanda na primeira vez que alguém pede o áudio de uma matéria
// (serve tanto para matérias antigas quanto novas) e reaproveita o arquivo depois.
async function gerarAudioSeNecessario(noticia) {
  const arquivo = nomeArquivoAudio(noticia.slug);
  const caminhoAudio = path.join(AUDIO_DIR, arquivo);
  const urlPublica = `/uploads/audio/${arquivo}`;

  if (fs.existsSync(caminhoAudio)) return urlPublica;

  const caminhoTexto = path.join(AUDIO_DIR, `${arquivo}.txt`);
  fs.writeFileSync(caminhoTexto, "﻿" + textoParaAudio(noticia), "utf8");

  try {
    await execFileAsync(
      "powershell.exe",
      ["-NoProfile", "-NonInteractive", "-ExecutionPolicy", "Bypass", "-File", TTS_SCRIPT, "-InputPath", caminhoTexto, "-OutputPath", caminhoAudio],
      { timeout: 60000 }
    );
  } finally {
    fs.unlink(caminhoTexto, () => {});
  }

  return urlPublica;
}

const MIME_PARA_EXT = {
  "image/jpeg": ".jpg",
  "image/png": ".png",
  "image/webp": ".webp",
  "image/gif": ".gif",
};

const upload = multer({
  // Em memória: o buffer é gravado no Vercel Blob (produção) ou em disco (dev local)
  // dentro do handler, dependendo de BLOB_READ_WRITE_TOKEN estar configurado.
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (!MIME_PARA_EXT[file.mimetype]) return cb(new Error("Formato de imagem não suportado."));
    cb(null, true);
  },
});

app.post("/api/upload", requireAuth, (req, res) => {
  upload.single("imagem")(req, res, async (err) => {
    if (err) return res.status(400).json({ erro: err.message || "Falha no upload." });
    if (!req.file) return res.status(400).json({ erro: "Nenhum arquivo enviado." });

    // Nome gerado aqui (nunca a partir do nome enviado pelo cliente) para impedir
    // path traversal e colisões.
    const nomeArquivo = crypto.randomUUID() + MIME_PARA_EXT[req.file.mimetype];
    try {
      if (USANDO_BLOB) {
        const { put } = require("@vercel/blob");
        const blob = await put(nomeArquivo, req.file.buffer, {
          access: "public",
          contentType: req.file.mimetype,
        });
        return res.status(201).json({ url: blob.url });
      }
      fs.writeFileSync(path.join(UPLOADS_DIR, nomeArquivo), req.file.buffer);
      res.status(201).json({ url: `/uploads/${nomeArquivo}` });
    } catch (uploadErr) {
      console.error(uploadErr);
      res.status(500).json({ erro: "Falha ao salvar imagem." });
    }
  });
});

// GET /api/noticias?editoria=rio&q=chuva&from=2026-07-01&to=2026-07-03&destaque=true
app.get("/api/noticias", async (req, res) => {
  const { editoria, q, from, to, destaque } = req.query;
  const clauses = [];
  const params = [];

  if (editoria) {
    params.push(editoria);
    clauses.push(`editoria = $${params.length}`);
  }
  if (q) {
    params.push(`%${q}%`);
    clauses.push(`(titulo ILIKE $${params.length} OR linha ILIKE $${params.length})`);
  }
  if (from) {
    params.push(from);
    clauses.push(`publicado_em >= $${params.length}`);
  }
  if (to) {
    params.push(to);
    clauses.push(`publicado_em <= $${params.length}`);
  }
  if (destaque === "true") {
    clauses.push("destaque = true");
  }

  const where = clauses.length ? `WHERE ${clauses.join(" AND ")}` : "";
  try {
    const { rows } = await pool.query(
      `SELECT slug, editoria, titulo, linha, resumo30s, tempo_leitura, destaque, imagem_cor, imagem_url, publicado_em, autor_id
       FROM noticias ${where} ORDER BY publicado_em DESC`,
      params
    );
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ erro: "Falha ao buscar notícias." });
  }
});

app.get("/api/noticias/mais-lidas", async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT slug, editoria, titulo FROM noticias WHERE slug = ANY($1)`,
      [MAIS_LIDAS]
    );
    const ordenado = MAIS_LIDAS.map((slug) => rows.find((r) => r.slug === slug)).filter(Boolean);
    res.json(ordenado);
  } catch (err) {
    console.error(err);
    res.status(500).json({ erro: "Falha ao buscar mais lidas." });
  }
});

// ---------------- Notícias em tempo real (proxy server-side para a NewsAPI) ----------------
// A chave nunca é exposta ao navegador: fica só no processo do servidor (.env),
// e o proxy também evita o bloqueio de CORS que a NewsAPI aplica a chamadas
// feitas direto do browser fora de localhost.
const NEWSAPI_KEY = process.env.NEWSAPI_KEY;
const NEWSAPI_CACHE_MS = 5 * 60 * 1000;
let newsapiCache = { itens: null, buscadoEm: 0 };

app.get("/api/tempo-real", async (req, res) => {
  if (!NEWSAPI_KEY) return res.status(503).json({ erro: "NewsAPI não configurada." });

  if (newsapiCache.itens && Date.now() - newsapiCache.buscadoEm < NEWSAPI_CACHE_MS) {
    return res.json(newsapiCache.itens);
  }

  try {
    // "top-headlines?country=br" da NewsAPI costuma retornar 0 resultados (cobertura
    // fraca para o Brasil); "everything" com idioma pt e ordenado por publishedAt
    // funciona como um feed de notícias recentes em português.
    const url = new URL("https://newsapi.org/v2/everything");
    url.searchParams.set("q", "Brasil");
    url.searchParams.set("language", "pt");
    url.searchParams.set("sortBy", "publishedAt");
    url.searchParams.set("pageSize", "8");

    const resposta = await fetch(url, { headers: { "X-Api-Key": NEWSAPI_KEY } });
    const json = await resposta.json();
    if (json.status !== "ok") throw new Error(json.message || "Falha na NewsAPI.");

    const itens = (json.articles || [])
      .filter((a) => a.title && a.title !== "[Removed]")
      .map((a) => ({
        titulo: a.title,
        fonte: a.source?.name || "Fonte desconhecida",
        url: a.url,
        imagem: a.urlToImage || null,
        publicadoEm: a.publishedAt,
      }));

    newsapiCache = { itens, buscadoEm: Date.now() };
    res.json(itens);
  } catch (err) {
    console.error(err);
    if (newsapiCache.itens) return res.json(newsapiCache.itens);
    res.status(502).json({ erro: "Falha ao buscar notícias em tempo real." });
  }
});

app.get("/api/noticias/:slug", async (req, res) => {
  try {
    const { rows } = await pool.query(`SELECT * FROM noticias WHERE slug = $1`, [req.params.slug]);
    if (!rows.length) return res.status(404).json({ erro: "Notícia não encontrada." });
    res.json(rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ erro: "Falha ao buscar notícia." });
  }
});

// Gera (ou reaproveita) o áudio da matéria — funciona tanto para matérias antigas
// quanto para as recém-publicadas, já que a geração acontece sob demanda.
app.get("/api/noticias/:slug/audio", async (req, res) => {
  if (process.platform !== "win32") {
    return res.status(503).json({ erro: "Áudio de matérias não está disponível neste ambiente." });
  }
  try {
    const { rows } = await pool.query(
      `SELECT slug, titulo, linha, resumo30s, corpo FROM noticias WHERE slug = $1`,
      [req.params.slug]
    );
    if (!rows.length) return res.status(404).json({ erro: "Notícia não encontrada." });
    const url = await gerarAudioSeNecessario(rows[0]);
    res.json({ url });
  } catch (err) {
    console.error(err);
    res.status(500).json({ erro: "Falha ao gerar áudio da matéria." });
  }
});

app.post("/api/noticias", requireAuth, async (req, res) => {
  const {
    slug, editoria, titulo, linha,
    resumo30s = [], corpo = [], fontes = [],
    tempoLeitura = 3, destaque = false, imagemCor = "teal",
    imagemUrl = null, videoUrl = null,
  } = req.body || {};

  if (!slug || !editoria || !titulo || !linha) {
    return res.status(400).json({ erro: "Campos obrigatórios: slug, editoria, titulo, linha." });
  }
  if (!podePublicarEm(req.usuario, editoria)) {
    return res.status(403).json({ erro: "Você não tem permissão para publicar nesta editoria." });
  }

  try {
    const { rows } = await pool.query(
      `INSERT INTO noticias (slug, editoria, titulo, linha, resumo30s, corpo, fontes, tempo_leitura, destaque, imagem_cor, imagem_url, video_url, autor_id)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)
       RETURNING *`,
      [slug, editoria, titulo, linha, JSON.stringify(resumo30s), JSON.stringify(corpo), JSON.stringify(fontes), tempoLeitura, destaque, imagemCor, imagemUrl || null, videoUrl || null, req.usuario.id]
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    if (err.code === "23505") {
      return res.status(409).json({ erro: "Já existe uma notícia com este slug." });
    }
    console.error(err);
    res.status(500).json({ erro: "Falha ao criar notícia." });
  }
});

// Editores só podem alterar as próprias matérias; administradores podem editar qualquer uma.
app.put("/api/noticias/:slug", requireAuth, async (req, res) => {
  const {
    editoria, titulo, linha,
    resumo30s = [], corpo = [], fontes = [],
    tempoLeitura = 3, destaque = false, imagemCor = "teal",
    imagemUrl = null, videoUrl = null,
  } = req.body || {};

  if (!editoria || !titulo || !linha) {
    return res.status(400).json({ erro: "Campos obrigatórios: editoria, titulo, linha." });
  }

  try {
    const existente = await pool.query("SELECT autor_id FROM noticias WHERE slug = $1", [req.params.slug]);
    if (!existente.rows.length) return res.status(404).json({ erro: "Notícia não encontrada." });
    const autorId = existente.rows[0].autor_id;
    if (req.usuario.role !== "admin" && autorId !== req.usuario.id) {
      return res.status(403).json({ erro: "Você só pode editar matérias que você mesmo publicou." });
    }

    const { rows } = await pool.query(
      `UPDATE noticias SET editoria=$1, titulo=$2, linha=$3, resumo30s=$4, corpo=$5, fontes=$6,
        tempo_leitura=$7, destaque=$8, imagem_cor=$9, imagem_url=$10, video_url=$11
       WHERE slug=$12 RETURNING *`,
      [editoria, titulo, linha, JSON.stringify(resumo30s), JSON.stringify(corpo), JSON.stringify(fontes), tempoLeitura, destaque, imagemCor, imagemUrl || null, videoUrl || null, req.params.slug]
    );
    res.json(rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ erro: "Falha ao atualizar notícia." });
  }
});

// ---------------- Autenticação e gestão de usuários ----------------
app.post("/api/auth/login", async (req, res) => {
  const { email, senha } = req.body || {};
  if (!email || !senha) return res.status(400).json({ erro: "Informe e-mail e senha." });
  try {
    const { rows } = await pool.query("SELECT * FROM usuarios WHERE email = $1", [email.toLowerCase().trim()]);
    const usuario = rows[0];
    if (!usuario || !usuario.ativo || !(await bcrypt.compare(senha, usuario.senha_hash))) {
      return res.status(401).json({ erro: "E-mail ou senha inválidos." });
    }
    const token = assinarToken(usuario);
    res.json({
      token,
      usuario: { id: usuario.id, nome: usuario.nome, email: usuario.email, role: usuario.role, permissoes: usuario.permissoes },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ erro: "Falha ao autenticar." });
  }
});

app.get("/api/auth/me", requireAuth, async (req, res) => {
  try {
    const { rows } = await pool.query(
      "SELECT id, nome, email, role, permissoes, ativo FROM usuarios WHERE id = $1",
      [req.usuario.id]
    );
    if (!rows.length || !rows[0].ativo) return res.status(401).json({ erro: "Conta não encontrada ou desativada." });
    res.json(rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ erro: "Falha ao buscar usuário." });
  }
});

app.get("/api/auth/usuarios", requireAuth, requireAdmin, async (req, res) => {
  try {
    const { rows } = await pool.query(
      "SELECT id, nome, email, role, permissoes, ativo, criado_em FROM usuarios ORDER BY criado_em DESC"
    );
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ erro: "Falha ao listar usuários." });
  }
});

app.post("/api/auth/usuarios", requireAuth, requireAdmin, async (req, res) => {
  const { nome, email, senha, permissoes = { publicar: false, editorias: [] } } = req.body || {};
  if (!nome || !email || !senha) {
    return res.status(400).json({ erro: "Campos obrigatórios: nome, email, senha." });
  }
  try {
    const hash = await bcrypt.hash(senha, 10);
    const { rows } = await pool.query(
      `INSERT INTO usuarios (nome, email, senha_hash, role, permissoes)
       VALUES ($1, $2, $3, 'editor', $4)
       RETURNING id, nome, email, role, permissoes, ativo, criado_em`,
      [nome, email.toLowerCase().trim(), hash, JSON.stringify(permissoes)]
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    if (err.code === "23505") return res.status(409).json({ erro: "Já existe uma conta com este e-mail." });
    console.error(err);
    res.status(500).json({ erro: "Falha ao criar editor." });
  }
});

app.patch("/api/auth/usuarios/:id", requireAuth, requireAdmin, async (req, res) => {
  const { permissoes, ativo } = req.body || {};
  const campos = [];
  const valores = [];
  if (permissoes !== undefined) {
    valores.push(JSON.stringify(permissoes));
    campos.push(`permissoes = $${valores.length}`);
  }
  if (ativo !== undefined) {
    valores.push(!!ativo);
    campos.push(`ativo = $${valores.length}`);
  }
  if (!campos.length) return res.status(400).json({ erro: "Nada para atualizar." });
  valores.push(req.params.id);
  try {
    const { rows } = await pool.query(
      `UPDATE usuarios SET ${campos.join(", ")} WHERE id = $${valores.length}
       RETURNING id, nome, email, role, permissoes, ativo, criado_em`,
      valores
    );
    if (!rows.length) return res.status(404).json({ erro: "Usuário não encontrado." });
    res.json(rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ erro: "Falha ao atualizar usuário." });
  }
});

app.post("/api/newsletter", async (req, res) => {
  const { email } = req.body || {};
  if (!email || !EMAIL_RE.test(email)) {
    return res.status(400).json({ erro: "Informe um e-mail válido." });
  }
  try {
    await pool.query(
      `INSERT INTO newsletter_assinantes (email) VALUES ($1) ON CONFLICT (email) DO NOTHING`,
      [email.toLowerCase().trim()]
    );
    res.status(201).json({ mensagem: "Inscrição confirmada." });
  } catch (err) {
    console.error(err);
    res.status(500).json({ erro: "Falha ao inscrever e-mail." });
  }
});

app.get(["/", "/busca", "/noticia", "/editor", "/login", "/admin"], (req, res) => {
  const map = {
    "/": "index.html", "/busca": "busca.html", "/noticia": "noticia.html",
    "/editor": "editor.html", "/login": "login.html", "/admin": "admin.html",
  };
  res.sendFile(path.join(__dirname, map[req.path]));
});

// Na Vercel o app é importado por api/index.js e invocado por requisição —
// só sobe um listener HTTP normal quando roda localmente (node server.js).
if (!process.env.VERCEL) {
  app.listen(PORT, () => {
    console.log(`Cais rodando em http://localhost:${PORT}`);
  });
}

module.exports = app;
