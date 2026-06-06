/* ============================================================
   Charraiá do Theo — admin panel
   Access: admin.html (senha na tela de login)
   ============================================================ */
(function () {
  "use strict";

  const ADMIN_PASSWORD = "xadotheo";
  const API_ADMIN_KEY = "charraia-theo-2026";
  const SESSION_KEY = "charraia_admin_ok";

  let adminData = null;

  function isLoggedIn() {
    return sessionStorage.getItem(SESSION_KEY) === "1";
  }

  function setLoggedIn() {
    sessionStorage.setItem(SESSION_KEY, "1");
  }

  function formatDate(iso) {
    if (!iso) return "—";
    const d = new Date(iso);
    if (isNaN(d.getTime())) return iso;
    const pad = (n) => String(n).padStart(2, "0");
    return pad(d.getDate()) + "/" + pad(d.getMonth() + 1) + " " +
      pad(d.getHours()) + ":" + pad(d.getMinutes());
  }

  function escapeHtml(s) {
    return String(s || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function showLogin(showError) {
    document.getElementById("admin-loading").hidden = true;
    document.getElementById("admin-login").hidden = false;
    document.getElementById("admin-app").hidden = true;
    const err = document.getElementById("admin-login-error");
    if (err) err.hidden = !showError;
  }

  function showApp() {
    document.getElementById("admin-loading").hidden = true;
    document.getElementById("admin-login").hidden = true;
    document.getElementById("admin-app").hidden = false;
  }

  function renderSummary(summary) {
    const el = document.getElementById("admin-summary");
    const stats = [
      { num: summary.confirmations, label: "Confirmações" },
      { num: summary.totalGuests, label: "Pessoas no total" },
      { num: summary.emailCount != null ? summary.emailCount : summary.pixCount, label: "E-mail" },
      { num: summary.giftsReserved, label: "Itens reservados" },
    ];
    el.innerHTML = stats.map((s) =>
      `<div class="admin-stat">
        <div class="admin-stat-num">${s.num}</div>
        <div class="admin-stat-label">${s.label}</div>
      </div>`
    ).join("");
  }

  function renderRows(rows) {
    const tableWrap = document.getElementById("admin-rows-table");
    const cards = document.getElementById("admin-rows-cards");

    if (!rows.length) {
      tableWrap.innerHTML = '<p class="admin-empty">Nenhuma confirmação ainda.</p>';
      cards.innerHTML = "";
      return;
    }

    tableWrap.className = "admin-table-wrap admin-table-wrap--rows";
    tableWrap.innerHTML =
      `<table class="admin-table">
        <thead>
          <tr>
            <th>Nome</th>
            <th>Vêm</th>
            <th>Dieta</th>
            <th>Presente</th>
            <th>Quando</th>
          </tr>
        </thead>
        <tbody>
          ${rows.map((r) => {
            const diet = r.diet ? escapeHtml(r.diet) : "—";
            const gift = (r.giftMode === "pix" || r.giftMode === "email")
              ? '<span class="pix-chip">E-mail 🤍</span>'
              : escapeHtml(r.giftsLabel || "—");
            return `<tr>
              <td>${escapeHtml(r.name)}</td>
              <td>${r.guests}</td>
              <td>${diet}</td>
              <td>${gift}</td>
              <td>${formatDate(r.createdAt)}</td>
            </tr>`;
          }).join("")}
        </tbody>
      </table>`;

    cards.innerHTML = rows.map((r) => {
      const diet = r.diet ? escapeHtml(r.diet) : "—";
      const gift = (r.giftMode === "pix" || r.giftMode === "email") ? "E-mail 🤍" : escapeHtml(r.giftsLabel || "—");
      return `<article class="admin-card">
        <div class="admin-card-name">${escapeHtml(r.name)}</div>
        <div class="admin-card-row"><b>Vêm:</b> ${r.guests}</div>
        <div class="admin-card-row"><b>Dieta:</b> ${diet}</div>
        <div class="admin-card-row"><b>Presente:</b> ${gift}</div>
        <div class="admin-card-row"><b>Quando:</b> ${formatDate(r.createdAt)}</div>
      </article>`;
    }).join("");
  }

  function renderStock(stock) {
    const el = document.getElementById("admin-stock-table");
    if (!stock || !stock.length) {
      el.innerHTML = '<p class="admin-empty">Sem dados de estoque.</p>';
      return;
    }
    el.innerHTML =
      `<table class="admin-table">
        <thead>
          <tr>
            <th>Item</th>
            <th>Pegos</th>
            <th>Restam</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
          ${stock.map((s) => {
            const status = s.soldOut
              ? '<span class="sold-out">Esgotado</span>'
              : '<span class="ok-stock">OK</span>';
            return `<tr>
              <td>${escapeHtml(s.name)}</td>
              <td>${s.claimed}</td>
              <td>${s.remaining}</td>
              <td>${status}</td>
            </tr>`;
          }).join("")}
        </tbody>
      </table>`;
  }

  function exportCsv() {
    if (!adminData || !adminData.rows) return;
    const header = ["Nome", "Vêm", "Dieta", "Presente", "Quando"];
    const lines = [header.join(";")];
    adminData.rows.forEach((r) => {
      const gift = (r.giftMode === "pix" || r.giftMode === "email") ? "E-mail" : (r.giftsLabel || "");
      const row = [
        r.name,
        r.guests,
        r.diet || "",
        gift,
        r.createdAt || "",
      ].map((c) => '"' + String(c).replace(/"/g, '""') + '"');
      lines.push(row.join(";"));
    });
    const bom = "\uFEFF";
    const blob = new Blob([bom + lines.join("\n")], { type: "text/csv;charset=utf-8" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "charraia-confirmados.csv";
    a.click();
    URL.revokeObjectURL(a.href);
  }

  async function loadData() {
    if (!window.__charraiaApi || !window.__charraiaApi.isConfigured()) {
      document.getElementById("admin-loading").hidden = false;
      document.getElementById("admin-login").hidden = true;
      document.getElementById("admin-app").hidden = true;
      document.getElementById("admin-loading").textContent =
        "API não configurada. Cole a URL do Apps Script em api-client.js (veja SETUP.md).";
      return;
    }

    document.getElementById("admin-loading").hidden = false;
    document.getElementById("admin-login").hidden = true;
    document.getElementById("admin-app").hidden = true;

    try {
      const data = await window.__charraiaApi.loadAdminData(API_ADMIN_KEY);
      if (!data.ok) {
        showLogin(false);
        return;
      }
      adminData = data;
      renderSummary(data.summary);
      renderRows(data.rows || []);
      renderStock(data.stock || []);

      const sheetLink = document.getElementById("admin-sheet-link");
      if (data.sheetUrl) {
        sheetLink.href = data.sheetUrl;
        sheetLink.hidden = false;
      }

      showApp();
    } catch (e) {
      document.getElementById("admin-loading").hidden = false;
      document.getElementById("admin-login").hidden = true;
      document.getElementById("admin-app").hidden = true;
      document.getElementById("admin-loading").textContent =
        "Erro ao carregar. Verifique a conexão e a URL da API.";
    }
  }

  function init() {
    const form = document.getElementById("admin-login-form");
    form.addEventListener("submit", (e) => {
      e.preventDefault();
      const input = document.getElementById("admin-password");
      const pwd = (input && input.value) || "";
      if (pwd !== ADMIN_PASSWORD) {
        showLogin(true);
        if (input) {
          input.focus();
          input.select();
        }
        return;
      }
      setLoggedIn();
      if (input) input.value = "";
      loadData();
    });

    document.getElementById("admin-refresh").addEventListener("click", loadData);
    document.getElementById("admin-export").addEventListener("click", exportCsv);

    if (isLoggedIn()) {
      loadData();
    } else {
      showLogin(false);
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
