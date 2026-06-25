// Element library powered by Iconify (https://iconify.design) — a free,
// open-source icon set with 200k+ icons and a public, CORS-enabled API that
// needs no API key. We fetch the SVG and embed it as a data URL so saved
// templates are self-contained (no runtime dependency on the CDN).

const ICONIFY_API = 'https://api.iconify.design'

// Search icons by keyword. Returns an array of icon names like "mdi:heart".
export async function searchIcons(query, limit = 60) {
  const q = (query || '').trim()
  if (!q) return []
  const res = await fetch(`${ICONIFY_API}/search?query=${encodeURIComponent(q)}&limit=${limit}`)
  if (!res.ok) throw new Error('Recherche d\'icônes indisponible')
  const data = await res.json()
  return Array.isArray(data.icons) ? data.icons : []
}

// Preview URL for an icon in the grid (small, with a chosen color).
export function iconPreviewUrl(name, color = '#374151') {
  const [prefix, icon] = name.split(':')
  return `${ICONIFY_API}/${prefix}/${icon}.svg?color=${encodeURIComponent(color)}&height=48`
}

// Fetch the icon SVG (optionally recolored) and return a data URL to embed.
export async function fetchIconDataUrl(name, color = '#000000') {
  const [prefix, icon] = name.split(':')
  const url = `${ICONIFY_API}/${prefix}/${icon}.svg?color=${encodeURIComponent(color)}&width=240&height=240`
  const res = await fetch(url)
  if (!res.ok) throw new Error('Téléchargement de l\'icône échoué')
  const svg = await res.text()
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`
}

// A few ready-made keyword chips per event mood to help discovery.
export const ICON_SUGGESTIONS = [
  'heart', 'ring', 'flower', 'leaf', 'rose', 'dove', 'champagne',
  'cake', 'balloon', 'star', 'crown', 'butterfly', 'wreath', 'frame',
  'divider', 'flourish', 'arrow', 'calendar', 'location', 'phone',
  'gift', 'music', 'church', 'camera', 'candle', 'feather'
]

// Curated emoji set, grouped, for quick insertion as text elements.
export const EMOJI_GROUPS = [
  {
    label: 'Mariage & amour',
    emojis: ['💍', '💐', '👰', '🤵', '💒', '❤️', '💕', '💖', '💝', '💘', '🌹', '🕊️', '💞', '👩‍❤️‍👨']
  },
  {
    label: 'Fête',
    emojis: ['🎉', '🎊', '🥂', '🍾', '🎂', '🧁', '🍰', '🎈', '🎁', '✨', '🎵', '🎶', '🪩', '🥳']
  },
  {
    label: 'Nature & fleurs',
    emojis: ['🌸', '🌺', '🌼', '🌷', '🌻', '🍃', '🌿', '🍂', '🦋', '🐝', '🌙', '⭐', '☀️', '🌈']
  },
  {
    label: 'Décor & symboles',
    emojis: ['✦', '✧', '❈', '❀', '✿', '❁', '♛', '♕', '☙', '❧', '⚜️', '➳', '✺', '❖']
  }
]
