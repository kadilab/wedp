import { useEffect, useMemo, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import toast from 'react-hot-toast'
import {
  ArrowDownTrayIcon,
  CheckIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  PhotoIcon,
  XMarkIcon
} from '@heroicons/react/24/outline'
import { guestbookAPI } from '../../services/api'
import { canShareImages, prefetchPhoto, saveFiles } from '../../utils/savePhotos'

const fileBase = (post, eventTitle) => `${eventTitle || 'livre-dor'}-${post.authorName || 'invite'}-${post.id.slice(0, 4)}`

/**
 * Photos shared on the guestbook, for the guests themselves: grid, full-screen
 * viewer, and a selection mode to save the chosen photos. On a phone the
 * pictures go straight to the gallery through the native share sheet (no ZIP).
 */
export default function GuestbookGallery({ slug, posts, photoCount, canDownload, eventTitle }) {
  const photos = useMemo(() => posts.filter(p => p.photoUrl), [posts])
  const [openIndex, setOpenIndex] = useState(null)
  const [selecting, setSelecting] = useState(false)
  const [selected, setSelected] = useState(() => new Set())
  const [saving, setSaving] = useState(false)
  // Files ready but the phone wants a fresh tap before opening the share sheet.
  const [pendingFiles, setPendingFiles] = useState(null)
  const isPhone = useMemo(() => canShareImages(), [])
  const current = openIndex != null ? photos[openIndex] : null

  const go = (delta) => setOpenIndex(i => (i + delta + photos.length) % photos.length)

  useEffect(() => {
    if (openIndex == null) return
    const onKey = (e) => {
      if (e.key === 'Escape') setOpenIndex(null)
      if (e.key === 'ArrowRight') go(1)
      if (e.key === 'ArrowLeft') go(-1)
    }
    window.addEventListener('keydown', onKey)
    document.body.style.overflow = 'hidden'
    return () => {
      window.removeEventListener('keydown', onKey)
      document.body.style.overflow = ''
    }
  })

  // Prefetch as soon as a photo is chosen, so "Enregistrer" is instant.
  const prefetch = (post) => prefetchPhoto(post.photoUrl, fileBase(post, eventTitle)).catch(() => {})

  const toggle = (post) => {
    setSelected(prev => {
      const next = new Set(prev)
      if (next.has(post.id)) next.delete(post.id)
      else { next.add(post.id); prefetch(post) }
      return next
    })
  }

  const allSelected = photos.length > 0 && selected.size === photos.length
  const toggleAll = () => {
    if (allSelected) return setSelected(new Set())
    photos.forEach(prefetch)
    setSelected(new Set(photos.map(p => p.id)))
  }

  const stopSelecting = () => {
    setSelecting(false)
    setSelected(new Set())
  }

  const report = (result, count) => {
    if (result === 'shared') toast.success(count > 1 ? `${count} photos prêtes à être enregistrées` : 'Photo prête à être enregistrée')
    if (result === 'downloaded') toast.success(count > 1 ? `${count} photos téléchargées` : 'Photo téléchargée')
  }

  const save = async (list) => {
    if (!list.length) return
    setSaving(true)
    try {
      const files = await Promise.all(list.map(post => prefetchPhoto(post.photoUrl, fileBase(post, eventTitle))))
      const result = await saveFiles(files, { title: eventTitle })
      if (result === 'needs-tap') {
        setPendingFiles(files)
        return
      }
      report(result, files.length)
      if (result !== 'cancelled' && list.length > 1) stopSelecting()
    } catch {
      toast.error('Impossible de récupérer les photos. Vérifiez votre connexion et réessayez.')
    } finally {
      setSaving(false)
    }
  }

  const savePending = async () => {
    const files = pendingFiles
    setPendingFiles(null)
    const result = await saveFiles(files, { title: eventTitle })
    report(result, files.length)
    if (result !== 'cancelled' && files.length > 1) stopSelecting()
  }

  if (photos.length === 0) {
    return (
      <div className="mt-8 rounded-2xl border border-dashed border-gray-200 bg-white/60 p-6 text-center text-sm text-gray-400">
        <PhotoIcon className="mx-auto mb-2 h-8 w-8" />
        Aucune photo partagée pour l’instant — soyez le premier !
      </div>
    )
  }

  const total = photoCount || photos.length
  const saveLabel = isPhone ? 'Enregistrer' : 'Télécharger'
  const selectedPosts = photos.filter(p => selected.has(p.id))

  return (
    <section className={`mt-8 ${selecting ? 'pb-24' : ''}`}>
      <div className="mb-3 flex items-end justify-between gap-3">
        <div className="min-w-0">
          <h2 className="font-serif text-lg font-semibold text-gray-900">Photos partagées</h2>
          <p className="text-xs text-gray-500">
            {selecting
              ? 'Touchez les photos à enregistrer'
              : `${total} photo${total > 1 ? 's' : ''} · touchez une photo pour l’agrandir`}
          </p>
        </div>
        {canDownload && (
          selecting ? (
            <button type="button" onClick={toggleAll} className="btn-outline btn-sm shrink-0">
              {allSelected ? 'Tout désélectionner' : 'Tout sélectionner'}
            </button>
          ) : (
            <button
              type="button"
              onClick={() => setSelecting(true)}
              className="btn-outline btn-sm inline-flex shrink-0 items-center gap-1.5"
            >
              <ArrowDownTrayIcon className="h-4 w-4" />
              Choisir des photos
            </button>
          )
        )}
      </div>

      <div className="grid grid-cols-3 gap-1.5">
        {photos.map((post, i) => {
          const isSel = selected.has(post.id)
          return (
            <button
              key={post.id}
              type="button"
              onClick={() => (selecting ? toggle(post) : setOpenIndex(i))}
              className={`group relative aspect-square overflow-hidden rounded-lg bg-gray-100 ${isSel ? 'ring-4 ring-primary-500 ring-offset-1' : ''}`}
              aria-label={selecting ? `${isSel ? 'Retirer' : 'Choisir'} la photo de ${post.authorName}` : `Photo de ${post.authorName}`}
              aria-pressed={selecting ? isSel : undefined}
            >
              <img
                src={post.photoUrl}
                alt=""
                loading="lazy"
                className={`h-full w-full object-cover transition ${isSel ? 'scale-95 opacity-80' : 'group-hover:scale-105'}`}
              />
              {selecting && (
                <span
                  className={`absolute right-1.5 top-1.5 flex h-6 w-6 items-center justify-center rounded-full border-2 ${isSel ? 'border-primary-500 bg-primary-500 text-white' : 'border-white bg-black/30'}`}
                >
                  {isSel && <CheckIcon className="h-4 w-4" strokeWidth={3} />}
                </span>
              )}
            </button>
          )
        })}
      </div>
      {photoCount > photos.length && (
        <p className="mt-2 text-center text-xs text-gray-400">Les {photos.length} photos les plus récentes sont affichées.</p>
      )}
      {canDownload && !isPhone && !selecting && (
        <p className="mt-3 text-center text-xs text-gray-400">
          Sur ordinateur, vous pouvez aussi{' '}
          <a href={guestbookAPI.photosZipUrl(slug)} download className="underline hover:text-gray-600">tout télécharger en un fichier ZIP</a>.
        </p>
      )}

      {/* Selection bar */}
      <AnimatePresence>
        {selecting && (
          <motion.div
            initial={{ y: 80 }}
            animate={{ y: 0 }}
            exit={{ y: 80 }}
            className="fixed inset-x-0 bottom-0 z-40 border-t border-gray-200 bg-white/95 px-4 py-3 shadow-lg backdrop-blur"
            style={{ paddingBottom: 'max(0.75rem, env(safe-area-inset-bottom))' }}
          >
            <div className="mx-auto flex max-w-md items-center gap-3">
              <button type="button" onClick={stopSelecting} className="btn-ghost btn-sm">Annuler</button>
              <p className="flex-1 text-center text-sm text-gray-600">
                {selected.size === 0 ? 'Aucune photo' : `${selected.size} photo${selected.size > 1 ? 's' : ''}`}
              </p>
              <button
                type="button"
                onClick={() => save(selectedPosts)}
                disabled={selected.size === 0 || saving}
                className="btn-primary btn-sm inline-flex items-center gap-1.5"
              >
                <ArrowDownTrayIcon className="h-4 w-4" />
                {saving ? 'Préparation…' : saveLabel}
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* The phone asks for a fresh tap before opening its share sheet */}
      {pendingFiles && (
        <div className="fixed inset-0 z-[60] flex items-end justify-center bg-black/50 p-4 sm:items-center" onClick={() => setPendingFiles(null)}>
          <div className="w-full max-w-sm rounded-2xl bg-white p-5 text-center" onClick={(e) => e.stopPropagation()}>
            <p className="font-semibold text-gray-900">
              {pendingFiles.length > 1 ? `${pendingFiles.length} photos prêtes` : 'Photo prête'}
            </p>
            <p className="mt-1 text-sm text-gray-500">Touchez le bouton puis choisissez « Enregistrer les images ».</p>
            <button type="button" onClick={savePending} className="btn-primary mt-4 w-full">
              Enregistrer sur mon téléphone
            </button>
          </div>
        </div>
      )}

      <AnimatePresence>
        {current && (
          <motion.div
            className="fixed inset-0 z-50 flex flex-col bg-black"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            role="dialog"
            aria-modal="true"
          >
            <div className="flex items-center justify-between gap-3 px-4 py-3 text-white">
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold">{current.authorName}</p>
                <p className="text-xs text-white/60">{openIndex + 1} / {photos.length}</p>
              </div>
              <div className="flex items-center gap-2">
                {canDownload && (
                  <button
                    type="button"
                    onClick={() => save([current])}
                    onPointerEnter={() => prefetch(current)}
                    disabled={saving}
                    className="inline-flex items-center gap-1.5 rounded-full bg-white px-3 py-1.5 text-sm font-medium text-gray-900 disabled:opacity-60"
                  >
                    <ArrowDownTrayIcon className="h-4 w-4" />
                    {saving ? '…' : saveLabel}
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setOpenIndex(null)}
                  className="rounded-full p-2 text-white/80 hover:bg-white/10"
                  aria-label="Fermer"
                >
                  <XMarkIcon className="h-6 w-6" />
                </button>
              </div>
            </div>

            <div className="relative flex min-h-0 flex-1 items-center justify-center px-2" onClick={() => setOpenIndex(null)}>
              <img
                src={current.photoUrl}
                alt=""
                className="max-h-full max-w-full object-contain"
                onLoad={() => canDownload && prefetch(current)}
                onClick={(e) => e.stopPropagation()}
              />
              {photos.length > 1 && (
                <>
                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); go(-1) }}
                    className="absolute left-2 rounded-full bg-black/40 p-2 text-white hover:bg-black/60"
                    aria-label="Photo précédente"
                  >
                    <ChevronLeftIcon className="h-6 w-6" />
                  </button>
                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); go(1) }}
                    className="absolute right-2 rounded-full bg-black/40 p-2 text-white hover:bg-black/60"
                    aria-label="Photo suivante"
                  >
                    <ChevronRightIcon className="h-6 w-6" />
                  </button>
                </>
              )}
            </div>

            {current.message && (
              <p className="px-4 pb-5 pt-2 text-center text-sm text-white/80">« {current.message} »</p>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  )
}
