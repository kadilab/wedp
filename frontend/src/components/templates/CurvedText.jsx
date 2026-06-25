import { useId } from 'react'

// True when an element should be rendered along a curve.
export function hasArc(el) {
  return !!(el && el.curve && Math.abs(el.curve) > 0)
}

// Renders text along a quadratic arc using SVG <textPath>. The curve value
// goes from -100 (vallée) to 100 (arc-en-ciel); 0 means straight (callers
// should fall back to a normal <span> in that case via hasArc()).
//
// Shared by the designer canvas, the preview and the public invitation so the
// curved text looks identical everywhere.
export default function CurvedText({ el, text }) {
  const uid = useId().replace(/:/g, '')
  const pathId = `arc-${uid}`

  const W = Math.max(1, el.width || 200)
  const H = Math.max(1, el.height || 80)
  const fontSize = el.fontSize || 16
  const c = el.curve || 0

  // Amplitude of the arc, bounded so the glyphs stay inside the box.
  const D = Math.max(0, (H - fontSize) / 2)
  const d = (c / 100) * D
  // Endpoints at H/2 + d, apex (curve midpoint) at H/2 - d → symmetric around
  // the vertical centre. The control point sits at H/2 - 3d (off the curve).
  const ye = H / 2 + d
  const yCtrl = H / 2 - 3 * d

  const anchor = el.textAlign === 'left' ? 'start' : el.textAlign === 'right' ? 'end' : 'middle'
  const startOffset = el.textAlign === 'left' ? '0%' : el.textAlign === 'right' ? '100%' : '50%'

  return (
    <svg
      width="100%"
      height="100%"
      viewBox={`0 0 ${W} ${H}`}
      preserveAspectRatio="xMidYMid meet"
      style={{ overflow: 'visible', display: 'block' }}
    >
      <path id={pathId} d={`M 0 ${ye} Q ${W / 2} ${yCtrl} ${W} ${ye}`} fill="none" stroke="none" />
      <text
        fill={el.color || '#000000'}
        textAnchor={anchor}
        style={{
          fontFamily: el.fontFamily,
          fontSize: `${fontSize}px`,
          fontWeight: el.fontWeight || 'normal',
          fontStyle: el.fontStyle || 'normal',
          letterSpacing: `${el.letterSpacing || 0}px`,
          textTransform: el.textTransform || 'none'
        }}
      >
        <textPath href={`#${pathId}`} startOffset={startOffset}>
          {text}
        </textPath>
      </text>
    </svg>
  )
}
