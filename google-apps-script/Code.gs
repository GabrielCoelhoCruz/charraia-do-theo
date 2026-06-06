/**
 * Charraiá do Theo — Google Sheets backend
 * Paste into Extensions → Apps Script on your spreadsheet.
 * Run setupSheets() once, then Deploy → Web app.
 *
 * Keep CATALOG in sync with gifts-catalog.js in the project repo.
 */

const ADMIN_KEY = "charraia-theo-2026";

/** @type {Object.<string, {name: string, qty: number}>} */
const CATALOG = {
  "mordedor":     { name: "Mordedor",                     qty: 1 },
  "naninha":      { name: "Naninha",                      qty: 1 },
  "saboneteira":  { name: "Saboneteira",                  qty: 1 },
  "escova-pente": { name: "Kit escova e pente de cabelo", qty: 1 },
  "termometro":   { name: "Termômetro",                   qty: 1 },
  "colher":       { name: "Colher de silicone p/ bebê",   qty: 1 },
  "aspirador":    { name: "Aspirador nasal",              qty: 1 },
  "tesoura":      { name: "Tesoura e cortador p/ bebê",   qty: 1 },
  "escova-mam":   { name: "Escova p/ mamadeira",          qty: 1 },
  "toalha-cap":   { name: "Toalha com capuz",             qty: 2 },
  "toalha-fra":   { name: "Toalha fralda",                qty: 2 },
  "babadores":    { name: "Babadores",                    qty: 2 },
  "cueiro":       { name: "Cueiro",                       qty: 2 },
  "fralda-boca":  { name: "Fralda de boca",               qty: 2 },
  "absorvente":   { name: "Absorvente para seios",        qty: 2 },
  "cotonete":     { name: "Cotonete",                     qty: 2 },
  "pomada":       { name: "Pomada anti-assaduras",        qty: 2 },
  "shampoo":      { name: "Shampoo e condicionador",      qty: 2 },
  "algodao":      { name: "Algodão",                      qty: 3 },
  "sabonete":     { name: "Sabonete líquido p/ bebê",     qty: 3 },
  "lenco":        { name: "Lenço umedecido",              qty: 3 },
  "fralda-rn":    { name: "Fralda descartável RN",        qty: 3 },
  "fralda-p":     { name: "Fralda descartável P",         qty: 11 },
  "fralda-m":     { name: "Fralda descartável M",         qty: 10 },
  "fralda-g":     { name: "Fralda descartável G",         qty: 10 },
};

const SHEET_RSVPS = "rsvps";
const SHEET_GIFTS = "rsvp_gifts";
const SHEET_CONFIG = "config";

function setupSheets() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();

  ensureSheet_(ss, SHEET_RSVPS, ["id", "name", "guests", "diet", "gift_mode", "created_at"]);
  ensureSheet_(ss, SHEET_GIFTS, ["rsvp_id", "gift_id", "gift_name", "quantity"]);
  const config = ensureSheet_(ss, SHEET_CONFIG, ["key", "value"]);

  const url = ss.getUrl();
  setConfigValue_("ADMIN_KEY", ADMIN_KEY);
  setConfigValue_("SHEET_URL", url);

  SpreadsheetApp.flush();
  Logger.log("Setup complete. Sheet URL: " + url);
}

function doGet(e) {
  try {
    const action = (e && e.parameter && e.parameter.action) || "";
    if (action === "claims") {
      return jsonResponse_({ ok: true, claims: getClaims_() });
    }
    if (action === "admin") {
      const key = (e.parameter && e.parameter.key) || "";
      return jsonResponse_(getAdminData_(key));
    }
    return jsonResponse_({ ok: false, error: "unknown_action" });
  } catch (err) {
    return jsonResponse_({ ok: false, error: "server", message: String(err) });
  }
}

function doPost(e) {
  try {
    const raw = (e && e.postData && e.postData.contents) || "{}";
    const payload = JSON.parse(raw);
    if (payload.action === "submit") {
      return jsonResponse_(submitRsvp_(payload));
    }
    return jsonResponse_({ ok: false, error: "unknown_action" });
  } catch (err) {
    return jsonResponse_({ ok: false, error: "server", message: String(err) });
  }
}

