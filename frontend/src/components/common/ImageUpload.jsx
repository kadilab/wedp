import { useCallback, useEffect, useRef, useState } from 'react'
import { useDropzone } from 'react-dropzone'
import toast from 'react-hot-toast'
import { PhotoIcon, ArrowUpTrayIcon, XMarkIcon, CheckCircleIcon } from '@heroicons/react/24/outline'
import { processImage, formatBytes } from '../../utils/imageProcessor'

/**
 * Drag & drop image upload with client-side compression (resize + WebP
 * re-encode) before sending anything over the network. Shows an instant
 * local preview while the (already small) file uploads, with a progress
 * bar and a "before -> after" size readout.
 *
 * The backend contract is unchanged: `onUpload` still receives a single
 * file/blob via the same field name as before.
 */
export default function ImageUpload({
  value,
  onUpload,
  onDelete,
  preset = 'background',
  shape = 'square', // 'square' | 'circle'
  size = 'md', // 'sm' | 'md' | 'lg'
  helpText = 'JPG, PNG ou WebP',
  validation
}) {
  const [previewUrl, setPreviewUrl] = useState(null)
  const [status, setStatus] = useState('idle') // idle | compressing | uploading | done | error
  const [progress, setProgress] = useState(0)
  const [stats, setStats] = useState(null)
  const objectUrlRef = useRef(null)

  useEffect(() => {
    return () => {
      if (objectUrlRef.current) URL.revokeObjectURL(objectUrlRef.current)
    }
  }, [])

  const onDrop = useCallback(async (acceptedFiles, rejections) => {
    if (rejections?.length) {
      toast.error('Fichier non accepté (image uniquement)')
      return
    }
    const file = acceptedFiles[0]
    if (!file) return

    setStatus('compressing')
    setProgress(0)
    setStats(null)

    try {
      const result = await processImage(file, preset, validation)

      if (objectUrlRef.current) URL.revokeObjectURL(objectUrlRef.current)
      const localUrl = URL.createObjectURL(result.preview)
      objectUrlRef.current = localUrl
      setPreviewUrl(localUrl)
      setStats(result)

      setStatus('uploading')
      await onUpload(result.upload, result.filename, (percent) => setProgress(percent))
      setStatus('done')
    } catch (err) {
      setStatus('error')
      toast.error(err.message || err.response?.data?.error || 'Échec du traitement de l\'image')
    }
  }, [preset, validation, onUpload])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'image/jpeg': [], 'image/png': [], 'image/webp': [] },
    maxFiles: 1,
    disabled: status === 'compressing' || status === 'uploading'
  })

  const displayUrl = previewUrl || value
  const isBusy = status === 'compressing' || status === 'uploading'

  const dims = {
    sm: 'w-16 h-16',
    md: 'w-24 h-24',
    lg: 'w-32 h-32'
  }[size]

  return (
    <div className="flex items-center gap-4">
      <div
        {...getRootProps()}
        className={`relative ${dims} ${shape === 'circle' ? 'rounded-full' : 'rounded-xl'} overflow-hidden
          bg-gray-100 border-2 border-dashed flex items-center justify-center flex-shrink-0 cursor-pointer
          transition-colors ${isDragActive ? 'border-primary-500 bg-primary-50' : 'border-gray-200 hover:border-primary-300'}`}
      >
        <input {...getInputProps()} />
        {displayUrl ? (
          <img src={displayUrl} alt="" className="w-full h-full object-cover" />
        ) : (
          <PhotoIcon className="h-8 w-8 text-gray-300" />
        )}

        {isBusy && (
          <div className="absolute inset-0 bg-black/50 flex flex-col items-center justify-center text-white text-xs gap-1">
            {status === 'compressing' ? (
              <span>Compression...</span>
            ) : (
              <>
                <div className="w-10 h-10 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                <span>{progress}%</span>
              </>
            )}
          </div>
        )}

        {!isBusy && displayUrl && onDelete && (
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); onDelete() }}
            className="absolute top-1 right-1 bg-white/90 text-red-500 rounded-full p-1 shadow hover:bg-white"
            title="Supprimer"
          >
            <XMarkIcon className="h-3.5 w-3.5" />
          </button>
        )}
      </div>

      <div className="text-sm">
        <p className="font-medium text-gray-700 flex items-center gap-1.5">
          <ArrowUpTrayIcon className="h-4 w-4 text-gray-400" />
          Glissez une image ou cliquez pour choisir
        </p>
        <p className="text-xs text-gray-400 mt-0.5">{helpText}</p>
        {stats && status !== 'compressing' && (
          <p className="text-xs text-green-600 mt-1 flex items-center gap-1">
            <CheckCircleIcon className="h-3.5 w-3.5" />
            {formatBytes(stats.originalSize)} → {formatBytes(stats.uploadSize)} (-{stats.savedPercent}%)
          </p>
        )}
      </div>
    </div>
  )
}
