const pool = require("./db");
const { NOTICIAS } = require("./assets/js/data.js");

async function seed() {
  const client = await pool.connect();
  try {
    for (const n of NOTICIAS) {
      await client.query(
        `INSERT INTO noticias (slug, editoria, titulo, linha, resumo30s, corpo, fontes, tempo_leitura, destaque, imagem_cor, publicado_em)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
         ON CONFLICT (slug) DO UPDATE SET
           editoria = EXCLUDED.editoria,
           titulo = EXCLUDED.titulo,
           linha = EXCLUDED.linha,
           resumo30s = EXCLUDED.resumo30s,
           corpo = EXCLUDED.corpo,
           fontes = EXCLUDED.fontes,
           tempo_leitura = EXCLUDED.tempo_leitura,
           destaque = EXCLUDED.destaque,
           imagem_cor = EXCLUDED.imagem_cor,
           publicado_em = EXCLUDED.publicado_em`,
        [
          n.id,
          n.editoria,
          n.titulo,
          n.linha,
          JSON.stringify(n.resumo30s),
          JSON.stringify(n.corpo.map((p) => `<p>${p}</p>`)),
          JSON.stringify(n.fontes),
          n.tempoLeitura,
          n.destaque,
          n.imagem,
          n.data,
        ]
      );
    }
    console.log(`Seed concluído: ${NOTICIAS.length} notícias inseridas/atualizadas.`);
  } catch (err) {
    console.error("Erro no seed:", err.message);
    process.exitCode = 1;
  } finally {
    client.release();
    await pool.end();
  }
}

seed();
