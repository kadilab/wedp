// Shared Mobile Money (RDC) helpers — operator list + phone number parsing.
// Used by any K-PAY DIRECT/USSD payment UI (invitation quota purchase, gift
// registry...) so validation/formatting never drifts between them.

// Mobile Money operators (RDC). Logos live in /public/providers.
export const OPERATORS = [
  { code: 'AIRTEL_COD', label: 'Airtel Money', logo: '/providers/airtel.png', prefixes: ['097', '098', '099'] },
  { code: 'ORANGE_COD', label: 'Orange Money', logo: '/providers/orange.png', prefixes: ['084', '085', '089', '080'] },
  { code: 'VODACOM_MPESA_COD', label: 'M-Pesa', logo: '/providers/mpesa.png', prefixes: ['081', '082', '083'] }
]

// Turn whatever the user typed into the international RDC format 243XXXXXXXXX.
// Accepts "097...", "97...", "0970000000", "+243970000000", "243970000000".
export function buildFullPhone(local) {
  let p = String(local || '').replace(/\D/g, '')
  p = p.replace(/^243/, '') // user already typed the country code
  p = p.replace(/^0/, '')   // drop the national trunk 0
  return p ? '243' + p : ''
}

// Guess the operator from the local prefix (after dropping 243 / 0).
export function detectOperator(local) {
  const p = String(local || '').replace(/\D/g, '').replace(/^243/, '').replace(/^0/, '')
  if (p.length < 3) return null
  const three = p.slice(0, 3)
  const match = OPERATORS.find((op) => op.prefixes.includes(three))
  return match ? match.code : null
}
