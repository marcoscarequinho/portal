// Cais — conversão de links de vídeo (YouTube/Vimeo) em embed responsivo.
// Só geramos <iframe> para domínios confiáveis; qualquer outro link vira apenas um link clicável,
// para não embutir conteúdo arbitrário de terceiros na página.
function escaparAtributo(valor) {
  return String(valor)
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function videoEmbedHTML(url) {
  if (!url) return "";
  let parsed;
  try {
    parsed = new URL(url);
  } catch {
    return "";
  }

  const host = parsed.hostname.replace(/^www\.|^m\./, "");
  let src = null;

  if (host === "youtube.com") {
    const id = parsed.searchParams.get("v") || parsed.pathname.match(/^\/(?:shorts|embed)\/([\w-]+)/)?.[1];
    if (id) src = `https://www.youtube-nocookie.com/embed/${id}`;
  } else if (host === "youtu.be") {
    const id = parsed.pathname.slice(1).split("/")[0];
    if (id) src = `https://www.youtube-nocookie.com/embed/${id}`;
  } else if (host === "vimeo.com" || host === "player.vimeo.com") {
    const id = parsed.pathname.match(/(\d+)/)?.[1];
    if (id) src = `https://player.vimeo.com/video/${id}`;
  }

  if (src) {
    return `<div class="video-embed"><iframe src="${src}" title="Vídeo da matéria" loading="lazy"
      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
      allowfullscreen referrerpolicy="strict-origin-when-cross-origin"></iframe></div>`;
  }

  const seguro = escaparAtributo(url);
  return `<p><a href="${seguro}" target="_blank" rel="noopener noreferrer">▶ Assistir vídeo</a></p>`;
}

if (typeof module !== "undefined" && module.exports) {
  module.exports = { videoEmbedHTML };
}
