import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from 'react-query'
import { guestbookAPI, weddingAPI } from '../../services/api'
import toast from 'react-hot-toast'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'
import { QRCodeCanvas } from 'qrcode.react'
import {
  ArrowLeftIcon,
  CheckIcon,
  XMarkIcon,
  TrashIcon,
  TvIcon,
  ClipboardDocumentIcon
} from '@heroicons/react/24/outline'

export default function Guestbook() {
  const { id: weddingId } = useParams()
  const queryClient = useQueryClient()
  const [tab, setTab] = useState('pending') // pending | approved

  const { data: weddingData } = useQuery(['wedding', weddingId], () => weddingAPI.getOne(weddingId))
  const wedding = weddingData?.data?.wedding

  const { data, isLoading } = useQuery(['guestbook', weddingId], () => guestbookAPI.list(weddingId))
  const posts = data?.data?.posts || []
  const settings = data?.data?.settings || { guestbookEnabled: true, guestbookAutoApprove: true }

  const pending = posts.filter(p => p.status === 'PENDING')
  const approved = posts.filter(p => p.status === 'APPROVED')

  const invalidate = () => queryClient.invalidateQueries(['guestbook', weddingId])

  const moderateMutation = useMutation(
    ({ postId, status }) => guestbookAPI.moderate(weddingId, postId, status),
    {
      onSuccess: (_, { status }) => {
        toast.success(status === 'APPROVED' ? 'Publication approuvée' : 'Publication rejetée')
        invalidate()
      },
      onError: () => toast.error('Erreur lors de la modération')
    }
  )

  const deleteMutation = useMutation(
    (postId) => guestbookAPI.remove(weddingId, postId),
    {
      onSuccess: () => { toast.success('Publication supprimée'); invalidate() },
      onError: () => toast.error('Erreur lors de la suppression')
    }
  )

  const settingsMutation = useMutation(
    (patch) => guestbookAPI.updateSettings(weddingId, patch),
    {
      onSuccess: () => invalidate(),
      onError: () => toast.error('Erreur lors de la mise à jour des réglages')
    }
  )

  const wallUrl = wedding ? `${window.location.origin}/gb/${wedding.slug}` : ''
  const displayUrl = wedding ? `${window.location.origin}/gb/${wedding.slug}/display` : ''

  const copyLink = () => {
    navigator.clipboard.writeText(wallUrl)
    toast.success('Lien copié')
  }

  const list = tab === 'pending' ? pending : approved

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3">
        <Link
          to={`/weddings/${weddingId}`}
          className="inline-flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-sm font-medium text-muted transition-colors hover:bg-surface-2 hover:text-content"
        >
          <ArrowLeftIcon className="h-4 w-4" />
          Retour à l'événement
        </Link>
        {wedding && (
          <a
            href={displayUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="btn-primary btn-sm inline-flex items-center gap-1.5"
          >
            <TvIcon className="h-4 w-4" />
            Ouvrir l'affichage live
          </a>
        )}
      </div>

      <h1 className="font-serif text-2xl font-bold text-content">Livre d'or numérique</h1>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* QR + settings */}
        <div className="space-y-6 lg:col-span-1">
          <div className="rounded-2xl border border-border bg-surface p-6 text-center">
            <h3 className="mb-4 font-semibold text-content">QR du mur photos</h3>
            {wedding && (
              <div className="mx-auto inline-block rounded-xl bg-white p-3">
                <QRCodeCanvas value={wallUrl} size={180} />
              </div>
            )}
            <p className="mt-3 break-all text-xs text-muted">{wallUrl}</p>
            <button onClick={copyLink} className="btn-outline btn-sm mt-3 inline-flex items-center gap-1.5">
              <ClipboardDocumentIcon className="h-4 w-4" />
              Copier le lien
            </button>
            <p className="mt-3 text-xs text-muted">
              Affichez ce QR à l'entrée ou sur les tables : les invités scannent pour poster une photo ou un message.
            </p>
          </div>

          <div className="rounded-2xl border border-border bg-surface p-6">
            <h3 className="mb-4 font-semibold text-content">Réglages</h3>
            <label className="flex items-center justify-between gap-3 py-2">
              <span className="text-sm text-content">Livre d'or activé</span>
              <input
                type="checkbox"
                checked={settings.guestbookEnabled}
                onChange={(e) => settingsMutation.mutate({ guestbookEnabled: e.target.checked })}
                className="h-5 w-9 shrink-0 accent-primary-600"
              />
            </label>
            <label className="flex items-center justify-between gap-3 py-2">
              <span className="text-sm text-content">Publication automatique</span>
              <input
                type="checkbox"
                checked={settings.guestbookAutoApprove}
                onChange={(e) => settingsMutation.mutate({ guestbookAutoApprove: e.target.checked })}
                className="h-5 w-9 shrink-0 accent-primary-600"
              />
            </label>
            <p className="mt-2 text-xs text-muted">
              Si désactivée, chaque publication attend votre validation avant d'apparaître sur le mur.
            </p>
          </div>
        </div>

        {/* Posts */}
        <div className="lg:col-span-2">
          <div className="mb-4 flex gap-2">
            <button
              onClick={() => setTab('pending')}
              className={`rounded-lg px-4 py-2 text-sm font-medium ${tab === 'pending' ? 'bg-primary-600 text-white' : 'bg-surface-2 text-muted'}`}
            >
              En attente {pending.length > 0 && `(${pending.length})`}
            </button>
            <button
              onClick={() => setTab('approved')}
              className={`rounded-lg px-4 py-2 text-sm font-medium ${tab === 'approved' ? 'bg-primary-600 text-white' : 'bg-surface-2 text-muted'}`}
            >
              Publiées {approved.length > 0 && `(${approved.length})`}
            </button>
          </div>

          {isLoading ? (
            <p className="text-muted">Chargement...</p>
          ) : list.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-border p-10 text-center text-muted">
              {tab === 'pending' ? 'Aucune publication en attente.' : 'Aucune publication pour le moment.'}
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              {list.map((post) => (
                <div key={post.id} className="overflow-hidden rounded-2xl border border-border bg-surface">
                  {post.photoUrl && (
                    <img src={post.photoUrl} alt="" className="h-48 w-full object-cover" />
                  )}
                  <div className="p-4">
                    <div className="flex items-center justify-between">
                      <p className="font-semibold text-content">{post.authorName}</p>
                      <span className="text-xs text-muted">
                        {format(new Date(post.createdAt), 'd MMM HH:mm', { locale: fr })}
                      </span>
                    </div>
                    {post.message && <p className="mt-1 text-sm text-muted">{post.message}</p>}
                    <div className="mt-3 flex gap-2">
                      {tab === 'pending' && (
                        <>
                          <button
                            onClick={() => moderateMutation.mutate({ postId: post.id, status: 'APPROVED' })}
                            className="btn-primary btn-sm inline-flex items-center gap-1.5"
                          >
                            <CheckIcon className="h-4 w-4" /> Approuver
                          </button>
                          <button
                            onClick={() => moderateMutation.mutate({ postId: post.id, status: 'REJECTED' })}
                            className="btn-outline btn-sm inline-flex items-center gap-1.5"
                          >
                            <XMarkIcon className="h-4 w-4" /> Rejeter
                          </button>
                        </>
                      )}
                      <button
                        onClick={() => deleteMutation.mutate(post.id)}
                        className="btn-ghost btn-sm ml-auto inline-flex items-center gap-1.5 text-red-500"
                      >
                        <TrashIcon className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
