// Client-side image processing: validation, resize, re-encode (WebP when
// supported), and three derived sizes (upload/preview/thumbnail). Runs
// entirely in the browser before any network request, so the backend never
// has to do this work — it just receives one already-small file, exactly
// like before. A small in-memory cache avoids reprocessing the same file
// twice in a session (e.g. user re-opens the same picker).

export const IMAGE_PRESETS = {
  avatar: {
    upload: { maxWidth: 1000, maxHeight: 1000, quality: 0.9 },
    preview: { maxWidth: 300, maxHeight: 300, quality: 0.85 },
    thumbnail: { maxWidth: 96, maxHeight: 96, quality: 0.8 }
  },
  couplePhoto: {
    upload: { maxWidth: 1920, maxHeight: 1920, quality: 0.88 },
    preview: { maxWidth: 600, maxHeight: 600, quality: 0.85 },
    thumbnail: { maxWidth: 150, maxHeight: 150, quality: 0.8 }
  },
  background: {
    upload: { maxWidth: 2400, maxHeight: 2400, quality: 0.85 },
    preview: { maxWidth: 800, maxHeight: 800, quality: 0.85 },
    thumbnail: { maxWidth: 200, maxHeight: 200, quality: 0.8 }
  },
  logo: {
    upload: { maxWidth: 800, maxHeight: 800, quality: 0.9 },
    preview: { maxWidth: 300, maxHeight: 300, quality: 0.85 },
    thumbnail: { maxWidth: 100, maxHeight: 100, quality: 0.8 }
  }
}

const DEFAULT_VALIDATION = {
  maxSizeMB: 10,
  minWidth: 0,
  minHeight: 0,
  acceptedTypes: ['image/jpeg', 'image/jpg', 'image/png', 'image/webp']
}

let webpSupportPromise = null

// Real codec support check (not just canvas.toDataURL, which lies on some
// browsers) - encode a 1x1 canvas and see if we get back actual WebP bytes.
export function supportsWebP() {
  if (!webpSupportPromise) {
    webpSupportPromise = new Promise((resolve) => {
      const canvas = document.createElement('canvas')
      canvas.width = 1
      canvas.height = 1
      if (!canvas.toBlob) return resolve(false)
      canvas.toBlob((blob) => resolve(!!blob && blob.type === 'image/webp'), 'image/webp')
    })
  }
  return webpSupportPromise
}

function loadBitmap(file) {
  if (window.createImageBitmap) {
    return createImageBitmap(file, { imageOrientation: 'from-image' }).catch(() =>
      createImageBitmap(file)
    )
  }
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => resolve(img)
    img.onerror = reject
    img.src = URL.createObjectURL(file)
  })
}

function drawToCanvas(bitmap, maxWidth, maxHeight) {
  const srcWidth = bitmap.width
  const srcHeight = bitmap.height
  const scale = Math.min(1, maxWidth / srcWidth, maxHeight / srcHeight) // never upscale
  const width = Math.round(srcWidth * scale)
  const height = Math.round(srcHeight * scale)

  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext('2d')
  ctx.imageSmoothingQuality = 'high'
  ctx.drawImage(bitmap, 0, 0, width, height)
  return canvas
}

function canvasToBlob(canvas, mimeType, quality) {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error('Encodage de l\'image impossible'))),
      mimeType,
      quality
    )
  })
}

export function validateImage(file, overrides = {}) {
  const opts = { ...DEFAULT_VALIDATION, ...overrides }

  if (!opts.acceptedTypes.includes(file.type)) {
    return { valid: false, error: 'Format non supporté (JPG, PNG ou WebP uniquement)' }
  }
  if (file.size > opts.maxSizeMB * 1024 * 1024) {
    return { valid: false, error: `Image trop volumineuse (max ${opts.maxSizeMB} Mo)` }
  }
  return { valid: true }
}

function checkDimensions(bitmap, overrides) {
  const opts = { ...DEFAULT_VALIDATION, ...overrides }
  if (bitmap.width < opts.minWidth || bitmap.height < opts.minHeight) {
    return {
      valid: false,
      error: `Image trop petite (minimum ${opts.minWidth}x${opts.minHeight}px)`
    }
  }
  return { valid: true }
}

const cache = new Map()
const cacheKey = (file, presetName) => `${file.name}-${file.size}-${file.lastModified}-${presetName}`

/**
 * Validates and processes a File into { upload, preview, thumbnail } blobs
 * plus size/dimension metadata. Results are cached per (file, preset) for
 * the lifetime of the page.
 */
export async function processImage(file, presetName = 'background', validationOverrides = {}) {
  const key = cacheKey(file, presetName)
  if (cache.has(key)) return cache.get(key)

  const validation = validateImage(file, validationOverrides)
  if (!validation.valid) throw new Error(validation.error)

  const preset = IMAGE_PRESETS[presetName] || IMAGE_PRESETS.background
  const bitmap = await loadBitmap(file)

  const dimCheck = checkDimensions(bitmap, validationOverrides)
  if (!dimCheck.valid) throw new Error(dimCheck.error)

  const useWebp = await supportsWebP()
  const mimeType = useWebp ? 'image/webp' : (file.type === 'image/png' ? 'image/png' : 'image/jpeg')
  const ext = useWebp ? 'webp' : (mimeType === 'image/png' ? 'png' : 'jpg')

  const sizes = await Promise.all(
    ['upload', 'preview', 'thumbnail'].map(async (variant) => {
      const cfg = preset[variant]
      const canvas = drawToCanvas(bitmap, cfg.maxWidth, cfg.maxHeight)
      const blob = await canvasToBlob(canvas, mimeType, cfg.quality)
      return [variant, blob]
    })
  )

  if (bitmap.close) bitmap.close()

  const filename = `image.${ext}`
  // Wrapped in a File (not a bare Blob) so FormData.append() carries a
  // proper filename - multer needs it to pick a file extension.
  const uploadFile = new File([sizes[0][1]], filename, { type: mimeType })

  const result = {
    upload: uploadFile,
    preview: sizes[1][1],
    thumbnail: sizes[2][1],
    filename,
    originalSize: file.size,
    uploadSize: sizes[0][1].size,
    savedPercent: Math.max(0, Math.round((1 - sizes[0][1].size / file.size) * 100)),
    width: bitmap.width,
    height: bitmap.height
  }

  cache.set(key, result)
  return result
}

export function formatBytes(bytes) {
  if (bytes < 1024) return `${bytes} o`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} Ko`
  return `${(bytes / (1024 * 1024)).toFixed(1)} Mo`
}
