import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from 'react-query'
import { weddingAPI } from '../../services/api'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'
import toast from 'react-hot-toast'
import {
  HeartIcon,
  PlusIcon,
  MagnifyingGlassIcon,
  EyeIcon,
  PencilIcon,
  TrashIcon,
  UserGroupIcon,
  QrCodeIcon,
  TicketIcon,
  LockClosedIcon,
  CalendarDaysIcon
} from '@heroicons/react/24/outline'

const EVENT_TYPE_LABELS = { WEDDING: 'Mariage', BIRTHDAY: 'Anniversaire', DOT: 'Mariage coutumier', CEREMONY: 'Cérémonie', CONFERENCE: 'Conférence', OTHER: 'Événement' }
const eventDisplayName = (wedding) =>
  (!wedding.eventType || wedding.eventType === 'WEDDING')
    ? `${wedding.brideName} & ${wedding.groomName}`
    : (wedding.eventTitle || EVENT_TYPE_LABELS[wedding.eventType])

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

  const handleDelete = (id, name) => {
    if (window.confirm(`Êtes-vous sûr de vouloir supprimer le mariage "${name}" ?`)) {
      deleteMutation.mutate(id)
    }
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
          <HeartIcon className="h-16 w-16 text-gray-300 mx-auto mb-4" />
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
            const header = wedding.primaryColor
              ? { background: `linear-gradient(135deg, ${wedding.primaryColor}, ${wedding.secondaryColor || wedding.primaryColor})` }
              : undefined
            return (
            <div
              key={wedding.id}
              className="group bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-xl hover:-translate-y-0.5 transition-all duration-300 overflow-hidden flex flex-col"
            >
              {/* Cover / header */}
              <div
                className={`h-36 relative overflow-hidden ${header ? '' : 'bg-gradient-wedding'}`}
                style={header}
              >
                {wedding.coverPhoto ? (
                  <img
                    src={wedding.coverPhoto}
                    alt={eventDisplayName(wedding)}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    loading="lazy"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <HeartIcon className="h-14 w-14 text-white/40" />
                  </div>
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-black/25 to-transparent pointer-events-none" />
                <div className="absolute top-3 left-3">
                  <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-white/90 backdrop-blur-sm text-gray-800 shadow-sm">
                    {EVENT_TYPE_LABELS[wedding.eventType] || 'Mariage'}
                  </span>
                </div>
                <div className="absolute top-3 right-3">
                  {getStatusBadge(effectiveStatus(wedding))}
                </div>
              </div>

              {/* Content */}
              <div className="p-5 flex flex-col flex-1">
                <div className="flex items-start justify-between gap-2 mb-1">
                  <h3 className="text-lg font-serif font-bold text-gray-900 leading-snug">
                    {eventDisplayName(wedding)}
                  </h3>
                  {locked && (
                    <span title="Informations verrouillées (invitations générées)" className="flex-shrink-0 mt-1 text-gray-400">
                      <LockClosedIcon className="h-4 w-4" />
                    </span>
                  )}
                </div>
                <p className="text-sm text-gray-500 mb-4 flex items-center gap-1.5">
                  <CalendarDaysIcon className="h-4 w-4 text-gray-400" />
                  {format(new Date(wedding.weddingDate), 'd MMMM yyyy', { locale: fr })}
                  {wedding.ceremonyTime && ` · ${wedding.ceremonyTime}`}
                </p>

                {/* Stats */}
                <div className="grid grid-cols-3 gap-2 mb-5">
                  {[
                    { icon: UserGroupIcon, value: wedding._count?.guests || 0, label: 'Invités' },
                    { icon: QrCodeIcon, value: wedding._count?.invitations || 0, label: 'Invit.' },
                    { icon: TicketIcon, value: wedding.confirmedGuests || 0, label: 'Confirmés' }
                  ].map((s, i) => (
                    <div key={i} className="flex flex-col items-center justify-center py-2 rounded-lg bg-gray-50">
                      <s.icon className="h-4 w-4 text-primary-500 mb-0.5" />
                      <span className="text-sm font-semibold text-gray-900">{s.value}</span>
                      <span className="text-[10px] text-gray-400">{s.label}</span>
                    </div>
                  ))}
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2 mt-auto">
                  <Link to={`/weddings/${wedding.id}`} className="btn-primary btn-sm flex-1">
                    <EyeIcon className="h-4 w-4 mr-1" />
                    Voir
                  </Link>
                  <Link
                    to={`/weddings/${wedding.id}/edit`}
                    className="btn-secondary btn-sm"
                    title={locked ? 'Informations verrouillées' : 'Modifier'}
                  >
                    <PencilIcon className="h-4 w-4" />
                  </Link>
                  <button
                    onClick={() => handleDelete(wedding.id, eventDisplayName(wedding))}
                    className="btn-ghost btn-sm text-red-600 hover:bg-red-50"
                    disabled={deleteMutation.isLoading}
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
