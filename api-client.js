/* ============================================================
   Charraiá do Theo — Google Sheets API client
   Set SHEETS_API_URL to your deployed Apps Script Web App URL.
   ============================================================ */
(function () {
  "use strict";

  const SHEETS_API_URL = "https://script.google.com/macros/s/AKfycbwOu7f_m7Ca1-Q1V1QmKSz2oWPEQvLAVD3Sp03ML4VUmkK8PyuYgkIroqaX7kwF2-8/exec";

  function parseJsonResponse(text) {
    const trimmed = (text || "").trim();
    if (!trimmed) return null;
    try {
      return JSON.parse(trimmed);
    } catch (e) {
      const match = trimmed.match(/\{[\s\S]*\}/);
      if (match) {
        try { return JSON.parse(match[0]); } catch (e2) { /* fall through */ }
      }
    }
    return null;
  }

  async function apiGet(params) {
    if (!SHEETS_API_URL || SHEETS_API_URL.indexOf("COLE_A_URL") !== -1) {
      throw new Error("API não configurada. Siga o SETUP.md.");
    }
    const url = new URL(SHEETS_API_URL);
    Object.keys(params).forEach((k) => url.searchParams.set(k, params[k]));
    const res = await fetch(url.toString(), { method: "GET", redirect: "follow" });
    const data = parseJsonResponse(await res.text());
    if (!data) throw new Error("Resposta inválida do servidor");
    return data;
  }

  async function apiPost(payload) {
    if (!SHEETS_API_URL || SHEETS_API_URL.indexOf("COLE_A_URL") !== -1) {
      throw new Error("API não configurada. Siga o SETUP.md.");
    }
    const res = await fetch(SHEETS_API_URL, {
      method: "POST",
      redirect: "follow",
      headers: { "Content-Type": "text/plain;charset=utf-8" },
      body: JSON.stringify(payload),
    });
    const data = parseJsonResponse(await res.text());
    if (!data) throw new Error("Resposta inválida do servidor");
    return data;
  }

  window.__charraiaApi = {
    isConfigured() {
      return SHEETS_API_URL && SHEETS_API_URL.indexOf("COLE_A_URL") === -1;
    },

    async loadGiftClaims() {
      const data = await apiGet({ action: "claims" });
      if (!data.ok) throw new Error(data.message || "Erro ao carregar estoque");
      return data.claims || {};
    },

    async submitRsvp({ name, guests, diet, giftMode, gifts }) {
      return apiPost({
        action: "submit",
        name,
        guests,
        diet,
        giftMode,
        gifts,
      });
    },

    async loadAdminData(key) {
      return apiGet({ action: "admin", key: key });
    },
  };
})();