function getClaims_() {
  const sheet = getSheet_(SHEET_GIFTS);
  const data = sheet.getDataRange().getValues();
  const claims = {};
  for (let i = 1; i < data.length; i++) {
    const giftId = String(data[i][1] || "");
    const qty = parseInt(data[i][3], 10) || 0;
    if (giftId && qty > 0) {
      claims[giftId] = (claims[giftId] || 0) + qty;
    }
  }
  return claims;
}

function submitRsvp_(payload) {
  const lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    const name = String(payload.name || "").trim();
    if (!name) {
      return { ok: false, error: "validation", message: "Nome obrigatório" };
    }

    const guests = Math.min(20, Math.max(1, parseInt(payload.guests, 10) || 1));
    const diet = String(payload.diet || "").trim();
    const giftMode = (payload.giftMode === "pix" || payload.giftMode === "email") ? "email" : "lista";
    const gifts = Array.isArray(payload.gifts) ? payload.gifts : [];

    if (giftMode === "lista" && gifts.length === 0) {
      // allow RSVP without gifts
    }

    const claims = getClaims_();

    if (giftMode === "lista") {
      for (let i = 0; i < gifts.length; i++) {
        const g = gifts[i];
        const id = String(g.id || "");
        const qty = parseInt(g.quantity, 10) || 0;
        if (!id || qty <= 0) continue;

        const cat = CATALOG[id];
        if (!cat) {
          return { ok: false, error: "validation", message: "Presente inválido: " + id };
        }

        const current = claims[id] || 0;
        if (current + qty > cat.qty) {
          return {
            ok: false,
            error: "stock",
            giftId: id,
            giftName: cat.name,
            message: cat.name + " não tem mais unidades disponíveis.",
          };
        }
        claims[id] = current + qty;
      }
    }

    const rsvpId = Utilities.getUuid();
    const createdAt = new Date().toISOString();
    const rsvpSheet = getSheet_(SHEET_RSVPS);
    rsvpSheet.appendRow([rsvpId, name, guests, diet, giftMode, createdAt]);

    if (giftMode === "lista" && gifts.length > 0) {
      const giftSheet = getSheet_(SHEET_GIFTS);
      const rows = [];
      for (let j = 0; j < gifts.length; j++) {
        const g = gifts[j];
        const id = String(g.id || "");
        const qty = parseInt(g.quantity, 10) || 0;
        if (!id || qty <= 0) continue;
        const cat = CATALOG[id];
        const giftName = String(g.name || (cat && cat.name) || id);
        rows.push([rsvpId, id, giftName, qty]);
      }
      for (let k = 0; k < rows.length; k++) {
        giftSheet.appendRow(rows[k]);
      }
    }

    const message = buildSuccessMessage_(giftMode, gifts);
    return { ok: true, message: message };
  } finally {
    lock.releaseLock();
  }
}

function buildSuccessMessage_(giftMode, gifts) {
  if (giftMode === "email" || giftMode === "pix") {
    return "Obrigada pelo carinho! 🤍 É só mandar para taynamj@gmail.com.";
  }
  const parts = [];
  for (let i = 0; i < gifts.length; i++) {
    const g = gifts[i];
    const qty = parseInt(g.quantity, 10) || 0;
    if (qty <= 0) continue;
    const name = String(g.name || (CATALOG[g.id] && CATALOG[g.id].name) || g.id);
    parts.push(qty + "x " + name);
  }
  if (!parts.length) return "";
  const joined = parts.length === 1
    ? parts[0]
    : parts.slice(0, -1).join(", ") + " e " + parts[parts.length - 1];
  return "Você vai levar: " + joined + ". Que amor! 🤍";
}

