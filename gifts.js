/* ============================================================
   Charraiá do Theo — gift picker (full-screen bottom sheet + e-mail)
   ============================================================ */
(function () {
  "use strict";

  const catalog = window.__charraiaCatalog || { GIFTS: [], GROUP_LABELS: {} };
  const GIFTS = catalog.GIFTS;
  const GROUP_LABELS = catalog.GROUP_LABELS;

  const GIFT_EMAIL = "taynamj@gmail.com";
  const TOTAL_GIFT_UNITS = GIFTS.reduce((s, g) => s + g.qty, 0);

  const BRANDS = {
    fralda:  "Huggies · Turma da Mônica · Babysec · Pampers",
    higiene: "Mustela · Granado · Johnson's · Dove · Huggies",
  };

  let claims = {};
  let claimsOffline = false;
  const picked = {};
  let mode = "lista";
  let filter = "all";
  let lastFocus = null;

  function stock(g) { return Math.max(0, g.qty - (claims[g.id] || 0)); }
  function remaining(g) { return Math.max(0, stock(g) - (picked[g.id] || 0)); }
  function totalPicked() { return Object.values(picked).reduce((s, n) => s + n, 0); }

  const $ = (id) => document.getElementById(id);

  async function loadClaimsFromApi() {
    if (!window.__charraiaApi || !window.__charraiaApi.isConfigured()) {
      claims = {};
      claimsOffline = true;
      return;
    }
    try {
      claims = await window.__charraiaApi.loadGiftClaims();
      claimsOffline = false;
    } catch (e) {
      claims = {};
      claimsOffline = true;
    }
  }

  async function refreshClaims() {
    await loadClaimsFromApi();
    rebuildAllRows();
    syncSummary();
  }

  function rebuildAllRows() {
    GIFTS.forEach((g) => {
      const row = document.querySelector('.sg-row[data-id="' + g.id + '"]');
      if (row) refreshRow(row, g);
    });
  }

  function buildSheet() {
    const body = $("sheet-body");
    if (!body) return;
    body.innerHTML = "";
    let lastGroup = null;
    GIFTS.forEach((g) => {
      if (g.group !== lastGroup) {
        const h = document.createElement("div");
        h.className = "sheet-group";
        h.dataset.cat = g.group;
        h.textContent = GROUP_LABELS[g.group];
        body.appendChild(h);
        lastGroup = g.group;
      }
      const row = document.createElement("div");
      row.className = "sg-row";
      row.dataset.id = g.id;
      row.dataset.cat = g.group;
      const brandHtml = g.brand ? `<span class="sg-brand">${BRANDS[g.brand]}</span>` : "";
      row.innerHTML =
        `<div class="sg-main">
           <span class="sg-name">${g.name}${g.mimo ? ' <span class="sg-mimo">+ mimo</span>' : ""}</span>
           ${brandHtml}
           <span class="sg-stock" data-role="stock"></span>
         </div>
         <div class="sg-step">
           <button type="button" data-d="-1" aria-label="Tirar um">−</button>
           <span class="sg-q" data-role="q">0</span>
           <button type="button" data-d="1" aria-label="Adicionar um">+</button>
         </div>`;
      body.appendChild(row);
      refreshRow(row, g);
    });
    applyFilter();
  }

  function refreshRow(row, g) {
    const q = picked[g.id] || 0;
    const rem = remaining(g);
    const out = stock(g) === 0;
    row.classList.toggle("has", q > 0);
    row.classList.toggle("sold", out);
    const stockEl = row.querySelector('[data-role="stock"]');
    stockEl.textContent = out ? "esgotado" : (rem === 0 ? "tudo escolhido ✓" : "restam " + rem);
    stockEl.classList.toggle("full", rem === 0 && !out);
    row.querySelector('[data-role="q"]').textContent = q;
    const [minus, plus] = row.querySelectorAll(".sg-step button");
    minus.disabled = q <= 0;
    plus.disabled = rem <= 0;
  }

  function applyFilter() {
    document.querySelectorAll(".sg-row, .sheet-group").forEach((el) => {
      el.hidden = filter !== "all" && el.dataset.cat !== filter;
    });
  }

  function syncSummary() {
    const n = totalPicked();
    const sub = $("gift-open-sub");
    if (sub) {
      let line = n === 0
        ? TOTAL_GIFT_UNITS + " presentes na lista · toque para escolher"
        : (n === 1 ? "1 presente escolhido · toque para editar"
                   : n + " presentes escolhidos · toque para editar");
      if (claimsOffline) line += " · estoque offline";
      sub.textContent = line;
    }
    const open = $("gift-open");
    if (open) open.classList.toggle("has-pick", n > 0);

    const sc = $("sheet-count");
    if (sc) sc.textContent = n === 0
      ? "Nenhum presente ainda"
      : (n === 1 ? "1 presente escolhido" : n + " presentes escolhidos");

    const chipsWrap = $("gift-chips");
    if (chipsWrap) {
      chipsWrap.innerHTML = "";
      const chosen = GIFTS.filter((g) => picked[g.id] > 0);
      chipsWrap.hidden = chosen.length === 0;
      chosen.forEach((g) => {
        const chip = document.createElement("span");
        chip.className = "gift-chip";
        chip.innerHTML = `<b>${picked[g.id]}×</b> ${g.name}<button type="button" data-rm="${g.id}" aria-label="Remover">✕</button>`;
        chipsWrap.appendChild(chip);
      });
    }
  }

  function onSheetClick(e) {
    const btn = e.target.closest("button[data-d]");
    if (!btn) return;
    const row = btn.closest(".sg-row");
    const g = GIFTS.find((x) => x.id === row.dataset.id);
    const cur = picked[g.id] || 0;
    const delta = parseInt(btn.dataset.d, 10);
    const next = delta > 0
      ? cur + (remaining(g) > 0 ? 1 : 0)
      : Math.max(0, cur - 1);
    if (next === 0) delete picked[g.id]; else picked[g.id] = next;
    refreshRow(row, g);
    syncSummary();
  }

  function onChipClick(e) {
    const rm = e.target.closest("button[data-rm]");
    if (!rm) return;
    delete picked[rm.dataset.rm];
    const row = document.querySelector('.sg-row[data-id="' + rm.dataset.rm + '"]');
    if (row) refreshRow(row, GIFTS.find((x) => x.id === rm.dataset.rm));
    syncSummary();
  }

  function openSheet() {
    const back = $("gift-sheet");
    if (!back) return;
    if (back._closeTimer) { clearTimeout(back._closeTimer); back._closeTimer = null; }
    if (back._settleTimer) { clearTimeout(back._settleTimer); back._settleTimer = null; }
    back.hidden = false;
    back.classList.remove("closing", "settled");
    lastFocus = document.activeElement;
    back.classList.add("open");
    document.body.style.overflow = "hidden";
    back._settleTimer = setTimeout(() => {
      if (!back.hidden) back.classList.add("settled");
    }, 420);
    const close = $("sheet-close");
    if (close) close.focus();
  }

  function closeSheet() {
    const back = $("gift-sheet");
    if (!back) return;
    if (back._settleTimer) { clearTimeout(back._settleTimer); back._settleTimer = null; }
    back.classList.remove("open", "settled");
    back.classList.add("closing");
    document.body.style.overflow = "";
    if (back._closeTimer) clearTimeout(back._closeTimer);
    back._closeTimer = setTimeout(() => {
      back.hidden = true;
      back.classList.remove("closing");
      back._closeTimer = null;
    }, 300);
    if (lastFocus && lastFocus.focus) lastFocus.focus();
  }

  function setMode(m) {
    mode = m;
    document.querySelectorAll(".gm-opt").forEach((b) =>
      b.classList.toggle("is-on", b.dataset.mode === m));
    document.querySelectorAll(".gift-panel").forEach((p) =>
      p.hidden = p.dataset.panel !== m);
  }

  function setFilter(cat) {
    filter = cat;
    document.querySelectorAll(".st-tab").forEach((t) =>
      t.classList.toggle("is-on", t.dataset.cat === cat));
    applyFilter();
    const body = $("sheet-body");
    if (body) body.scrollTop = 0;
  }

  function initEmail() {
    const copy = $("email-copy");
    if (!copy) return;
    copy.addEventListener("click", () => {
      const done = () => {
        copy.classList.add("copied");
        copy.textContent = "Copiado ✓";
        setTimeout(() => { copy.classList.remove("copied"); copy.textContent = "Copiar e-mail"; }, 1800);
      };
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(GIFT_EMAIL).then(done).catch(done);
      } else { done(); }
    });
  }

  function getPickedForSubmit() {
    return GIFTS
      .filter((g) => picked[g.id] > 0)
      .map((g) => ({
        id: g.id,
        name: g.name,
        quantity: picked[g.id],
      }));
  }

  function buildGiftMessage() {
    if (mode === "email") {
      return "Obrigada pelo carinho! 🤍 É só mandar para " + GIFT_EMAIL + ".";
    }
    const parts = GIFTS.filter((g) => picked[g.id] > 0).map((g) => `${picked[g.id]}x ${g.name}`);
    if (!parts.length) return "";
    const joined = parts.length === 1
      ? parts[0]
      : parts.slice(0, -1).join(", ") + " e " + parts[parts.length - 1];
    return "Você vai levar: " + joined + ". Que amor! 🤍";
  }

  function commit() {
    return buildGiftMessage();
  }

  function clearPickedAfterSubmit() {
    Object.keys(picked).forEach((id) => delete picked[id]);
    rebuildAllRows();
    syncSummary();
  }

  function bindUi() {
    document.querySelectorAll(".gm-opt").forEach((b) =>
      b.addEventListener("click", () => setMode(b.dataset.mode)));

    const open = $("gift-open");
    if (open) open.addEventListener("click", openSheet);
    const close = $("sheet-close");
    if (close) close.addEventListener("click", closeSheet);
    const confirm = $("sheet-confirm");
    if (confirm) confirm.addEventListener("click", closeSheet);
    const back = $("gift-sheet");
    if (back) back.addEventListener("click", (e) => { if (e.target === back) closeSheet(); });

    const body = $("sheet-body");
    if (body) body.addEventListener("click", onSheetClick);
    const chips = $("gift-chips");
    if (chips) chips.addEventListener("click", onChipClick);

    document.querySelectorAll(".st-tab").forEach((t) =>
      t.addEventListener("click", () => setFilter(t.dataset.cat)));

    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape") {
        const b = $("gift-sheet");
        if (b && !b.hidden) closeSheet();
      }
    });

    setMode("lista");
  }

  async function init() {
    buildSheet();
    syncSummary();
    initEmail();
    bindUi();
    await loadClaimsFromApi();
    rebuildAllRows();
    syncSummary();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else { init(); }

  window.__charraiaGifts = {
    commit,
    getPickedForSubmit,
    clearPickedAfterSubmit,
    refreshClaims,
    get mode() { return mode; },
    openSheet,
  };
})();
