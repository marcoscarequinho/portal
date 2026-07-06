(function () {
  "use strict";

  const btn = document.querySelector(".dark-toggle");
  if (btn) {
    const apply = (dark) => {
      document.documentElement.classList.toggle("dark", dark);
      btn.textContent = dark ? "☀️" : "🌙";
    };
    const saved = localStorage.getItem("cais-theme");
    const prefersDark = window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches;
    apply(saved ? saved === "dark" : prefersDark);
    btn.addEventListener("click", () => {
      const isDark = !document.documentElement.classList.contains("dark");
      apply(isDark);
      localStorage.setItem("cais-theme", isDark ? "dark" : "light");
    });
  }

  if (localStorage.getItem("cais-auth-token")) {
    window.location.href = "editor.html";
  }

  document.getElementById("login-form").addEventListener("submit", async (e) => {
    e.preventDefault();
    const msg = document.getElementById("login-msg");
    msg.textContent = "";
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: document.getElementById("l-email").value,
          senha: document.getElementById("l-senha").value,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.erro || "Falha no login.");
      localStorage.setItem("cais-auth-token", data.token);
      localStorage.setItem("cais-auth-user", JSON.stringify(data.usuario));
      window.location.href = "editor.html";
    } catch (err) {
      msg.textContent = err.message;
      msg.className = "form-msg erro";
    }
  });
})();
