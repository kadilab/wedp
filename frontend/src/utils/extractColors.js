// Extract a small palette of dominant colours from an image — pure canvas, no
// dependency. Used by the template editor: when a background image is uploaded
// we pull its main colours so the creator can reuse them on text elements.

function loadImage(src) {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.crossOrigin = 'anonymous' // safe for blob: URLs and CORS-enabled hosts
    img.onload = () => resolve(img)
    img.onerror = reject
    img.src = src
  })
}

const toHex = (r, g, b) =>
  '#' + [r, g, b].map((x) => x.toString(16).padStart(2, '0')).join('').toUpperCase()

const dist = (a, b) => {
  const dr = a[0] - b[0], dg = a[1] - b[1], db = a[2] - b[2]
  return Math.sqrt(dr * dr + dg * dg + db * db)
}

// Returns up to `count` distinct dominant colours as hex strings, most frequent
// first. `minDist` avoids near-duplicate swatches. Resolves to [] on a tainted
// canvas or load failure (never throws).
export async function extractPalette(src, count = 6, minDist = 40) {
  let img
  try {
    img = await loadImage(src)
  } catch {
    return []
  }
  const W = 72
  const ratio = img.height && img.width ? img.height / img.width : 1
  const H = Math.max(1, Math.round(W * ratio))
  const canvas = document.createElement('canvas')
  canvas.width = W
  canvas.height = H
  const ctx = canvas.getContext('2d', { willReadFrequently: true })
  ctx.drawImage(img, 0, 0, W, H)

  let data
  try {
    data = ctx.getImageData(0, 0, W, H).data
  } catch {
    return [] // tainted canvas (cross-origin without CORS)
  }

  // Bucket colours quantised to 5 bits/channel, keeping running averages.
  const buckets = new Map()
  for (let i = 0; i < data.length; i += 4) {
    if (data[i + 3] < 125) continue // skip transparent
    const r = data[i], g = data[i + 1], b = data[i + 2]
    const key = ((r >> 3) << 10) | ((g >> 3) << 5) | (b >> 3)
    const e = buckets.get(key)
    if (e) { e.n++; e.r += r; e.g += g; e.b += b }
    else buckets.set(key, { n: 1, r, g, b })
  }

  const sorted = [...buckets.values()].sort((a, b) => b.n - a.n)
  const chosen = []
  for (const e of sorted) {
    const rgb = [Math.round(e.r / e.n), Math.round(e.g / e.n), Math.round(e.b / e.n)]
    if (chosen.every((c) => dist(c, rgb) > minDist)) chosen.push(rgb)
    if (chosen.length >= count) break
  }
  return chosen.map(([r, g, b]) => toHex(r, g, b))
}
