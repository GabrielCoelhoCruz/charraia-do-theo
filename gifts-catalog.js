/* ============================================================
   Charraiá do Theo — gift catalog (single source for frontend)
   Keep CATALOG in google-apps-script/Code.gs in sync when editing.
   ============================================================ */
window.__charraiaCatalog = {
  GIFTS: [
    { id: "mordedor",     name: "Mordedor",                     qty: 1, mimo: true,  group: "enxoval" },
    { id: "naninha",      name: "Naninha",                      qty: 1, mimo: true,  group: "enxoval" },
    { id: "saboneteira",  name: "Saboneteira",                  qty: 1, mimo: true,  group: "enxoval" },
    { id: "escova-pente", name: "Kit escova e pente de cabelo", qty: 1, mimo: true,  group: "enxoval" },
    { id: "termometro",   name: "Termômetro",                   qty: 1, mimo: true,  group: "enxoval" },
    { id: "colher",       name: "Colher de silicone p/ bebê",   qty: 1, mimo: true,  group: "enxoval" },
    { id: "aspirador",    name: "Aspirador nasal",              qty: 1, mimo: true,  group: "enxoval" },
    { id: "tesoura",      name: "Tesoura e cortador p/ bebê",   qty: 1, mimo: true,  group: "enxoval" },
    { id: "escova-mam",   name: "Escova p/ mamadeira",          qty: 1, mimo: true,  group: "enxoval" },
    { id: "toalha-cap",   name: "Toalha com capuz",             qty: 2, mimo: false, group: "enxoval" },
    { id: "toalha-fra",   name: "Toalha fralda",                qty: 2, mimo: false, group: "enxoval" },
    { id: "babadores",    name: "Babadores",                    qty: 2, mimo: false, group: "enxoval" },
    { id: "cueiro",       name: "Cueiro",                       qty: 2, mimo: false, group: "enxoval" },
    { id: "fralda-boca",  name: "Fralda de boca",               qty: 2, mimo: false, group: "enxoval" },
    { id: "absorvente",   name: "Absorvente para seios",        qty: 2, mimo: true,  group: "higiene", brand: "higiene" },
    { id: "cotonete",     name: "Cotonete",                     qty: 2, mimo: true,  group: "higiene", brand: "higiene" },
    { id: "pomada",       name: "Pomada anti-assaduras",        qty: 2, mimo: true,  group: "higiene", brand: "higiene" },
    { id: "shampoo",      name: "Shampoo e condicionador",      qty: 2, mimo: true,  group: "higiene", brand: "higiene" },
    { id: "algodao",      name: "Algodão",                      qty: 3, mimo: true,  group: "higiene", brand: "higiene" },
    { id: "sabonete",     name: "Sabonete líquido p/ bebê",     qty: 3, mimo: true,  group: "higiene", brand: "higiene" },
    { id: "lenco",        name: "Lenço umedecido",              qty: 3, mimo: true,  group: "higiene", brand: "higiene" },
    { id: "fralda-rn",    name: "Fralda descartável RN",        qty: 3,  mimo: false, group: "fralda", brand: "fralda" },
    { id: "fralda-p",     name: "Fralda descartável P",         qty: 11, mimo: false, group: "fralda", brand: "fralda" },
    { id: "fralda-m",     name: "Fralda descartável M",         qty: 10, mimo: false, group: "fralda", brand: "fralda" },
    { id: "fralda-g",     name: "Fralda descartável G",         qty: 10, mimo: false, group: "fralda", brand: "fralda" },
  ],
  GROUP_LABELS: {
    enxoval: "Enxoval & mimos",
    higiene: "Higiene & cuidados",
    fralda:  "Fraldas descartáveis",
  },
};