function getAdminData_(key) {
  const expected = getConfigValue_("ADMIN_KEY") || ADMIN_KEY;
  if (!key || key !== expected) {
    return { ok: false, error: "unauthorized" };
  }

  const rsvpSheet = getSheet_(SHEET_RSVPS);
  const giftSheet = getSheet_(SHEET_GIFTS);
  const rsvpData = rsvpSheet.getDataRange().getValues();
  const giftData = giftSheet.getDataRange().getValues();

  const giftsByRsvp = {};
  for (let i = 1; i < giftData.length; i++) {
    const rsvpId = String(giftData[i][0] || "");
    const giftId = String(giftData[i][1] || "");
    const giftName = String(giftData[i][2] || "");
    const qty = parseInt(giftData[i][3], 10) || 0;
    if (!rsvpId || qty <= 0) continue;
    if (!giftsByRsvp[rsvpId]) giftsByRsvp[rsvpId] = [];
    giftsByRsvp[rsvpId].push({ id: giftId, name: giftName, quantity: qty });
  }

  const claims = getClaims_();
  let totalGuests = 0;
  let emailCount = 0;
  let giftsReserved = 0;
  const rows = [];

  for (let r = 1; r < rsvpData.length; r++) {
    const id = String(rsvpData[r][0] || "");
    const name = String(rsvpData[r][1] || "");
    const guests = parseInt(rsvpData[r][2], 10) || 1;
    const diet = String(rsvpData[r][3] || "");
    const giftMode = String(rsvpData[r][4] || "lista");
    const createdAt = String(rsvpData[r][5] || "");

    totalGuests += guests;
    if (giftMode === "pix" || giftMode === "email") emailCount++;

    let giftsLabel = "—";
    if (giftMode === "pix" || giftMode === "email") {
      giftsLabel = "E-mail 🤍";
    } else if (giftsByRsvp[id] && giftsByRsvp[id].length) {
      giftsLabel = giftsByRsvp[id].map(function (g) {
        return g.quantity + "× " + g.name;
      }).join(", ");
      giftsByRsvp[id].forEach(function (g) { giftsReserved += g.quantity; });
    }

    rows.push({
      name: name,
      guests: guests,
      diet: diet,
      giftMode: giftMode,
      giftsLabel: giftsLabel,
      createdAt: createdAt,
    });
  }

  rows.sort(function (a, b) {
    return String(b.createdAt).localeCompare(String(a.createdAt));
  });

  const stock = [];
  Object.keys(CATALOG).forEach(function (id) {
    const cat = CATALOG[id];
    const claimed = claims[id] || 0;
    const remaining = Math.max(0, cat.qty - claimed);
    stock.push({
      id: id,
      name: cat.name,
      max: cat.qty,
      claimed: claimed,
      remaining: remaining,
      soldOut: remaining === 0,
    });
  });

  return {
    ok: true,
    summary: {
      confirmations: rows.length,
      totalGuests: totalGuests,
      emailCount: emailCount,
      pixCount: emailCount,
      giftsReserved: giftsReserved,
    },
    rows: rows,
    stock: stock,
    sheetUrl: getConfigValue_("SHEET_URL") || SpreadsheetApp.getActiveSpreadsheet().getUrl(),
  };
}

function ensureSheet_(ss, name, headers) {
  let sheet = ss.getSheetByName(name);
  if (!sheet) {
    sheet = ss.insertSheet(name);
  }
  if (sheet.getLastRow() === 0) {
    sheet.appendRow(headers);
    sheet.setFrozenRows(1);
  }
  return sheet;
}

function getSheet_(name) {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(name);
  if (!sheet) {
    throw new Error("Sheet '" + name + "' not found. Run setupSheets() first.");
  }
  return sheet;
}

function getConfigValue_(key) {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_CONFIG);
  if (!sheet) return "";
  const data = sheet.getDataRange().getValues();
  for (let i = 1; i < data.length; i++) {
    if (String(data[i][0]) === key) return String(data[i][1] || "");
  }
  return "";
}

function setConfigValue_(key, value) {
  const sheet = getSheet_(SHEET_CONFIG);
  const data = sheet.getDataRange().getValues();
  for (let i = 1; i < data.length; i++) {
    if (String(data[i][0]) === key) {
      sheet.getRange(i + 1, 2).setValue(value);
      return;
    }
  }
  sheet.appendRow([key, value]);
}

function jsonResponse_(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}
