/* ============================================================
   Charraiá do Theo — admin panel
   Access: admin.html?key=YOUR_ADMIN_KEY
   ============================================================ */
(function () {
  "use strict";

  let adminData = null;

  function getKey() {
    return new URLSearchParams(window.location.search).get("key") || "";
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

  function showGate() {
    document.getElementById("admin-loading").hidden = true;
    document.getElementById("admin-gate").hidden = false;
    document.getElementById("admin-app").hidden = true;
  }

  function showApp() {
    document.getElementById("admin-loading").hidden = true;
    document.getElementById("admin-gate").hidden = true;
    document.getElementById("admin-app").hidden = false;
  }

  function renderSummary(summary) {
    const el = document.getElementById("admin-summary");
    const stats = [
      { num: summary.confirmations, label: "Confirmações" },
      { num: summary.totalGuests, label: "Pessoas no total" },
      { num: summary.pixCount, label: "PIX" },
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
            const gift = r.giftMode === "pix"
              ? '<span class="pix-chip">PIX 🤍</span>'
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
      const gift = r.giftMode === "pix" ? "PIX 🤍" : escapeHtml(r.giftsLabel || "—");
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
      const gift = r.giftMode === "pix" ? "PIX" : (r.giftsLabel || "");
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

  async function load() {
    const key = getKey();
    if (!key) {
      showGate();
      return;
    }

    if (!window.__charraiaApi || !window.__charraiaApi.isConfigured()) {
      document.getElementById("admin-loading").textContent =
        "API não configurada. Cole a URL do Apps Script em api-client.js (veja SETUP.md).";
      return;
    }

    document.getElementById("admin-loading").hidden = false;
    document.getElementById("admin-gate").hidden = true;
    document.getElementById("admin-app").hidden = true;

    try {
      const data = await window.__charraiaApi.loadAdminData(key);
      if (!data.ok) {
        showGate();
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
      document.getElementById("admin-loading").textContent =
        "Erro ao carregar. Verifique a conexão e a URL da API.";
    }
  }

  document.getElementById("admin-refresh").addEventListener("click", load);
  document.getElementById("admin-export").addEventListener("click", exportCsv);

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", load);
  } else {
    load();
  }
})();
