import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from 'react-query'
import { weddingAPI } from '../../services/api'
import { confirmDialog } from '../../components/common/confirm'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'
import toast from 'react-hot-toast'
import {
  PlusIcon,
  MagnifyingGlassIcon,
  EyeIcon,
  PencilIcon,
  TrashIcon,
  UserGroupIcon,
  QrCodeIcon,
  CheckCircleIcon,
  ArrowUpRightIcon,
  LockClosedIcon,
  CalendarDaysIcon
} from '@heroicons/react/24/outline'

const EVENT_TYPE_LABELS = { WEDDING: 'Mariage', BIRTHDAY: 'Anniversaire', DOT: 'Mariage coutumier', CEREMONY: 'Cérémonie', CONFERENCE: 'Conférence', OTHER: 'Événement' }
const eventDisplayName = (wedding) =>
  (!wedding.eventType || wedding.eventType === 'WEDDING')
    ? `${wedding.brideName} & ${wedding.groomName}`
    : (wedding.eventTitle || EVENT_TYPE_LABELS[wedding.eventType])

// Monogram initials for the cover when there is no cover photo.
const eventInitials = (w) => {
  if (!w.eventType || w.eventType === 'WEDDING') {
    const a = (w.brideName || '').trim()[0] || ''
    const b = (w.groomName || '').trim()[0] || ''
    return ((a + b).toUpperCase()) || '♥'
  }
  const title = (w.eventTitle || EVENT_TYPE_LABELS[w.eventType] || 'E').trim()
  const parts = title.split(/\s+/).filter(Boolean)
  return (((parts[0]?.[0] || '') + (parts[1]?.[0] || '')).toUpperCase()) || title[0]?.toUpperCase() || 'E'
}

// Elegant cover — real photo when present, otherwise an invitation-style
// monogram on a neutral surface with a soft orange accent (winvitepro style).
function EventCover({ wedding, name }) {
  if (wedding.coverPhoto) {
    return (
      <div className="relative h-36 overflow-hidden">
        <img src={wedding.coverPhoto} alt={name} loading="lazy" className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/35 to-transparent" />
      </div>
    )
  }
  return (
    <div className="relative h-36 overflow-hidden bg-surface-2">
      <div className="pointer-events-none absolute -right-10 -top-10 h-40 w-40 rounded-full bg-primary-500/15 blur-2xl" />
      <div
        className="pointer-events-none absolute inset-0 opacity-60"
        style={{
          backgroundImage: 'radial-gradient(circle at 1px 1px, rgb(var(--muted) / 0.25) 1px, transparent 0)',
          backgroundSize: '22px 22px',
          maskImage: 'radial-gradient(ellipse 70% 80% at 50% 50%, black 30%, transparent 75%)',
          WebkitMaskImage: 'radial-gradient(ellipse 70% 80% at 50% 50%, black 30%, transparent 75%)',
        }}
      />
      <div className="absolute inset-0 flex items-center justify-center">
        <span className="grid h-14 w-14 place-items-center rounded-full border border-primary-500/30 bg-bg/70 font-serif text-lg font-bold text-primary-600 backdrop-blur">
          {eventInitials(wedding)}
        </span>
      </div>
    </div>
  )
}

