// Print-service pricing — defaults + labels for the admin price editor and
// the client order form. Amounts are in FC. Keep the defaults in sync with
// backend/src/utils/printPricing.js (the backend is the source of truth for
// the price actually charged).

export const DEFAULT_PRINT_PRICING = {
  size: { A6: 1500, A5: 2500, custom: 3500 },
  paperType: { standard: 0, premium: 500, luxury: 1500 },
  finish: { mat: 0, glossy: 200, satin: 300 },
  doubleSided: 700,
  minQuantity: 10,
  discounts: [
    { minQuantity: 50, percent: 10 },
    { minQuantity: 100, percent: 15 },
    { minQuantity: 200, percent: 20 }
  ]
}

export const PRINT_OPTION_LABELS = {
  size: { A6: 'A6 (10,5 × 14,8 cm)', A5: 'A5 (14,8 × 21 cm)', custom: 'Format personnalisé' },
  paperType: { standard: 'Standard — 250 g', premium: 'Premium — texturé 300 g', luxury: 'Luxe — coton 350 g' },
  finish: { mat: 'Mat', glossy: 'Brillant', satin: 'Satiné' }
}

// Empty / invalid / negative → default (an emptied field must not become 0 FC).
const num = (v, fallback) => {
  if (v === '' || v === null || v === undefined) return fallback
  const n = Number(v)
  return Number.isFinite(n) && n >= 0 ? n : fallback
}

// Fill missing keys from the defaults (older/partial saved configs).
export function normalizePrintPricing(saved) {
  const d = DEFAULT_PRINT_PRICING
  const group = (key) => Object.fromEntries(Object.keys(d[key]).map(k => [k, num(saved?.[key]?.[k], d[key][k])]))
  return {
    size: group('size'),
    paperType: group('paperType'),
    finish: group('finish'),
    doubleSided: num(saved?.doubleSided, d.doubleSided),
    minQuantity: Math.max(1, Math.round(num(saved?.minQuantity, d.minQuantity))),
    discounts: Array.isArray(saved?.discounts) ? saved.discounts : d.discounts
  }
}

// Clean version sent to the server on save (drops incomplete discount rows).
export function cleanPrintPricing(pricing) {
  const p = normalizePrintPricing(pricing)
  p.discounts = (p.discounts || [])
    .map(x => ({ minQuantity: Math.round(Number(x.minQuantity) || 0), percent: Math.min(90, Number(x.percent) || 0) }))
    .filter(x => x.minQuantity > 0 && x.percent > 0)
    .sort((a, b) => a.minQuantity - b.minQuantity)
  return p
}
