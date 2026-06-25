// Shape options for "photo" (client-filled) and "image" (admin decoration)
// design elements. 'rect' keeps the existing border-radius behavior; every
// other shape clips the element via CSS clip-path (percentage-based, so it
// scales correctly regardless of the element's width/height).
//
// 'custom' (Forme libre) uses a clip-path string supplied per-element on
// `el.customClipPath` — see getClipPath's second argument.
export const PHOTO_SHAPES = [
  { id: 'rect', label: 'Rectangle' },
  { id: 'circle', label: 'Cercle' },
  { id: 'hexagon', label: 'Hexagone' },
  { id: 'diamond', label: 'Losange' },
  { id: 'octagon', label: 'Octogone' },
  { id: 'star', label: 'Étoile' },
  { id: 'heart', label: 'Cœur' },
  { id: 'custom', label: 'Forme libre' }
]

// A reasonable example so "Forme libre" isn't empty when first selected.
export const DEFAULT_CUSTOM_CLIP_PATH =
  'polygon(50% 0%, 100% 38%, 82% 100%, 18% 100%, 0% 38%)' // pentagone

// How the image fills its frame.
export const OBJECT_FIT_OPTIONS = [
  { id: 'cover', label: 'Remplir' },   // fills frame, crops overflow
  { id: 'contain', label: 'Ajuster' }, // whole image visible, may letterbox
  { id: 'fill', label: 'Étirer' }      // stretches to frame (ignores ratio)
]

// Anchor point of the image inside the frame (matters with "Remplir").
export const OBJECT_POSITION_OPTIONS = [
  { id: 'top left', label: '↖' },
  { id: 'top', label: '↑' },
  { id: 'top right', label: '↗' },
  { id: 'left', label: '←' },
  { id: 'center', label: '•' },
  { id: 'right', label: '→' },
  { id: 'bottom left', label: '↙' },
  { id: 'bottom', label: '↓' },
  { id: 'bottom right', label: '↘' }
]

// Style applied to the <img> itself: fit, anchor, zoom and rotation.
// Shared by the designer canvas, the preview and the public invitation so
// the adjustment looks identical everywhere.
export function getImageStyle(el) {
  const scale = (el.imageScale ?? 100) / 100
  const rotation = el.rotation ?? 0
  const parts = []
  if (rotation) parts.push(`rotate(${rotation}deg)`)
  if (scale !== 1) parts.push(`scale(${scale})`)
  return {
    width: '100%',
    height: '100%',
    objectFit: el.objectFit || 'cover',
    objectPosition: el.objectPosition || 'center',
    opacity: (el.opacity ?? 100) / 100,
    transform: parts.length ? parts.join(' ') : undefined,
    transformOrigin: 'center center'
  }
}

export function getClipPath(shape, customValue) {
  switch (shape) {
    case 'circle': return 'circle(50% at 50% 50%)'
    case 'hexagon': return 'polygon(25% 0%, 75% 0%, 100% 50%, 75% 100%, 25% 100%, 0% 50%)'
    case 'diamond': return 'polygon(50% 0%, 100% 50%, 50% 100%, 0% 50%)'
    case 'octagon': return 'polygon(30% 0%, 70% 0%, 100% 30%, 100% 70%, 70% 100%, 30% 100%, 0% 70%, 0% 30%)'
    case 'star': return 'polygon(50% 0%, 61% 35%, 98% 35%, 68% 57%, 79% 91%, 50% 70%, 21% 91%, 32% 57%, 2% 35%, 39% 35%)'
    case 'heart': return 'polygon(50% 100%, 12% 62%, 0% 36%, 4% 17%, 20% 6%, 36% 8%, 50% 22%, 64% 8%, 80% 6%, 96% 17%, 100% 36%, 88% 62%)'
    case 'custom': return (customValue && customValue.trim()) || DEFAULT_CUSTOM_CLIP_PATH
    default: return null
  }
}
