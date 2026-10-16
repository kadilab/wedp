// Print-service pricing, configurable from Admin → Paramètres → Impression
// (Setting key `printPricing`, JSON). Amounts are in the site currency (FC).
// Missing keys fall back to DEFAULT_PRINT_PRICING, so a partial or older
// saved config never breaks the price computation.
// Keep the defaults in sync with frontend/src/utils/printPricing.js.
const { getSetting } = require('./settings');

const DEFAULT_PRINT_PRICING = {
  size: { A6: 1500, A5: 2500, custom: 3500 },        // base price per card
  paperType: { standard: 0, premium: 500, luxury: 1500 }, // extra per card
  finish: { mat: 0, glossy: 200, satin: 300 },       // extra per card
  doubleSided: 700,                                  // extra per card (recto-verso)
  minQuantity: 10,
  discounts: [                                       // volume discounts, best match wins
    { minQuantity: 50, percent: 10 },
    { minQuantity: 100, percent: 15 },
    { minQuantity: 200, percent: 20 }
  ]
};

// Empty / invalid / negative → default (an emptied field must not become 0 FC).
const num = (v, fallback) => {
  if (v === '' || v === null || v === undefined) return fallback;
  const n = Number(v);
  return Number.isFinite(n) && n >= 0 ? n : fallback;
};

function mergeGroup(saved, defaults) {
  const out = {};
  Object.keys(defaults).forEach((k) => { out[k] = num(saved?.[k], defaults[k]); });
  return out;
}

function normalizePrintPricing(saved = {}) {
  const d = DEFAULT_PRINT_PRICING;
  const discounts = Array.isArray(saved?.discounts)
    ? saved.discounts
      .map(x => ({ minQuantity: Math.round(num(x?.minQuantity, 0)), percent: Math.min(90, num(x?.percent, 0)) }))
      .filter(x => x.minQuantity > 0 && x.percent > 0)
      .sort((a, b) => a.minQuantity - b.minQuantity)
    : d.discounts;
  return {
    size: mergeGroup(saved?.size, d.size),
    paperType: mergeGroup(saved?.paperType, d.paperType),
    finish: mergeGroup(saved?.finish, d.finish),
    doubleSided: num(saved?.doubleSided, d.doubleSided),
    minQuantity: Math.max(1, Math.round(num(saved?.minQuantity, d.minQuantity))),
    discounts
  };
}

async function getPrintPricing() {
  const saved = await getSetting('printPricing', null);
  return normalizePrintPricing(saved && typeof saved === 'object' ? saved : {});
}

async function isPrintServiceEnabled() {
  const v = await getSetting('printServiceEnabled', 'false');
  return v === true || v === 'true';
}

// Whole-FC total (FC has no decimals).
function calculatePrintPrice(pricing, { quantity, paperType, finish, size, doubleSided }) {
  const unit = (pricing.size[size] ?? pricing.size.A5)
    + (pricing.paperType[paperType] ?? 0)
    + (pricing.finish[finish] ?? 0)
    + (doubleSided ? pricing.doubleSided : 0);
  const tier = [...pricing.discounts].reverse().find(t => quantity >= t.minQuantity);
  const discountPercent = tier ? tier.percent : 0;
  const total = Math.round(unit * quantity * (1 - discountPercent / 100));
  return { unitPrice: unit, discountPercent, totalPrice: total };
}

module.exports = {
  DEFAULT_PRINT_PRICING,
  normalizePrintPricing,
  getPrintPricing,
  isPrintServiceEnabled,
  calculatePrintPrice
};
