// Save photos to the user's device.
//
// Phones: the native share sheet ("Enregistrer les images" on iPhone,
// "Enregistrer" / Galerie on Android) puts the pictures straight into the
// photo gallery — a ZIP is useless on a phone. Computers: one regular download
// per photo.
//
// navigator.share() must run right after a tap (iOS rejects it once the tap is
// "too old"), so photos are fetched ahead of time with prefetchPhoto() and the
// share call itself only uses files that are already in memory.

const fileCache = new Map() // url → Promise<File>

const extFromType = (type) => ({ 'image/jpeg': '.jpg', 'image/png': '.png', 'image/webp': '.webp', 'image/gif': '.gif' }[type] || '.jpg')

const safeName = (s) => String(s || 'photo')
  .normalize('NFD').replace(/[̀-ͯ]/g, '')
  .replace(/[^A-Za-z0-9]+/g, '-').replace(/^-+|-+$/g, '')
  .slice(0, 40) || 'photo'

/** Starts (or reuses) the download of one photo as a File. */
export function prefetchPhoto(url, baseName) {
  if (!fileCache.has(url)) {
    const p = fetch(url)
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`)
        return r.blob()
      })
      .then((blob) => new File([blob], `${safeName(baseName)}${extFromType(blob.type)}`, { type: blob.type || 'image/jpeg' }))
    p.catch(() => fileCache.delete(url)) // allow a retry
    fileCache.set(url, p)
  }
  return fileCache.get(url)
}

/** True on phones/tablets whose share sheet accepts image files. Computers
 *  are excluded: Chrome on Windows/macOS can share files too, but its sheet
 *  has no "save" option — a plain download is what people expect there. */
export function canShareImages() {
  try {
    if (!navigator.canShare) return false
    const touchFirst = window.matchMedia?.('(pointer: coarse)').matches
    if (!touchFirst) return false
    const probe = new File([new Blob(['x'], { type: 'image/jpeg' })], 'x.jpg', { type: 'image/jpeg' })
    return navigator.canShare({ files: [probe] })
  } catch {
    return false
  }
}

function downloadOne(file) {
  const url = URL.createObjectURL(file)
  const a = document.createElement('a')
  a.href = url
  a.download = file.name
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 10_000)
}

/**
 * Saves already-fetched files.
 * @returns {'shared'|'downloaded'|'cancelled'|'needs-tap'}
 *   'needs-tap' → the browser wants a fresh tap: call again from a new click.
 */
export async function saveFiles(files, { title } = {}) {
  if (!files.length) return 'cancelled'
  if (canShareImages() && navigator.canShare({ files })) {
    try {
      await navigator.share({ files, title })
      return 'shared'
    } catch (err) {
      if (err?.name === 'AbortError') return 'cancelled'
      if (err?.name === 'NotAllowedError') return 'needs-tap'
      // Some browsers refuse very large batches: fall back to downloads.
    }
  }
  // Computer (or share unavailable): one download per photo, spaced out so
  // the browser doesn't drop any.
  for (let i = 0; i < files.length; i++) {
    downloadOne(files[i])
    if (i < files.length - 1) await new Promise((r) => setTimeout(r, 350))
  }
  return 'downloaded'
}
