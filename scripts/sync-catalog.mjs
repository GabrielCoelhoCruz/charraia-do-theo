#!/usr/bin/env node
/**
 * Sync catalog.json → gifts-catalog.js and google-apps-script/Code.gs
 * Run: node scripts/sync-catalog.mjs
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const catalog = JSON.parse(fs.readFileSync(path.join(root, "catalog.json"), "utf8"));

const giftsJs =
  "/* AUTO-GENERATED — edit catalog.json and run: node scripts/sync-catalog.mjs */\n" +
  "window.__charraiaCatalog = " +
  JSON.stringify(
    {
      GIFTS: catalog.GIFTS,
      GROUP_LABELS: catalog.GROUP_LABELS,
      GIFT_EMAIL: catalog.GIFT_EMAIL,
      GIFT_PIX_LABEL: catalog.GIFT_PIX_LABEL,
    },
    null,
    2
  ) +
  ";\n";

fs.writeFileSync(path.join(root, "gifts-catalog.js"), giftsJs, "utf8");

const catalogLines = catalog.GIFTS.map((g) => {
  const pad = (s) => s.padEnd(14);
  return `  "${g.id}": { name: ${JSON.stringify(g.name)}, qty: ${g.qty} },`;
});
const catalogBlock =
  "/** @type {Object.<string, {name: string, qty: number}>} */\n" +
  "const CATALOG = {\n" +
  catalogLines.join("\n") +
  "\n};";

const codePath = path.join(root, "google-apps-script", "Code.gs");
let code = fs.readFileSync(codePath, "utf8");
code = code.replace(
  /\/\*\* @type \{Object\.<string, \{name: string, qty: number\}>\} \*\/\nconst CATALOG = \{[\s\S]*?\};/,
  catalogBlock
);
code = code.replace(
  /const GIFT_EMAIL = "[^"]*";/,
  `const GIFT_EMAIL = ${JSON.stringify(catalog.GIFT_EMAIL)};`
);
code = code.replace(
  /const GIFT_PIX_LABEL = "[^"]*";/,
  `const GIFT_PIX_LABEL = ${JSON.stringify(catalog.GIFT_PIX_LABEL)};`
);
if (!code.includes("const GIFT_EMAIL")) {
  code = code.replace(
    /const ADMIN_KEY = "[^"]*";/,
    (m) => m + `\nconst GIFT_EMAIL = ${JSON.stringify(catalog.GIFT_EMAIL)};`
  );
}
if (!code.includes("const GIFT_PIX_LABEL")) {
  code = code.replace(
    /const GIFT_EMAIL = [^;]+;/,
    (m) => m + `\nconst GIFT_PIX_LABEL = ${JSON.stringify(catalog.GIFT_PIX_LABEL)};`
  );
}
fs.writeFileSync(codePath, code, "utf8");

console.log("Synced catalog.json → gifts-catalog.js, Code.gs (CATALOG + GIFT_EMAIL + GIFT_PIX_LABEL)");
