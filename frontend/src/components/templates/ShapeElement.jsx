// Decorative shape element (rectangle / circle / line) rendered on the canvas,
// the public invitation and the gallery preview. Fills its element box.
import { elGradientCss } from '../../utils/gradient'

function rgba(hex, op = 100) {
  const h = (hex || '#000000').replace('#', '')
  const n = h.length === 3 ? h.split('').map((c) => c + c).join('') : h
  const r = parseInt(n.slice(0, 2), 16) || 0
  const g = parseInt(n.slice(2, 4), 16) || 0
  const b = parseInt(n.slice(4, 6), 16) || 0
  return `rgba(${r},${g},${b},${op / 100})`
}

// Fill: a gradient when enabled, otherwise the solid colour (with opacity).
function shapeFill(el, fallback) {
  return elGradientCss(el, fallback) || rgba(el.fillColor || fallback, el.fillOpacity ?? 100)
}

export default function ShapeElement({ el }) {
  const opacity = (el.opacity ?? 100) / 100

  if (el.shapeKind === 'line') {
    const t = el.lineThickness ?? 2
    return (
      <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', opacity }}>
        <div style={{ width: '100%', height: t, background: shapeFill(el, '#333333'), borderRadius: t }} />
      </div>
    )
  }

  return (
    <div
      style={{
        width: '100%',
        height: '100%',
        boxSizing: 'border-box',
        background: shapeFill(el, '#df6746'),
        borderRadius: el.shapeKind === 'circle' ? '9999px' : (el.borderRadius || 0),
        border: el.borderWidth ? `${el.borderWidth}px solid ${el.borderColor || '#333333'}` : 'none',
        opacity
      }}
    />
  )
}

// HTML-string version kept in sync for any client-side HTML export needs.
export function shapeElementHTML(el) {
  const opacity = (el.opacity ?? 100) / 100
  if (el.shapeKind === 'line') {
    const t = el.lineThickness ?? 2
    return `<div style="width:100%;height:100%;display:flex;align-items:center;opacity:${opacity}"><div style="width:100%;height:${t}px;background:${shapeFill(el, '#333333')};border-radius:${t}px"></div></div>`
  }
  const radius = el.shapeKind === 'circle' ? '9999px' : `${el.borderRadius || 0}px`
  const border = el.borderWidth ? `border:${el.borderWidth}px solid ${el.borderColor || '#333333'};` : ''
  return `<div style="width:100%;height:100%;box-sizing:border-box;background:${shapeFill(el, '#df6746')};border-radius:${radius};${border}opacity:${opacity}"></div>`
}
