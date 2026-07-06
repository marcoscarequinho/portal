// Cais — painel de edição (CMS). Editor de corpo em contentEditable com toolbar própria.
(function () {
  "use strict";

  const EDITORIA_MAP = Object.fromEntries(EDITORIAS.map((e) => [e.slug, e]));
  let currentSlug = null; // null = criando notícia nova
  let usuarioAtual = null;
  let imagemUrlAtual = null;

  // ---------------- Tema ----------------
  function initTheme() {
    const btn = document.querySelector(".dark-toggle");
    const apply = (dark) => {
      document.documentElement.classList.toggle("dark", dark);
      if (btn) btn.textContent = dark ? "☀️" : "🌙";
    };
    const saved = localStorage.getItem("cais-theme");
    const prefersDark = window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches;
    apply(saved ? saved === "dark" : prefersDark);
    btn && btn.addEventListener("click", () => {
      const isDark = !document.documentElement.classList.contains("dark");
      apply(isDark);
      localStorage.setItem("cais-theme", isDark ? "dark" : "light");
    });
  }

  // ---------------- Sessão ----------------
  function getToken() {
    return localStorage.getItem("cais-auth-token") || "";
  }

  async function apiFetch(url, options = {}) {
    const res = await fetch(url, {
      ...options,
      headers: { ...(options.headers || {}), Authorization: `Bearer ${getToken()}` },
    });
    if (res.status === 401) {
      localStorage.removeItem("cais-auth-token");
      localStorage.removeItem("cais-auth-user");
      window.location.href = "login.html";
      throw new Error("Sessão expirada.");
    }
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.erro || "Erro na requisição.");
    return data;
  }

  async function verificarAcesso() {
    if (!getToken()) {
      window.location.href = "login.html";
      return false;
    }
    try {
      usuarioAtual = await apiFetch("/api/auth/me");
    } catch {
      return false;
    }
    document.getElementById("user-info").textContent = `${usuarioAtual.nome} (${usuarioAtual.role === "admin" ? "admin" : "editor"})`;
    if (usuarioAtual.role === "admin") document.getElementById("link-admin").style.display = "";

    const aviso = document.getElementById("permissao-aviso");
    if (usuarioAtual.role !== "admin" && !usuarioAtual.permissoes?.publicar) {
      aviso.textContent = "Você não tem permissão para publicar. Só é possível editar matérias que você já publicou.";
      aviso.className = "editor-save-msg erro";
    }
    document.getElementById("btn-logout").addEventListener("click", () => {
      localStorage.removeItem("cais-auth-token");
      localStorage.removeItem("cais-auth-user");
      window.location.href = "login.html";
    });
    return true;
  }

  // ---------------- Selects e listas dinâmicas ----------------
  function initEditoriaSelect() {
    const restritas = usuarioAtual.role !== "admin" && usuarioAtual.permissoes?.editorias?.length
      ? new Set(usuarioAtual.permissoes.editorias)
      : null;
    const opcoes = restritas ? EDITORIAS.filter((e) => restritas.has(e.slug)) : EDITORIAS;
    document.getElementById("f-editoria").innerHTML = opcoes.map(
      (e) => `<option value="${e.slug}">${e.nome}</option>`
    ).join("");
  }

  function dynRow(containerId, valor) {
    const row = document.createElement("div");
    row.className = "dynlist-row";
    row.innerHTML = `<input type="text" value="${(valor || "").replace(/"/g, "&quot;")}" />
      <button type="button" class="dynlist-remove" title="Remover">×</button>`;
    row.querySelector(".dynlist-remove").addEventListener("click", () => {
      row.remove();
      atualizarPreview();
    });
    row.querySelector("input").addEventListener("input", atualizarPreview);
    document.getElementById(containerId).appendChild(row);
  }

  function setDynList(containerId, valores) {
    const el = document.getElementById(containerId);
    el.innerHTML = "";
    (valores && valores.length ? valores : [""]).forEach((v) => dynRow(containerId, v));
  }

  function getDynList(containerId) {
    return [...document.querySelectorAll(`#${containerId} input`)]
      .map((i) => i.value.trim())
      .filter(Boolean);
  }

  document.querySelectorAll(".dynlist-add").forEach((btn) =>
    btn.addEventListener("click", () => {
      dynRow(`lista-${btn.dataset.add}`, "");
    })
  );

  // ---------------- Toolbar do editor rico ----------------
  function initRTE() {
    const editor = document.getElementById("rte-editor");
    document.getElementById("rte-toolbar").addEventListener("click", (e) => {
      const btn = e.target.closest("button[data-cmd]");
      if (!btn) return;
      editor.focus();
      const cmd = btn.dataset.cmd;
      if (cmd === "createLink") {
        const url = prompt("URL do link:", "https://");
        if (url) document.execCommand(cmd, false, url);
      } else if (cmd === "formatBlock") {
        document.execCommand(cmd, false, btn.dataset.value);
      } else {
        document.execCommand(cmd, false, null);
      }
      atualizarPreview();
    });
    editor.addEventListener("input", atualizarPreview);

    document.addEventListener("selectionchange", () => {
      if (document.activeElement !== editor) return;
      document.querySelectorAll("#rte-toolbar button[data-cmd]").forEach((btn) => {
        try {
          btn.classList.toggle("active", document.queryCommandState(btn.dataset.cmd));
        } catch {
          /* comandos sem estado consultável (ex: undo/redo) */
        }
      });
    });
  }

  function corpoParaBlocos() {
    const editor = document.getElementById("rte-editor");
    return [...editor.children].map((el) => el.outerHTML);
  }

  // ---------------- Upload de imagem ----------------
  function mostrarPreviewImagem(url) {
    const wrap = document.getElementById("upload-preview");
    const img = document.getElementById("upload-preview-img");
    const selectCor = document.getElementById("f-imagem");
    const hint = document.getElementById("fallback-hint");
    if (url) {
      img.src = url;
      wrap.style.display = "";
      selectCor.disabled = true;
      hint.textContent = "Substituída pela imagem enviada.";
      hint.className = "editor-save-msg";
    } else {
      img.src = "";
      wrap.style.display = "none";
      selectCor.disabled = false;
      hint.textContent = "";
    }
  }

  function initUploadImagem() {
    const input = document.getElementById("f-imagem-upload");
    const msg = document.getElementById("upload-msg");
    input.addEventListener("change", async () => {
      const arquivo = input.files[0];
      if (!arquivo) return;
      msg.textContent = "Enviando...";
      msg.className = "editor-save-msg";
      try {
        const formData = new FormData();
        formData.append("imagem", arquivo);
        const res = await fetch("/api/upload", {
          method: "POST",
          headers: { Authorization: `Bearer ${getToken()}` },
          body: formData,
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.erro || "Falha no upload.");
        imagemUrlAtual = data.url;
        mostrarPreviewImagem(imagemUrlAtual);
        msg.textContent = "Imagem enviada.";
        msg.className = "editor-save-msg ok";
        atualizarPreview();
      } catch (err) {
        msg.textContent = err.message;
        msg.className = "editor-save-msg erro";
      } finally {
        input.value = "";
      }
    });

    document.getElementById("btn-remover-imagem").addEventListener("click", () => {
      imagemUrlAtual = null;
      mostrarPreviewImagem(null);
      atualizarPreview();
    });
  }

  // ---------------- Pré-visualização ao vivo ----------------
  function tagHTML(slug) {
    const info = EDITORIA_MAP[slug] || { nome: slug, cor: "teal" };
    return `<span class="tag tag--${info.cor}">${info.nome}</span>`;
  }

  let previewTimer = null;
  function atualizarPreview() {
    clearTimeout(previewTimer);
    previewTimer = setTimeout(() => {
      const titulo = document.getElementById("f-titulo").value || "Título da matéria";
      const linha = document.getElementById("f-linha").value || "Linha fina da matéria...";
      const editoria = document.getElementById("f-editoria").value;
      const cor = document.getElementById("f-imagem").value;
      const resumo = getDynList("lista-resumo30s");

      document.getElementById("prev-header").innerHTML = `
        ${tagHTML(editoria)}
        <h1>${titulo}</h1>
        <p class="article-linha">${linha}</p>`;

      document.getElementById("prev-resumo").innerHTML = resumo.length
        ? `<h2>Resumo em 30 segundos</h2><ul>${resumo.map((r) => `<li>${r}</li>`).join("")}</ul>`
        : "";

      document.getElementById("prev-media").innerHTML = imagemUrlAtual
        ? `<img class="media-photo" src="${imagemUrlAtual}" alt="" />`
        : `<div class="media-gradient media-${cor}" style="height:100%"></div>`;

      document.getElementById("prev-video").innerHTML = videoEmbedHTML(document.getElementById("f-video").value.trim());

      document.getElementById("prev-corpo").innerHTML = corpoParaBlocos().join("");
    }, 150);
  }

  ["f-titulo", "f-linha", "f-editoria", "f-imagem", "f-video"].forEach((id) =>
    document.getElementById(id).addEventListener("input", atualizarPreview)
  );

  // ---------------- Carregar / limpar formulário ----------------
  function limparFormulario() {
    currentSlug = null;
    document.getElementById("f-slug").value = "";
    document.getElementById("f-slug").disabled = false;
    document.getElementById("f-editoria").selectedIndex = 0;
    document.getElementById("f-imagem").selectedIndex = 0;
    document.getElementById("f-titulo").value = "";
    document.getElementById("f-linha").value = "";
    document.getElementById("f-tempo").value = 3;
    document.getElementById("f-destaque").checked = false;
    document.getElementById("f-video").value = "";
    imagemUrlAtual = null;
    mostrarPreviewImagem(null);
    document.getElementById("rte-editor").innerHTML = "<p>Escreva o corpo da matéria aqui...</p>";
    setDynList("lista-resumo30s", []);
    setDynList("lista-fontes", []);
    document.getElementById("btn-salvar").textContent = "Publicar notícia";
    document.getElementById("editor-save-msg").textContent = "";
    document.getElementById("carregar-existente").value = "";
    atualizarPreview();
  }

  async function carregarListaExistentes() {
    const select = document.getElementById("carregar-existente");
    try {
      const res = await fetch("/api/noticias");
      let noticias = await res.json();
      if (usuarioAtual.role !== "admin") {
        noticias = noticias.filter((n) => n.autor_id === usuarioAtual.id);
      }
      noticias.forEach((n) => {
        const opt = document.createElement("option");
        opt.value = n.slug;
        opt.textContent = `[${EDITORIA_MAP[n.editoria]?.nome || n.editoria}] ${n.titulo}`;
        select.appendChild(opt);
      });
    } catch {
      /* lista de notícias existentes é apenas conveniência; falha não bloqueia o editor */
    }
  }

  async function carregarNoticia(slug) {
    const res = await fetch(`/api/noticias/${encodeURIComponent(slug)}`);
    if (!res.ok) return;
    const n = await res.json();
    currentSlug = n.slug;
    document.getElementById("f-slug").value = n.slug;
    document.getElementById("f-slug").disabled = true;
    document.getElementById("f-editoria").value = n.editoria;
    document.getElementById("f-imagem").value = n.imagem_cor;
    document.getElementById("f-titulo").value = n.titulo;
    document.getElementById("f-linha").value = n.linha;
    document.getElementById("f-tempo").value = n.tempo_leitura;
    document.getElementById("f-destaque").checked = n.destaque;
    document.getElementById("f-video").value = n.video_url || "";
    imagemUrlAtual = n.imagem_url || null;
    mostrarPreviewImagem(imagemUrlAtual);
    document.getElementById("rte-editor").innerHTML = n.corpo.join("") || "<p></p>";
    setDynList("lista-resumo30s", n.resumo30s);
    setDynList("lista-fontes", n.fontes);
    document.getElementById("btn-salvar").textContent = "Salvar alterações";
    atualizarPreview();
  }

  // ---------------- Envio ----------------
  async function salvar(e) {
    e.preventDefault();
    const msg = document.getElementById("editor-save-msg");
    const slug = document.getElementById("f-slug").value.trim();
    if (!slug) {
      msg.textContent = "O slug é obrigatório.";
      msg.className = "editor-save-msg erro";
      return;
    }
    const payload = {
      slug,
      editoria: document.getElementById("f-editoria").value,
      titulo: document.getElementById("f-titulo").value.trim(),
      linha: document.getElementById("f-linha").value.trim(),
      resumo30s: getDynList("lista-resumo30s"),
      corpo: corpoParaBlocos(),
      fontes: getDynList("lista-fontes"),
      tempoLeitura: Number(document.getElementById("f-tempo").value) || 3,
      destaque: document.getElementById("f-destaque").checked,
      imagemCor: document.getElementById("f-imagem").value,
      imagemUrl: imagemUrlAtual,
      videoUrl: document.getElementById("f-video").value.trim() || null,
    };

    const editando = !!currentSlug;
    const url = editando ? `/api/noticias/${encodeURIComponent(currentSlug)}` : "/api/noticias";
    try {
      await apiFetch(url, {
        method: editando ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      msg.textContent = editando ? "Alterações salvas." : "Notícia publicada.";
      msg.className = "editor-save-msg ok";
      if (!editando) {
        currentSlug = slug;
        document.getElementById("f-slug").disabled = true;
        document.getElementById("btn-salvar").textContent = "Salvar alterações";
      }
    } catch (err) {
      msg.textContent = err.message;
      msg.className = "editor-save-msg erro";
    }
  }

  document.addEventListener("DOMContentLoaded", async () => {
    initTheme();
    if (!(await verificarAcesso())) return;

    initEditoriaSelect();
    initRTE();
    initUploadImagem();
    setDynList("lista-resumo30s", []);
    setDynList("lista-fontes", []);
    carregarListaExistentes();
    atualizarPreview();

    document.getElementById("carregar-existente").addEventListener("change", (e) => {
      if (e.target.value) carregarNoticia(e.target.value);
      else limparFormulario();
    });
    document.getElementById("btn-novo").addEventListener("click", limparFormulario);
    document.getElementById("editor-form").addEventListener("submit", salvar);
  });
})();
