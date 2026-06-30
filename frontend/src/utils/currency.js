// App currency. Prices are entered and displayed in Congolese Francs (CDF),
// shown as "FC". Mobile Money (K-PAY) settles in the same currency, so no
// conversion happens between what the user sees and what they pay.
export const CURRENCY = 'FC'

// Format a money amount with thousands separators + the FC suffix.
// formatMoney(2500) -> "2 500 FC"
export function formatMoney(value, { withSuffix = true } = {}) {
  const n = Number(value) || 0
  const formatted = n.toLocaleString('fr-FR')
  return withSuffix ? `${formatted} ${CURRENCY}` : formatted
}
