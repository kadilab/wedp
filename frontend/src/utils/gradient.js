// Gradient fill for design elements (text & shapes).
//
// An element opts into a gradient with `el.gradient === true`, plus:
//   gradientFrom  (hex)  – start colour (defaults to the element's solid colour)
//   gradientTo    (hex)  – end colour
//   gradientAngle (deg)  – linear direction (default 90 = left→right)
//   gradientType  ('linear' | 'radial')
//
// The SAME logic is mirrored in backend/src/utils/pdf.js so the gradient looks
// identical in the editor, the marketplace preview, the public invitation and
// the generated PDF/PNG/print files.

/** CSS gradient string for an element, or null when the element has no gradient. */
export function elGradientCss(el, fallback = '#df6746') {
  if (!el || !el.gradient) return null
  const from = el.gradientFrom || el.color || el.fillColor || fallback
  const to = el.gradientTo || '#8B7355'
  const angle = el.gradientAngle ?? 90
  if ((el.gradientType || 'linear') === 'radial') {
    return `radial-gradient(circle at 30% 30%, ${from}, ${to})`
  }
  return `linear-gradient(${angle}deg, ${from}, ${to})`
}

/** Inline style that paints TEXT with the element's gradient (clip to glyphs). */
export function textGradientStyle(el) {
  const g = elGradientCss(el, el?.color || '#df6746')
  if (!g) return null
  return {
    backgroundImage: g,
    WebkitBackgroundClip: 'text',
    backgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
    color: 'transparent',
  }
}
