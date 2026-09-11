import { useState, useRef } from 'react'
import { useParams } from 'react-router-dom'
import { useQuery, useMutation } from 'react-query'
import { guestbookAPI } from '../../services/api'
import { motion } from 'framer-motion'
import { CameraIcon, CheckCircleIcon, XCircleIcon } from '@heroicons/react/24/outline'

export default function GuestbookSubmit() {
  const { slug } = useParams()
  const [authorName, setAuthorName] = useState('')
  const [message, setMessage] = useState('')
  const [photo, setPhoto] = useState(null)
  const [preview, setPreview] = useState(null)
  const [sent, setSent] = useState(false)
  const fileInputRef = useRef(null)

  const { data, isLoading, isError } = useQuery(['guestbook-wall-info', slug], () => guestbookAPI.getWall(slug))
  const wedding = data?.data?.wedding

  const submitMutation = useMutation(
    () => guestbookAPI.submit(slug, { authorName, message, photo }),
    { onSuccess: () => setSent(true) }
  )

  const handlePhotoChange = (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    setPhoto(file)
    setPreview(URL.createObjectURL(file))
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    if (!authorName.trim() || (!message.trim() && !photo)) return
    submitMutation.mutate()
  }

  if (isLoading) {
    return <div className="flex min-h-screen items-center justify-center bg-gray-50 text-gray-400">Chargement...</div>
  }

  if (isError || !wedding) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-3 bg-gray-50 px-6 text-center">
        <XCircleIcon className="h-12 w-12 text-gray-300" />
        <p className="text-gray-500">Le livre d'or n'est pas disponible pour cet événement.</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-primary-50 via-white to-white px-4 py-10">
      <div className="mx-auto max-w-md">
        <div className="text-center">
          <p className="text-xs uppercase tracking-[0.3em] text-primary-500">Livre d'or</p>
          <h1 className="mt-2 font-serif text-2xl font-bold text-gray-900">{wedding.title}</h1>
        </div>

        {sent ? (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-10 flex flex-col items-center gap-3 rounded-2xl border border-primary-100 bg-white p-8 text-center shadow-sm"
          >
            <CheckCircleIcon className="h-12 w-12 text-primary-500" />
            <p className="text-lg font-semibold text-gray-900">Merci {authorName} !</p>
            <p className="text-sm text-gray-500">{submitMutation.data?.data?.message || 'Votre publication a bien été envoyée.'}</p>
            <button
              onClick={() => { setSent(false); setAuthorName(''); setMessage(''); setPhoto(null); setPreview(null) }}
              className="btn-outline btn-sm mt-2"
            >
              Publier un autre message
            </button>
          </motion.div>
        ) : (
          <form onSubmit={handleSubmit} className="mt-8 space-y-4 rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
            <div>
              <label className="label">Votre nom</label>
              <input
                type="text"
                value={authorName}
                onChange={(e) => setAuthorName(e.target.value)}
                placeholder="Ex : Sarah K."
                className="input"
                maxLength={80}
                required
              />
            </div>

            <div>
              <label className="label">Votre message</label>
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Un mot doux pour les mariés..."
                rows={3}
                maxLength={500}
                className="input"
              />
            </div>

            <div>
              <label className="label">Photo (optionnelle)</label>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handlePhotoChange}
                className="hidden"
              />
              {preview ? (
                <div className="relative">
                  <img src={preview} alt="" className="h-48 w-full rounded-xl object-cover" />
                  <button
                    type="button"
                    onClick={() => { setPhoto(null); setPreview(null); if (fileInputRef.current) fileInputRef.current.value = '' }}
                    className="absolute right-2 top-2 rounded-full bg-black/60 p-1.5 text-white"
                  >
                    <XCircleIcon className="h-5 w-5" />
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="flex h-32 w-full flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-gray-200 text-gray-400 hover:border-primary-300 hover:text-primary-500"
                >
                  <CameraIcon className="h-8 w-8" />
                  <span className="text-sm">Ajouter une photo</span>
                </button>
              )}
            </div>

            <button
              type="submit"
              disabled={submitMutation.isLoading || !authorName.trim() || (!message.trim() && !photo)}
              className="btn-primary w-full"
            >
              {submitMutation.isLoading ? 'Envoi...' : 'Publier'}
            </button>

            {submitMutation.isError && (
              <p className="text-center text-sm text-red-500">
                {submitMutation.error?.response?.data?.error || 'Une erreur est survenue, réessayez.'}
              </p>
            )}
          </form>
        )}
      </div>
    </div>
  )
}
