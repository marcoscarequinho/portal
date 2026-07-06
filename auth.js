const jwt = require("jsonwebtoken");

if (!process.env.JWT_SECRET) {
  throw new Error("JWT_SECRET não definida. Configure o arquivo .env.");
}

function assinarToken(usuario) {
  return jwt.sign(
    { id: usuario.id, role: usuario.role, permissoes: usuario.permissoes, nome: usuario.nome, email: usuario.email },
    process.env.JWT_SECRET,
    { expiresIn: "12h" }
  );
}

function requireAuth(req, res, next) {
  const header = req.headers.authorization || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : null;
  if (!token) return res.status(401).json({ erro: "Autenticação necessária." });
  try {
    req.usuario = jwt.verify(token, process.env.JWT_SECRET);
    next();
  } catch {
    res.status(401).json({ erro: "Sessão inválida ou expirada. Faça login novamente." });
  }
}

function requireAdmin(req, res, next) {
  if (req.usuario.role !== "admin") return res.status(403).json({ erro: "Apenas administradores podem fazer isso." });
  next();
}

// Um editor só pode publicar se tiver a permissão 'publicar' e, se a lista de
// editorias estiver restrita, a editoria da notícia precisa estar nela.
function podePublicarEm(usuario, editoria) {
  if (usuario.role === "admin") return true;
  const perms = usuario.permissoes || {};
  if (!perms.publicar) return false;
  if (Array.isArray(perms.editorias) && perms.editorias.length > 0) {
    return perms.editorias.includes(editoria);
  }
  return true;
}

module.exports = { assinarToken, requireAuth, requireAdmin, podePublicarEm };
