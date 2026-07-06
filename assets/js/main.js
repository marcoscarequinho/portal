// Cais — lógica de frontend. Consome a API em /api/noticias.
(function () {
  "use strict";

  const EDITORIA_MAP = Object.fromEntries(EDITORIAS.map((e) => [e.slug, e]));

  function editoriaInfo(slug) {
    return EDITORIA_MAP[slug] || { nome: slug, cor: "teal" };
  }

  function formatDataCurta(iso) {
    const d = new Date(iso);
    return d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" }) +
      " às " + d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
  }

  function tempoRelativo(iso) {
    const diffMin = Math.round((Date.now() - new Date(iso).getTime()) / 60000);
    if (diffMin < 1) return "agora mesmo";
    if (diffMin < 60) return `há ${diffMin} min`;
    const diffH = Math.round(diffMin / 60);
    if (diffH < 24) return `há ${diffH}h`;
    return formatDataCurta(iso);
  }

  async function fetchJSON(url, options) {
    const res = await fetch(url, options);
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.erro || "Erro na requisição.");
    return data;
  }

  // Conteúdo de terceiros (NewsAPI) não é confiável como os textos do próprio CMS,
  // então escapamos antes de jogar em innerHTML.
  function escapeHTML(str) {
    return String(str).replace(/[&<>"']/g, (c) => (
      { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]
    ));
  }

  // ---------------- Header (todas as páginas) ----------------
  function initHeader() {
    const toggle = document.querySelector(".mobile-toggle");
    const menu = document.querySelector(".mobile-menu");
    if (toggle && menu) {
      toggle.addEventListener("click", () => {
        menu.classList.toggle("open");
        toggle.setAttribute("aria-expanded", menu.classList.contains("open"));
      });
    }

    const darkToggle = document.querySelectorAll(".dark-toggle");
    const applyTheme = (dark) => {
      document.documentElement.classList.toggle("dark", dark);
      darkToggle.forEach((btn) => (btn.textContent = dark ? "☀️" : "🌙"));
    };
    const saved = localStorage.getItem("cais-theme");
    const prefersDark = window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches;
    applyTheme(saved ? saved === "dark" : prefersDark);
    darkToggle.forEach((btn) =>
      btn.addEventListener("click", () => {
        const isDark = !document.documentElement.classList.contains("dark");
        applyTheme(isDark);
        localStorage.setItem("cais-theme", isDark ? "dark" : "light");
      })
    );

    document.querySelectorAll(".header-search-form").forEach((form) => {
      form.addEventListener("submit", (e) => {
        e.preventDefault();
        const q = form.querySelector("input").value.trim();
        window.location.href = "busca.html" + (q ? `?q=${encodeURIComponent(q)}` : "");
      });
    });
  }

  // ---------------- Ticker "Ao vivo" (simulado no cliente) ----------------
  function initTicker() {
    const el = document.querySelector(".ticker-text");
    if (!el) return;
    let itens = AO_VIVO_INICIAL.map((i) => `${i.hora} — ${i.texto}`);
    let idx = 0;
    let novosRestantes = [...AO_VIVO_NOVOS];

    function render() {
      el.textContent = itens[idx % itens.length];
      idx++;
    }
    render();
    setInterval(render, 4500);

    setInterval(() => {
      if (!novosRestantes.length) return;
      const proximo = novosRestantes.shift();
      const hora = new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
      itens.unshift(`${hora} — ${proximo.texto}`);
      idx = 0;
      render();
    }, 20000);
  }

  // ---------------- Templates ----------------
  function tagHTML(slug) {
    const info = editoriaInfo(slug);
    return `<span class="tag tag--${info.cor} tag--${slug}">${info.nome}</span>`;
  }

  function mediaHTML(cor, url) {
    if (url) return `<img class="media-photo" src="${url}" alt="" />`;
    return `<div class="media-gradient media-${cor}" role="img" aria-label="Imagem ilustrativa da matéria"></div>`;
  }

  function cardHTML(n) {
    return `
      <a class="card" href="noticia.html?slug=${encodeURIComponent(n.slug)}">
        <div class="card-media">${mediaHTML(n.imagem_cor, n.imagem_url)}</div>
        <div class="card-body">
          ${tagHTML(n.editoria)}
          <h3>${n.titulo}</h3>
          <span class="card-meta">${tempoRelativo(n.publicado_em)} · ${n.tempo_leitura} min de leitura</span>
        </div>
      </a>`;
  }

  function slideCardHTML(n) {
    return `
      <a class="slide-card" href="noticia.html?slug=${encodeURIComponent(n.slug)}">
        <div class="card-media">${mediaHTML(n.imagem_cor, n.imagem_url)}</div>
        <div class="card-body">
          ${tagHTML(n.editoria)}
          <h3>${n.titulo}</h3>
          <span class="card-meta">${tempoRelativo(n.publicado_em)} · ${n.tempo_leitura} min de leitura</span>
        </div>
      </a>`;
  }

  function heroHTML(n) {
    return `
      <a class="hero" href="noticia.html?slug=${encodeURIComponent(n.slug)}">
        <div class="hero-media">${mediaHTML(n.imagem_cor, n.imagem_url)}</div>
        <div class="hero-content">
          ${tagHTML(n.editoria)}
          <h1>${n.titulo}</h1>
          <p>${n.linha}</p>
        </div>
      </a>`;
  }

  // ---------------- Newsletter (widget, presente em várias páginas) ----------------
  function initNewsletterForms() {
    document.querySelectorAll(".newsletter-form").forEach((form) => {
      form.addEventListener("submit", async (e) => {
        e.preventDefault();
        const input = form.querySelector("input[type=email]");
        const msg = form.querySelector(".form-msg");
        try {
          await fetchJSON("/api/newsletter", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email: input.value }),
          });
          msg.textContent = "Inscrição confirmada! Você vai receber o resumo diário.";
          msg.className = "form-msg ok";
          input.value = "";
        } catch (err) {
          msg.textContent = err.message;
          msg.className = "form-msg erro";
        }
      });
    });
  }

  async function renderMaisLidas() {
    const el = document.querySelector(".mais-lidas-list");
    if (!el) return;
    try {
      const lista = await fetchJSON("/api/noticias/mais-lidas");
      el.innerHTML = lista
        .map(
          (n, i) => `<li><span class="num">${i + 1}</span><a href="noticia.html?slug=${encodeURIComponent(n.slug)}">${n.titulo}</a></li>`
        )
        .join("");
    } catch {
      el.innerHTML = "<li>Não foi possível carregar.</li>";
    }
  }

  // ---------------- Notícias em tempo real (NewsAPI, via proxy do servidor) ----------------
  function realtimeItemHTML(n) {
    const thumb = n.imagem
      ? `<img class="realtime-thumb" src="${escapeHTML(n.imagem)}" alt="" loading="lazy" />`
      : `<div class="realtime-thumb"></div>`;
    return `
      <div class="realtime-item">
        ${thumb}
        <div class="realtime-body">
          <h4><a href="${escapeHTML(n.url)}" target="_blank" rel="noopener noreferrer">${escapeHTML(n.titulo)}</a></h4>
          <span class="realtime-meta">${escapeHTML(n.fonte)} · ${tempoRelativo(n.publicadoEm)}</span>
        </div>
      </div>`;
  }

  async function renderTempoReal() {
    const el = document.querySelector("#realtime-slot");
    if (!el) return;
    try {
      const itens = await fetchJSON("/api/tempo-real");
      el.innerHTML = itens.length
        ? itens.map(realtimeItemHTML).join("")
        : `<p class="busca-vazia">Nenhuma notícia em tempo real disponível no momento.</p>`;
    } catch (err) {
      el.innerHTML = `<p class="busca-vazia">Não foi possível carregar notícias em tempo real.</p>`;
    }
  }

  function initTempoReal() {
    if (!document.querySelector("#realtime-slot")) return;
    renderTempoReal();
    setInterval(renderTempoReal, 60000);
  }

  // ---------------- Página inicial ----------------
  // Recarrega o destaque, os slides das editorias e "mais lidas" — chamada tanto na
  // carga inicial quanto pelo loop de atualização automática a cada 3 minutos.
  async function carregarHome() {
    const heroEl = document.querySelector("#hero-slot");
    const gridEl = document.querySelector("#grid-slot");
    if (!heroEl) return;
    try {
      const noticias = await fetchJSON("/api/noticias");
      if (!noticias.length) {
        heroEl.innerHTML = `<p class="busca-vazia">Nenhuma notícia publicada ainda.</p>`;
        return;
      }
      const destaque = noticias.find((n) => n.destaque) || noticias[0];
      heroEl.innerHTML = heroHTML(destaque);

      // noticias já vem ordenado por publicado_em DESC, então a primeira ocorrência
      // de cada editoria é sempre a mais recente daquela editoria.
      const ultimaPorEditoria = new Map();
      noticias.forEach((n) => {
        if (n.slug !== destaque.slug && !ultimaPorEditoria.has(n.editoria)) {
          ultimaPorEditoria.set(n.editoria, n);
        }
      });
      const slides = EDITORIAS.map((e) => ultimaPorEditoria.get(e.slug)).filter(Boolean);
      gridEl.innerHTML = slides.length
        ? slides.map(slideCardHTML).join("")
        : `<p class="busca-vazia">Nenhuma outra editoria com notícias ainda.</p>`;
    } catch (err) {
      heroEl.innerHTML = `<p class="busca-vazia">Erro ao carregar notícias: ${err.message}</p>`;
    }
    renderMaisLidas();
  }

  async function initHome() {
    if (!document.querySelector("#hero-slot")) return;
    await carregarHome();
    initSliderNav();
    setInterval(carregarHome, 3 * 60 * 1000);
  }

  function initSliderNav() {
    const track = document.querySelector("#grid-slot");
    const prev = document.querySelector(".slider-prev");
    const next = document.querySelector(".slider-next");
    if (!track || !prev || !next) return;
    const passo = () => track.querySelector(".slide-card")?.offsetWidth + 16 || 276;
    const noFim = () => track.scrollLeft + track.clientWidth >= track.scrollWidth - 4;

    function avancar() {
      if (noFim()) track.scrollTo({ left: 0, behavior: "smooth" });
      else track.scrollBy({ left: passo(), behavior: "smooth" });
    }

    let timer = setInterval(avancar, 5000);
    const pausar = () => clearInterval(timer);
    const retomar = () => { clearInterval(timer); timer = setInterval(avancar, 5000); };

    prev.addEventListener("click", () => { track.scrollBy({ left: -passo(), behavior: "smooth" }); retomar(); });
    next.addEventListener("click", () => { avancar(); retomar(); });
    track.addEventListener("mouseenter", pausar);
    track.addEventListener("mouseleave", retomar);
    track.addEventListener("touchstart", pausar, { passive: true });
    document.addEventListener("visibilitychange", () => {
      if (document.hidden) pausar();
      else retomar();
    });
  }

  // ---------------- Página de notícia ----------------
  async function initArticle() {
    const root = document.querySelector("#article-root");
    if (!root) return;
    const slug = new URLSearchParams(window.location.search).get("slug");
    if (!slug) {
      root.innerHTML = `<p class="busca-vazia">Notícia não especificada.</p>`;
      return;
    }
    let n;
    try {
      n = await fetchJSON(`/api/noticias/${encodeURIComponent(slug)}`);
    } catch (err) {
      root.innerHTML = `<p class="busca-vazia">${err.message}</p>`;
      return;
    }
    document.title = `${n.titulo} — Cais`;

    document.querySelector("#article-header").innerHTML = `
      ${tagHTML(n.editoria)}
      <h1>${n.titulo}</h1>
      <p class="article-linha">${n.linha}</p>
      <div class="article-meta">
        <span>${formatDataCurta(n.publicado_em)}</span>
        <span>${n.tempo_leitura} min de leitura</span>
        <button type="button" class="icon-btn dark-toggle" title="Alternar modo escuro">🌙</button>
        <button type="button" class="share-btn" id="btn-modo-leitura">📖 Modo leitura</button>
      </div>`;

    document.querySelector("#article-resumo30s").innerHTML = `
      <h2>Resumo em 30 segundos</h2>
      <ul>${n.resumo30s.map((item) => `<li>${item}</li>`).join("")}</ul>`;

    document.querySelector("#article-media").innerHTML = mediaHTML(n.imagem_cor, n.imagem_url);
    document.querySelector("#article-video").innerHTML = videoEmbedHTML(n.video_url);

    // corpo já vem como array de blocos HTML completos (<p>, <h2>, <ul>...), gerados pelo editor.
    const bodyEl = document.querySelector("#article-body");
    bodyEl.innerHTML = n.corpo.join("");

    document.querySelector("#article-transparencia").innerHTML = `
      <h3>Transparência: de onde vem esta informação</h3>
      <ul>${n.fontes.map((f) => `<li>${f}</li>`).join("")}</ul>`;

    document.getElementById("btn-modo-leitura").addEventListener("click", () => {
      bodyEl.classList.toggle("modo-leitura");
      document.querySelector("#article-media").classList.toggle("visually-hidden");
    });

    document.querySelectorAll(".dark-toggle").forEach((btn) =>
      btn.addEventListener("click", () => {
        const isDark = !document.documentElement.classList.contains("dark");
        document.documentElement.classList.toggle("dark", isDark);
        localStorage.setItem("cais-theme", isDark ? "dark" : "light");
      })
    );

    initShare(n);
    initAudioNoticia(n);
    initComentarios();
    renderMaisLidas();
  }

  // ---------------- Áudio da matéria (arquivo gerado no servidor) ----------------
  async function initAudioNoticia(n) {
    const container = document.querySelector("#article-audio");
    if (!container) return;
    container.innerHTML = `
      <h3>🔊 Ouça esta matéria</h3>
      <p class="form-msg">Gerando áudio…</p>`;
    try {
      const { url } = await fetchJSON(`/api/noticias/${encodeURIComponent(n.slug)}/audio`);
      container.innerHTML = `
        <h3>🔊 Ouça esta matéria</h3>
        <audio controls preload="none" src="${escapeHTML(url)}">
          Seu navegador não tem suporte a áudio. <a href="${escapeHTML(url)}">Baixar áudio</a>.
        </audio>`;
    } catch (err) {
      container.innerHTML = `
        <h3>🔊 Ouça esta matéria</h3>
        <p class="form-msg erro">Não foi possível gerar o áudio desta matéria.</p>`;
    }
  }

  function initShare(n) {
    const container = document.querySelector("#article-share");
    if (!container) return;
    const url = window.location.href;
    container.innerHTML = `
      <button type="button" class="share-btn" data-share="nativo">🔗 Compartilhar</button>
      <button type="button" class="share-btn" data-share="whatsapp">WhatsApp</button>
      <button type="button" class="share-btn" data-share="twitter">X / Twitter</button>
      <span class="form-msg ok" id="share-msg"></span>`;

    container.querySelector('[data-share="nativo"]').addEventListener("click", async () => {
      const msg = container.querySelector("#share-msg");
      if (navigator.share) {
        try {
          await navigator.share({ title: n.titulo, text: n.linha, url });
        } catch {
          /* usuário cancelou o compartilhamento */
        }
      } else {
        await navigator.clipboard.writeText(url);
        msg.textContent = "Link copiado!";
        setTimeout(() => (msg.textContent = ""), 2500);
      }
    });
    container.querySelector('[data-share="whatsapp"]').addEventListener("click", () => {
      window.open(`https://wa.me/?text=${encodeURIComponent(n.titulo + " — " + url)}`, "_blank", "noopener");
    });
    container.querySelector('[data-share="twitter"]').addEventListener("click", () => {
      window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(n.titulo)}&url=${encodeURIComponent(url)}`, "_blank", "noopener");
    });
  }

  // Comentários ficam apenas em memória nesta demo (não há tabela para eles).
  function initComentarios() {
    const form = document.querySelector("#comentario-form");
    const lista = document.querySelector("#comentarios-lista");
    if (!form || !lista) return;
    form.addEventListener("submit", (e) => {
      e.preventDefault();
      const nome = form.querySelector("[name=nome]").value.trim() || "Leitor anônimo";
      const texto = form.querySelector("[name=texto]").value.trim();
      if (!texto) return;
      const item = document.createElement("div");
      item.className = "comentario-item";
      item.innerHTML = `<span class="autor">${nome}</span><span class="status">Aguardando moderação</span><p>${texto}</p>`;
      lista.prepend(item);
      form.reset();
    });
  }

  // ---------------- Página de busca ----------------
  function initSearch() {
    const form = document.querySelector("#busca-form");
    if (!form) return;
    const resultadosEl = document.querySelector("#busca-resultados");
    const selectEditoria = form.querySelector("[name=editoria]");
    selectEditoria.innerHTML =
      `<option value="">Todas as editorias</option>` +
      EDITORIAS.map((e) => `<option value="${e.slug}">${e.nome}</option>`).join("");

    async function executarBusca() {
      const params = new URLSearchParams(new FormData(form));
      [...params.keys()].forEach((k) => { if (!params.get(k)) params.delete(k); });
      resultadosEl.innerHTML = `<p class="busca-vazia">Buscando...</p>`;
      try {
        const noticias = await fetchJSON(`/api/noticias?${params.toString()}`);
        resultadosEl.innerHTML = noticias.length
          ? noticias.map(cardHTML).join("")
          : `<p class="busca-vazia">Nenhuma notícia encontrada para estes filtros.</p>`;
      } catch (err) {
        resultadosEl.innerHTML = `<p class="busca-vazia">${err.message}</p>`;
      }
      history.replaceState(null, "", `busca.html?${params.toString()}`);
    }

    const urlParams = new URLSearchParams(window.location.search);
    for (const [k, v] of urlParams.entries()) {
      const field = form.querySelector(`[name=${k}]`);
      if (field) field.value = v;
    }

    form.addEventListener("submit", (e) => {
      e.preventDefault();
      executarBusca();
    });
    executarBusca();
  }

  document.addEventListener("DOMContentLoaded", () => {
    initHeader();
    initTicker();
    initNewsletterForms();
    initHome();
    initTempoReal();
    initArticle();
    initSearch();
  });
})();
