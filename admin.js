/* ============================================================
   Charraiá do Theo — admin panel
   Access: admin.html (senha na tela de login)
   ============================================================ */
(function () {
  "use strict";

  const ADMIN_PASSWORD = "xadotheo";
  /** Must match ADMIN_KEY in google-apps-script/Code.gs */
  const API_ADMIN_KEY = "charraia-theo-2026";
  const SESSION_KEY = "charraia_admin_ok";

  let adminData = null;
  let editingRow = null;
  /** @type {Record<string, number>} */
  let editOriginalGifts = {};
  /** @type {Record<string, number>} */
  let editPickedGifts = {};

  function isEmailGiftMode(mode) {
    return window.__charraiaShared
      ? window.__charraiaShared.isEmailGiftMode(mode)
      : mode === "email" || mode === "pix";
  }

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

  function getGiftPixLabel() {
    return window.__charraiaShared
      ? window.__charraiaShared.getGiftPixLabel()
      : "PIX (email) 🤍";
  }

  function formatGiftDisplay(row, asHtml) {
    if (isEmailGiftMode(row.giftMode)) {
      const label = row.giftsLabel || getGiftPixLabel();
      return asHtml
        ? '<span class="email-chip">' + escapeHtml(label) + "</span>"
        : label;
    }
    const label = row.giftsLabel || "—";
    return asHtml ? escapeHtml(label) : label;
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
      { num: summary.emailCount || 0, label: "PIX (email)" },
      { num: summary.giftsReserved, label: "Itens reservados" },
    ];
    el.innerHTML = stats.map((s) =>
      `<div class="admin-stat">
        <div class="admin-stat-num">${s.num}</div>
        <div class="admin-stat-label">${s.label}</div>
      </div>`
    ).join("");
  }

  function rowActionsHtml(r) {
    const id = escapeHtml(r.id || "");
    const name = escapeHtml(r.name || "");
    return `<div class="admin-row-actions">
      <button type="button" class="admin-btn admin-btn--edit" data-action="edit" data-id="${id}">Editar</button>
      <button type="button" class="admin-btn admin-btn--delete" data-action="delete" data-id="${id}" data-name="${name}">Apagar</button>
    </div>`;
  }

  function findRowById(id) {
    return (adminData && adminData.rows || []).find((r) => r.id === id) || null;
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
            <th></th>
          </tr>
        </thead>
        <tbody>
          ${rows.map((r) => {
            const diet = r.diet ? escapeHtml(r.diet) : "—";
            return `<tr>
              <td>${escapeHtml(r.name)}</td>
              <td>${r.guests}</td>
              <td>${diet}</td>
              <td>${formatGiftDisplay(r, true)}</td>
              <td>${formatDate(r.createdAt)}</td>
              <td class="admin-table-actions">${rowActionsHtml(r)}</td>
            </tr>`;
          }).join("")}
        </tbody>
      </table>`;

    cards.innerHTML = rows.map((r) => {
      const diet = r.diet ? escapeHtml(r.diet) : "—";
      return `<article class="admin-card">
        <div class="admin-card-head">
          <div class="admin-card-name">${escapeHtml(r.name)}</div>
          ${rowActionsHtml(r)}
        </div>
        <div class="admin-card-row"><b>Vêm:</b> ${r.guests}</div>
        <div class="admin-card-row"><b>Dieta:</b> ${diet}</div>
        <div class="admin-card-row"><b>Presente:</b> ${formatGiftDisplay(r, false)}</div>
        <div class="admin-card-row"><b>Quando:</b> ${formatDate(r.createdAt)}</div>
      </article>`;
    }).join("");
  }

  function getCatalogGifts() {
    const catalog = window.__charraiaCatalog;
    return (catalog && catalog.GIFTS) || [];
  }

  function getGiftMeta(id) {
    return getCatalogGifts().find((g) => g.id === id) || null;
  }

  function getStockRemaining(giftId) {
    const stock = (adminData && adminData.stock) || [];
    const row = stock.find((s) => s.id === giftId);
    return row ? row.remaining : 0;
  }

  function getMaxQtyForEdit(giftId) {
    const meta = getGiftMeta(giftId);
    if (!meta) return 0;
    return getStockRemaining(giftId) + (editOriginalGifts[giftId] || 0);
  }

  function isListaEditMode() {
    const modeEl = document.querySelector('input[name="edit-gift-mode"]:checked');
    return modeEl ? modeEl.value === "lista" : true;
  }

  function syncEditPickedFromRow(row) {
    editOriginalGifts = {};
    editPickedGifts = {};
    (row.gifts || []).forEach((g) => {
      if (!g.id || g.id === "pix") return;
      const qty = parseInt(g.quantity, 10) || 0;
      if (qty <= 0) return;
      editOriginalGifts[g.id] = qty;
      editPickedGifts[g.id] = qty;
    });
  }

  function collectEditGiftsForSubmit() {
    return Object.keys(editPickedGifts)
      .filter((id) => (editPickedGifts[id] || 0) > 0)
      .map((id) => {
        const meta = getGiftMeta(id);
        return {
          id,
          name: meta ? meta.name : id,
          quantity: editPickedGifts[id],
        };
      });
  }

  function renderEditGiftAddSelect() {
    const select = document.getElementById("edit-gift-add-select");
    if (!select) return;
    const options = ['<option value="">Escolher presente…</option>'];
    getCatalogGifts().forEach((g) => {
      const max = getMaxQtyForEdit(g.id);
      const picked = editPickedGifts[g.id] || 0;
      if (max <= picked) return;
      options.push(
        `<option value="${escapeHtml(g.id)}">${escapeHtml(g.name)} (${max - picked} disp.)</option>`
      );
    });
    select.innerHTML = options.join("");
  }

  function renderEditGiftsList() {
    const list = document.getElementById("edit-gifts-list");
    const panel = document.getElementById("edit-gifts-panel");
    const note = document.getElementById("edit-gifts-note");
    if (!list || !panel) return;

    if (!isListaEditMode()) {
      panel.hidden = true;
      if (note) {
        note.hidden = false;
        note.textContent = "Será registrado como " + getGiftPixLabel() + ".";
      }
      return;
    }

    panel.hidden = false;
    if (note) note.hidden = true;

    const ids = Object.keys(editPickedGifts).filter((id) => (editPickedGifts[id] || 0) > 0);
    if (!ids.length) {
      list.innerHTML = '<p class="admin-edit-gifts-empty">Nenhum item da lista. Adicione abaixo.</p>';
      renderEditGiftAddSelect();
      return;
    }

    list.innerHTML = ids.map((id) => {
      const meta = getGiftMeta(id);
      const name = meta ? meta.name : id;
      const qty = editPickedGifts[id];
      const max = getMaxQtyForEdit(id);
      return `<div class="admin-edit-gift-row" data-gift-id="${escapeHtml(id)}">
        <div class="admin-edit-gift-name">
          ${escapeHtml(name)}
          <span class="admin-edit-gift-stock">máx. ${max}</span>
        </div>
        <div class="admin-edit-gift-qty">
          <button type="button" data-gift-step="-1" data-gift-id="${escapeHtml(id)}" aria-label="Menos">−</button>
          <span>${qty}</span>
          <button type="button" data-gift-step="1" data-gift-id="${escapeHtml(id)}" aria-label="Mais">+</button>
        </div>
        <button type="button" class="admin-btn admin-btn--delete" data-gift-remove="${escapeHtml(id)}">Remover</button>
      </div>`;
    }).join("");

    renderEditGiftAddSelect();
  }

  function setEditGiftQty(giftId, qty) {
    const max = getMaxQtyForEdit(giftId);
    const next = Math.min(max, Math.max(0, qty));
    if (next <= 0) {
      delete editPickedGifts[giftId];
    } else {
      editPickedGifts[giftId] = next;
    }
    renderEditGiftsList();
  }

  function addEditGiftFromSelect() {
    const select = document.getElementById("edit-gift-add-select");
    if (!select || !select.value) return;
    const id = select.value;
    const current = editPickedGifts[id] || 0;
    const max = getMaxQtyForEdit(id);
    if (current >= max) return;
    editPickedGifts[id] = current + 1;
    select.value = "";
    renderEditGiftsList();
  }

  function handleEditGiftClick(e) {
    const removeBtn = e.target.closest("[data-gift-remove]");
    if (removeBtn) {
      delete editPickedGifts[removeBtn.dataset.giftRemove];
      renderEditGiftsList();
      return;
    }
    const stepBtn = e.target.closest("[data-gift-step]");
    if (!stepBtn) return;
    const id = stepBtn.dataset.giftId;
    const step = parseInt(stepBtn.dataset.giftStep, 10) || 0;
    setEditGiftQty(id, (editPickedGifts[id] || 0) + step);
  }

  function openEditModal(row) {
    editingRow = row;
    syncEditPickedFromRow(row);
    document.getElementById("edit-rsvp-id").value = row.id || "";
    document.getElementById("edit-name").value = row.name || "";
    document.getElementById("edit-guests").value = row.guests || 1;
    document.getElementById("edit-diet").value = row.diet || "";
    const mode = isEmailGiftMode(row.giftMode) ? "email" : "lista";
    document.querySelectorAll('input[name="edit-gift-mode"]').forEach((el) => {
      el.checked = el.value === mode;
    });
    const err = document.getElementById("edit-error");
    if (err) err.hidden = true;
    renderEditGiftsList();
    document.getElementById("admin-edit-modal").hidden = false;
    document.getElementById("edit-name").focus();
  }

  function closeEditModal() {
    editingRow = null;
    editOriginalGifts = {};
    editPickedGifts = {};
    document.getElementById("admin-edit-modal").hidden = true;
  }

  async function deleteRow(id, name) {
    const label = name ? '"' + name + '"' : "esta confirmação";
    if (!window.confirm("Apagar " + label + "? Os presentes voltam para a lista.")) return;

    try {
      const result = await window.__charraiaApi.deleteRsvp(id, API_ADMIN_KEY);
      if (!result.ok) {
        window.alert(result.message || "Não foi possível apagar.");
        return;
      }
      await loadData();
    } catch (e) {
      window.alert("Erro ao apagar. Verifique a conexão e se o Code.gs foi republicado.");
    }
  }

  async function saveEdit(e) {
    e.preventDefault();
    const err = document.getElementById("edit-error");
    const id = document.getElementById("edit-rsvp-id").value;
    const name = document.getElementById("edit-name").value.trim();
    const guests = parseInt(document.getElementById("edit-guests").value, 10) || 1;
    const diet = document.getElementById("edit-diet").value.trim();
    const modeEl = document.querySelector('input[name="edit-gift-mode"]:checked');
    const giftMode = modeEl ? modeEl.value : "lista";

    if (!name) {
      if (err) {
        err.textContent = "Nome obrigatório.";
        err.hidden = false;
      }
      return;
    }

    const gifts = giftMode === "lista" ? collectEditGiftsForSubmit() : [];

    try {
      const result = await window.__charraiaApi.updateRsvp({
        id,
        name,
        guests,
        diet,
        giftMode,
        gifts,
        key: API_ADMIN_KEY,
      });
      if (!result.ok) {
        if (err) {
          err.textContent = result.message || "Não foi possível salvar.";
          err.hidden = false;
        }
        return;
      }
      closeEditModal();
      await loadData();
    } catch (e) {
      if (err) {
        err.textContent = "Erro ao salvar. Verifique a conexão e se o Code.gs foi republicado.";
        err.hidden = false;
      }
    }
  }

  function handleRowAction(e) {
    const btn = e.target.closest("[data-action]");
    if (!btn) return;
    const action = btn.dataset.action;
    const id = btn.dataset.id;
    if (!id) return;

    if (action === "delete") {
      deleteRow(id, btn.dataset.name || "");
      return;
    }
    if (action === "edit") {
      const row = findRowById(id);
      if (row) openEditModal(row);
    }
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
      const row = [
        r.name,
        r.guests,
        r.diet || "",
        formatGiftDisplay(r, false),
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
        if (data.error === "unauthorized") {
          document.getElementById("admin-loading").hidden = true;
          showLogin(true);
          const err = document.getElementById("admin-login-error");
          if (err) {
            err.textContent = "Não foi possível carregar os dados. Verifique se o Code.gs foi republicado.";
            err.hidden = false;
          }
          return;
        }
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
    document.getElementById("admin-rows-table").addEventListener("click", handleRowAction);
    document.getElementById("admin-rows-cards").addEventListener("click", handleRowAction);
    document.getElementById("admin-edit-form").addEventListener("submit", saveEdit);
    document.querySelectorAll("[data-close-modal]").forEach((el) => {
      el.addEventListener("click", closeEditModal);
    });
    document.querySelectorAll('input[name="edit-gift-mode"]').forEach((el) => {
      el.addEventListener("change", renderEditGiftsList);
    });
    document.getElementById("edit-gifts-list").addEventListener("click", handleEditGiftClick);
    document.getElementById("edit-gift-add-btn").addEventListener("click", addEditGiftFromSelect);

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
