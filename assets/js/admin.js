(function () {
  "use strict";

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

  function getToken() {
    return localStorage.getItem("cais-auth-token");
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

  const novasEditorias = new Set();

  function montarChips(container, selecionadas, onToggle) {
    container.innerHTML = EDITORIAS.map(
      (e) => `<button type="button" class="chip-toggle ${selecionadas.has(e.slug) ? "on" : ""}" data-slug="${e.slug}">${e.nome}</button>`
    ).join("");
    container.querySelectorAll(".chip-toggle").forEach((chip) => {
      chip.addEventListener("click", () => {
        const slug = chip.dataset.slug;
        if (selecionadas.has(slug)) selecionadas.delete(slug);
        else selecionadas.add(slug);
        chip.classList.toggle("on");
        onToggle && onToggle();
      });
    });
  }

  function switchHTML(ligado) {
    return `<button type="button" class="switch-btn ${ligado ? "on" : ""}"><span class="knob"></span></button>`;
  }

  function linhaUsuario(u) {
    const tr = document.createElement("tr");
    const editoriasSet = new Set(u.permissoes?.editorias || []);
    tr.innerHTML = `
      <td>${u.nome}</td>
      <td>${u.email}</td>
      <td><span class="pill role-${u.role}">${u.role === "admin" ? "Admin" : "Editor"}</span></td>
      <td class="cel-publicar"></td>
      <td class="cel-editorias"></td>
      <td class="cel-ativo"></td>`;

    if (u.role === "admin") {
      tr.querySelector(".cel-publicar").innerHTML = `<span class="pill ativo-sim">Total</span>`;
      tr.querySelector(".cel-editorias").innerHTML = `<span class="pill role-admin">Todas</span>`;
      tr.querySelector(".cel-ativo").innerHTML = `<span class="pill ativo-sim">Sim</span>`;
      return tr;
    }

    const celPublicar = tr.querySelector(".cel-publicar");
    celPublicar.innerHTML = switchHTML(!!u.permissoes?.publicar);
    celPublicar.querySelector(".switch-btn").addEventListener("click", async (e) => {
      const ligado = !e.currentTarget.classList.contains("on");
      const novasPermissoes = { ...u.permissoes, publicar: ligado };
      await atualizarUsuario(u, { permissoes: novasPermissoes }, tr);
    });

    const celEditorias = tr.querySelector(".cel-editorias");
    celEditorias.innerHTML = `<div class="editorias-chips"></div>`;
    montarChips(celEditorias.querySelector(".editorias-chips"), editoriasSet, async () => {
      const novasPermissoes = { ...u.permissoes, editorias: [...editoriasSet] };
      await atualizarUsuario(u, { permissoes: novasPermissoes }, tr, false);
    });

    const celAtivo = tr.querySelector(".cel-ativo");
    celAtivo.innerHTML = switchHTML(u.ativo);
    celAtivo.querySelector(".switch-btn").addEventListener("click", async (e) => {
      const ligado = !e.currentTarget.classList.contains("on");
      await atualizarUsuario(u, { ativo: ligado }, tr);
    });

    return tr;
  }

  async function atualizarUsuario(u, patch, tr, recarregarLinha = true) {
    try {
      const atualizado = await apiFetch(`/api/auth/usuarios/${u.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(patch),
      });
      Object.assign(u, atualizado);
      if (recarregarLinha) tr.replaceWith(linhaUsuario(u));
    } catch (err) {
      alert(err.message);
    }
  }

  async function carregarUsuarios() {
    const tbody = document.getElementById("tabela-usuarios");
    try {
      const usuarios = await apiFetch("/api/auth/usuarios");
      tbody.innerHTML = "";
      usuarios.forEach((u) => tbody.appendChild(linhaUsuario(u)));
    } catch (err) {
      tbody.innerHTML = `<tr><td colspan="6">${err.message}</td></tr>`;
    }
  }

  async function verificarAcesso() {
    if (!getToken()) {
      window.location.href = "login.html";
      return false;
    }
    try {
      const me = await apiFetch("/api/auth/me");
      if (me.role !== "admin") {
        window.location.href = "editor.html";
        return false;
      }
      document.getElementById("user-info").textContent = `${me.nome} (admin)`;
      return true;
    } catch {
      return false;
    }
  }

  document.addEventListener("DOMContentLoaded", async () => {
    initTheme();
    if (!(await verificarAcesso())) return;

    montarChips(document.getElementById("n-editorias-chips"), novasEditorias);
    carregarUsuarios();

    document.getElementById("btn-logout").addEventListener("click", () => {
      localStorage.removeItem("cais-auth-token");
      localStorage.removeItem("cais-auth-user");
      window.location.href = "login.html";
    });

    document.getElementById("form-novo-editor").addEventListener("submit", async (e) => {
      e.preventDefault();
      const msg = document.getElementById("novo-editor-msg");
      try {
        await apiFetch("/api/auth/usuarios", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            nome: document.getElementById("n-nome").value.trim(),
            email: document.getElementById("n-email").value.trim(),
            senha: document.getElementById("n-senha").value,
            permissoes: { publicar: document.getElementById("n-publicar").checked, editorias: [...novasEditorias] },
          }),
        });
        msg.textContent = "Editor criado com sucesso.";
        msg.className = "editor-save-msg ok";
        document.getElementById("form-novo-editor").reset();
        novasEditorias.clear();
        montarChips(document.getElementById("n-editorias-chips"), novasEditorias);
        carregarUsuarios();
      } catch (err) {
        msg.textContent = err.message;
        msg.className = "editor-save-msg erro";
      }
    });
  });
})();
