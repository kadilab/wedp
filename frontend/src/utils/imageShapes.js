// Shape options for "photo" (client-filled) and "image" (admin decoration)
// design elements. 'rect' keeps the existing border-radius behavior; every
// other shape clips the element via CSS clip-path (percentage-based, so it
// scales correctly regardless of the element's width/height).
export const PHOTO_SHAPES = [
  { id: 'rect', label: 'Rectangle' },
  { id: 'circle', label: 'Cercle' },
  { id: 'hexagon', label: 'Hexagone' },
  { id: 'diamond', label: 'Losange' },
  { id: 'octagon', label: 'Octogone' },
  { id: 'star', label: 'Étoile' }
]

export function getClipPath(shape) {
  switch (shape) {
    case 'circle': return 'circle(50% at 50% 50%)'
    case 'hexagon': return 'polygon(25% 0%, 75% 0%, 100% 50%, 75% 100%, 25% 100%, 0% 50%)'
    case 'diamond': return 'polygon(50% 0%, 100% 50%, 50% 100%, 0% 50%)'
    case 'octagon': return 'polygon(30% 0%, 70% 0%, 100% 30%, 100% 70%, 70% 100%, 30% 100%, 0% 70%, 0% 30%)'
    case 'star': return 'polygon(50% 0%, 61% 35%, 98% 35%, 68% 57%, 79% 91%, 50% 70%, 21% 91%, 32% 57%, 2% 35%, 39% 35%)'
    default: return null
  }
}
