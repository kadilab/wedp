import { Link, useParams } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from 'react-query'
import { collaboratorAPI, weddingAPI } from '../../services/api'
import toast from 'react-hot-toast'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'
import {
  ArrowLeftIcon,
  UserPlusIcon,
  ClipboardDocumentIcon,
  TrashIcon,
  ClockIcon,
  CheckCircleIcon
} from '@heroicons/react/24/outline'

export default function Collaborators() {
  const { id: weddingId } = useParams()
  const queryClient = useQueryClient()

  const { data: weddingData } = useQuery(['wedding', weddingId], () => weddingAPI.getOne(weddingId))
  const wedding = weddingData?.data?.wedding

  const { data, isLoading } = useQuery(['collaborators', weddingId], () => collaboratorAPI.list(weddingId))
  const collaborators = data?.data?.collaborators || []

  const invalidate = () => queryClient.invalidateQueries(['collaborators', weddingId])

  const inviteMutation = useMutation(() => collaboratorAPI.inviteLink(weddingId), {
    onSuccess: (res) => {
      navigator.clipboard.writeText(res.data.url)
      toast.success('Lien généré et copié dans le presse-papier')
      invalidate()
    },
    onError: (err) => toast.error(err.response?.data?.error || 'Erreur lors de la génération du lien')
  })

  const removeMutation = useMutation((collaboratorId) => collaboratorAPI.remove(weddingId, collaboratorId), {
    onSuccess: () => { toast.success('Collaborateur retiré'); invalidate() },
    onError: () => toast.error('Erreur lors du retrait')
  })

  const copyLink = (url) => {
    navigator.clipboard.writeText(url)
    toast.success('Lien copié')
  }

  const pending = collaborators.filter(c => c.status === 'PENDING')
  const accepted = collaborators.filter(c => c.status === 'ACCEPTED')

  return (
    <div className="space-y-6">
      <Link
        to={`/weddings/${weddingId}`}
        className="inline-flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-sm font-medium text-muted transition-colors hover:bg-surface-2 hover:text-content"
      >
        <ArrowLeftIcon className="h-4 w-4" />
        Retour à l'événement
      </Link>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-serif text-2xl font-bold text-content">Collaborateurs</h1>
          {wedding && <p className="text-sm text-muted">{wedding.brideName ? `${wedding.brideName} & ${wedding.groomName}` : wedding.eventTitle}</p>}
        </div>
        <button
          onClick={() => inviteMutation.mutate()}
          disabled={inviteMutation.isLoading}
          className="btn-primary inline-flex items-center gap-1.5"
        >
          <UserPlusIcon className="h-4 w-4" />
          {inviteMutation.isLoading ? 'Génération...' : 'Générer un lien d\'invitation'}
        </button>
      </div>

      <div className="rounded-2xl border border-border bg-surface p-6">
        <p className="text-sm text-muted">
          Un collaborateur (co-organisateur, témoin...) a accès aux invités, invitations, check-in,
          plan de table et livre d'or de cet événement — mais ne peut pas le supprimer, gérer les
          paiements, ni inviter d'autres collaborateurs. Maximum 5 collaborateurs actifs.
        </p>
      </div>

      {isLoading ? (
        <p className="text-muted">Chargement...</p>
      ) : (
        <div className="space-y-4">
          {pending.length > 0 && (
            <div className="rounded-2xl border border-border bg-surface p-6">
              <h3 className="mb-4 font-semibold text-content">Invitations en attente</h3>
              <div className="space-y-3">
                {pending.map((c) => (
                  <div key={c.id} className="flex items-center justify-between gap-3 rounded-xl bg-surface-2 px-4 py-3">
                    <div className="flex min-w-0 items-center gap-2 text-sm text-muted">
                      <ClockIcon className="h-4 w-4 shrink-0 text-amber-500" />
                      <span className="truncate">{c.url}</span>
                    </div>
                    <div className="flex shrink-0 gap-2">
                      <button onClick={() => copyLink(c.url)} className="btn-ghost btn-sm inline-flex items-center gap-1.5">
                        <ClipboardDocumentIcon className="h-4 w-4" /> Copier
                      </button>
                      <button onClick={() => removeMutation.mutate(c.id)} className="btn-ghost btn-sm text-red-500">
                        <TrashIcon className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="rounded-2xl border border-border bg-surface p-6">
            <h3 className="mb-4 font-semibold text-content">Collaborateurs actifs</h3>
            {accepted.length === 0 ? (
              <p className="py-4 text-center text-muted">Aucun collaborateur pour le moment.</p>
            ) : (
              <div className="space-y-3">
                {accepted.map((c) => (
                  <div key={c.id} className="flex items-center justify-between gap-3 rounded-xl bg-surface-2 px-4 py-3">
                    <div className="flex items-center gap-2 text-sm">
                      <CheckCircleIcon className="h-4 w-4 shrink-0 text-emerald-500" />
                      <div>
                        <p className="font-medium text-content">{c.user?.firstName} {c.user?.lastName}</p>
                        <p className="text-xs text-muted">
                          {c.user?.email} · depuis le {format(new Date(c.acceptedAt || c.createdAt), 'd MMM yyyy', { locale: fr })}
                        </p>
                      </div>
                    </div>
                    <button onClick={() => removeMutation.mutate(c.id)} className="btn-outline btn-sm text-red-500">
                      Retirer
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