export default function Weddings() {
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const queryClient = useQueryClient()

  const { data, isLoading } = useQuery(
    ['weddings', { search, status: statusFilter }],
    () => weddingAPI.getAll({ search, status: statusFilter })
  )

  const deleteMutation = useMutation(
    (id) => weddingAPI.delete(id),
    {
      onSuccess: () => {
        toast.success('Événement supprimé avec succès')
        queryClient.invalidateQueries('weddings')
      },
      onError: (error) => {
        toast.error(error.response?.data?.error || 'Erreur lors de la suppression')
      }
    }
  )

  const weddings = data?.data?.weddings || []

  const handleDelete = async (id, name) => {
    const ok = await confirmDialog({
      title: 'Supprimer l’événement',
      message: `Voulez-vous vraiment supprimer « ${name} » ? Cette action est irréversible.`,
      confirmText: 'Supprimer'
    })
    if (ok) deleteMutation.mutate(id)
  }

  // Effective status: a DRAFT event that already has invitations is live, and a
  // past event is finished. Keeps the badge meaningful without manual updates.
  const effectiveStatus = (w) => {
    if (w.status === 'CANCELLED') return 'CANCELLED'
    const hasInvitations = (w._count?.invitations || 0) > 0
    if (hasInvitations && w.weddingDate && new Date(w.weddingDate) < new Date()) return 'COMPLETED'
    if (w.status === 'DRAFT' && hasInvitations) return 'ACTIVE'
    return w.status
  }

  const STATUS_META = {
    ACTIVE: { label: 'Actif', dot: 'bg-green-500', cls: 'bg-green-50 text-green-700 border-green-200' },
    DRAFT: { label: 'Brouillon', dot: 'bg-amber-500', cls: 'bg-amber-50 text-amber-700 border-amber-200' },
    COMPLETED: { label: 'Terminé', dot: 'bg-blue-500', cls: 'bg-blue-50 text-blue-700 border-blue-200' },
    CANCELLED: { label: 'Annulé', dot: 'bg-red-500', cls: 'bg-red-50 text-red-700 border-red-200' }
  }

  const getStatusBadge = (status) => {
    const m = STATUS_META[status] || { label: status, dot: 'bg-gray-400', cls: 'bg-gray-50 text-gray-600 border-gray-200' }
    return (
      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${m.cls}`}>
        <span className={`w-1.5 h-1.5 rounded-full ${m.dot}`} />
        {m.label}
      </span>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-serif font-bold text-gray-900">
            Mes événements
          </h1>
          <p className="text-gray-600 mt-1">
            Gérez vos événements et invitations
          </p>
        </div>
        <Link to="/weddings/new" className="btn-primary">
          <PlusIcon className="h-5 w-5 mr-2" />
          Nouvel événement
        </Link>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
          <input
            type="text"
            placeholder="Rechercher..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="input pl-10"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="input w-full sm:w-48"
        >
          <option value="">Tous les statuts</option>
          <option value="DRAFT">Brouillon</option>
          <option value="ACTIVE">Actif</option>
          <option value="COMPLETED">Terminé</option>
          <option value="CANCELLED">Annulé</option>
        </select>
      </div>

      {/* Wedding List */}
      {isLoading ? (
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Chargement...</p>
        </div>
      ) : weddings.length === 0 ? (
        <div className="bg-white rounded-xl shadow-lg p-12 text-center">
          <CalendarDaysIcon className="h-16 w-16 text-gray-300 mx-auto mb-4" />
          <h2 className="text-xl font-medium text-gray-900 mb-2">
            Aucun événement trouvé
          </h2>
          <p className="text-gray-500 mb-6">
            {search || statusFilter
              ? 'Aucun résultat ne correspond à votre recherche'
              : 'Commencez par créer votre premier événement'}
          </p>
          <Link to="/weddings/new" className="btn-primary">
            <PlusIcon className="h-5 w-5 mr-2" />
            Créer un événement
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {weddings.map((wedding) => {
            const locked = (wedding._count?.invitations || 0) > 0
            const name = eventDisplayName(wedding)
            return (
            <div
              key={wedding.id}
              className="group relative flex flex-col overflow-hidden rounded-2xl border border-border bg-surface shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-primary-500/40 hover:shadow-md"
            >
              {/* Cover */}
              <div className="relative">
                <EventCover wedding={wedding} name={name} />
                <span className="absolute left-3 top-3 rounded-full border border-border bg-surface/90 px-2.5 py-1 text-xs font-medium text-content backdrop-blur">
                  {EVENT_TYPE_LABELS[wedding.eventType] || 'Mariage'}
                </span>
                <span className="absolute right-3 top-3">
                  {getStatusBadge(effectiveStatus(wedding))}
                </span>
              </div>

              {/* Body */}
              <div className="flex flex-1 flex-col p-5">
                <div className="flex items-start justify-between gap-2">
                  <h3 className="font-serif text-lg font-bold leading-snug text-content">{name}</h3>
                  {locked ? (
                    <span title="Informations verrouillées (invitations générées)" className="mt-1 shrink-0 text-muted">
                      <LockClosedIcon className="h-4 w-4" />
                    </span>
                  ) : (
                    <ArrowUpRightIcon className="mt-1 h-4 w-4 shrink-0 text-muted transition-colors group-hover:text-primary-500" />
                  )}
                </div>
                <p className="mt-1 flex items-center gap-1.5 text-sm text-muted">
                  <CalendarDaysIcon className="h-4 w-4" />
                  {format(new Date(wedding.weddingDate), 'd MMMM yyyy', { locale: fr })}
                  {wedding.ceremonyTime && ` · ${wedding.ceremonyTime}`}
                </p>

                {/* Stats */}
                <div className="mt-4 grid grid-cols-3 gap-2">
                  {[
                    { icon: UserGroupIcon, value: wedding._count?.guests || 0, label: 'Invités' },
                    { icon: QrCodeIcon, value: wedding._count?.invitations || 0, label: 'Invit.' },
                    { icon: CheckCircleIcon, value: wedding.confirmedGuests || 0, label: 'Confirmés' }
                  ].map((s, i) => (
                    <div key={i} className="flex flex-col items-center rounded-xl bg-bg py-2.5">
                      <s.icon className="mb-0.5 h-4 w-4 text-primary-500" />
                      <span className="text-sm font-semibold text-content">{s.value}</span>
                      <span className="text-[0.65rem] text-muted">{s.label}</span>
                    </div>
                  ))}
                </div>

                {/* Actions */}
                <div className="mt-auto flex items-center gap-2 pt-5">
                  <Link
                    to={`/weddings/${wedding.id}`}
                    className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-primary-500 px-3 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-primary-600"
                  >
                    <EyeIcon className="h-4 w-4" /> Voir
                  </Link>
                  <Link
                    to={`/weddings/${wedding.id}/edit`}
                    className="inline-flex items-center justify-center rounded-xl border border-border bg-surface px-3 py-2.5 text-content transition-colors hover:bg-surface-2"
                    title={locked ? 'Informations verrouillées' : 'Modifier'}
                  >
                    <PencilIcon className="h-4 w-4" />
                  </Link>
                  <button
                    onClick={() => handleDelete(wedding.id, name)}
                    className="inline-flex items-center justify-center rounded-xl px-3 py-2.5 text-red-600 transition-colors hover:bg-red-50 disabled:opacity-50 dark:hover:bg-red-500/10"
                    disabled={deleteMutation.isLoading}
                    title="Supprimer"
                  >
                    <TrashIcon className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>
          )})}
        </div>
      )}
    </div>
  )
}
