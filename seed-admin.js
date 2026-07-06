const bcrypt = require("bcryptjs");
const pool = require("./db");

async function seedAdmin() {
  const { ADMIN_NOME, ADMIN_EMAIL, ADMIN_SENHA } = process.env;
  if (!ADMIN_EMAIL || !ADMIN_SENHA) {
    throw new Error("Defina ADMIN_EMAIL e ADMIN_SENHA no .env antes de rodar o seed do admin.");
  }
  try {
    const { rows } = await pool.query("SELECT id FROM usuarios WHERE email = $1", [ADMIN_EMAIL.toLowerCase()]);
    if (rows.length) {
      console.log(`Admin ${ADMIN_EMAIL} já existe (id ${rows[0].id}). Nada a fazer.`);
      return;
    }
    const hash = await bcrypt.hash(ADMIN_SENHA, 10);
    const { rows: novo } = await pool.query(
      `INSERT INTO usuarios (nome, email, senha_hash, role, permissoes, ativo)
       VALUES ($1, $2, $3, 'admin', '{"publicar": true, "editorias": []}', true)
       RETURNING id, nome, email, role`,
      [ADMIN_NOME || "Administrador", ADMIN_EMAIL.toLowerCase(), hash]
    );
    console.log("Admin criado:", novo[0]);
  } finally {
    await pool.end();
  }
}

seedAdmin().catch((err) => {
  console.error("Erro ao criar admin:", err.message);
  process.exitCode = 1;
});
