import { Link, useParams, useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from 'react-query'
import { weddingAPI } from '../../services/api'
import PrintSection from '../../components/invitations/PrintSection'
import { eventUsesTables, EVENT_TYPE_LABELS } from '../../utils/eventTypes'
import { tableName } from '../../utils/tables'
import { format, differenceInCalendarDays } from 'date-fns'
import { fr } from 'date-fns/locale'
import toast from 'react-hot-toast'
import { useState } from 'react'
import {
  ArrowLeftIcon,
  ChevronRightIcon,
  UserGroupIcon,
  QrCodeIcon,
  TicketIcon,
  PencilIcon,
  TrashIcon,
  CalendarIcon,
  MapPinIcon,
  ClockIcon,
  EnvelopeIcon,
  ChartBarIcon,
  BuildingLibraryIcon,
  MusicalNoteIcon,
  ExclamationTriangleIcon,
  PlusIcon,
  XMarkIcon,
  TableCellsIcon
} from '@heroicons/react/24/outline'

// Custom Church Icon
const ChurchIcon = ({ className }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 2v4m0 0l3 2m-3-2l-3 2m3 0v4m-6 8h12l1-6H5l1 6zm-2 0v4h16v-4M8 14v6m8-6v6m-4-10v4" />
  </svg>
)

// Monogram initials for the cover when there is no cover photo.
const eventInitialsFrom = (w) => {
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
function EventCover({ wedding, name, className = 'h-40 sm:h-48' }) {
  if (wedding.coverPhoto) {
    return (
      <div className={`relative overflow-hidden ${className}`}>
        <img src={wedding.coverPhoto} alt={name} loading="lazy" className="h-full w-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/35 to-transparent" />
      </div>
    )
  }
  return (
    <div className={`relative overflow-hidden bg-surface-2 ${className}`}>
      <div className="pointer-events-none absolute -right-10 -top-10 h-48 w-48 rounded-full bg-primary-500/15 blur-2xl" />
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
        <span className="grid h-20 w-20 place-items-center rounded-full border border-primary-500/30 bg-bg/70 font-serif text-2xl font-bold text-primary-600 backdrop-blur">
          {eventInitialsFrom(wedding)}
        </span>
      </div>
    </div>
  )
}

export default function WeddingDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [showDeleteModal, setShowDeleteModal] = useState(false)

  const { data, isLoading, error } = useQuery(
    ['wedding', id],
    () => weddingAPI.getOne(id)
  )

  const { data: statsData } = useQuery(
    ['weddingStats', id],
    () => weddingAPI.getStats(id),
    { enabled: !!id }
  )

  const deleteMutation = useMutation(
    () => weddingAPI.delete(id),
    {
      onSuccess: () => {
        queryClient.invalidateQueries('weddings')
        toast.success('Événement supprimé avec succès')
        navigate('/weddings')
      },
      onError: (err) => toast.error(err.response?.data?.message || 'Erreur lors de la suppression')
    }
  )

  if (isLoading) {
    return (
      <div className="py-12 text-center">
        <div className="mx-auto h-12 w-12 animate-spin rounded-full border-2 border-primary-500 border-t-transparent"></div>
        <p className="mt-4 text-muted">Chargement...</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="rounded-2xl border border-border bg-surface p-12 text-center">
        <p className="text-red-600 dark:text-red-400">Erreur lors du chargement de l'événement</p>
        <button onClick={() => navigate('/weddings')} className="mt-4 inline-flex items-center rounded-xl bg-primary-500 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-primary-600">
          Retour à la liste
        </button>
      </div>
    )
  }

  const wedding = data?.data?.wedding
  const stats = statsData?.data?.stats || {}
  const isWeddingEvent = wedding && (!wedding.eventType || wedding.eventType === 'WEDDING')
  const eventDisplayName = wedding
    ? (isWeddingEvent ? `${wedding.brideName} & ${wedding.groomName}` : (wedding.eventTitle || 'Événement'))
    : ''
  const eventTypeLabel = EVENT_TYPE_LABELS[wedding?.eventType] || 'Mariage'
  // Days-until countdown for the hero chip.
  const daysUntil = wedding?.weddingDate ? differenceInCalendarDays(new Date(wedding.weddingDate), new Date()) : null
  const countdownLabel = daysUntil == null ? null
    : daysUntil > 1 ? `Dans ${daysUntil} jours`
    : daysUntil === 1 ? 'Demain'
    : daysUntil === 0 ? "Aujourd'hui 🎉"
    : 'Événement passé'

  const quickActions = [
    {
      name: 'Invités',
      description: 'Gérer la liste des invités',
      icon: UserGroupIcon,
      href: `/weddings/${id}/guests`,
      color: 'bg-blue-100 text-blue-600'
    },
    ...(eventUsesTables(wedding?.eventType) ? [{
      name: 'Plan de table',
      description: 'Placer les invités par glisser-déposer',
      icon: TableCellsIcon,
      href: `/weddings/${id}/seating`,
      color: 'bg-indigo-100 text-indigo-600'
    }] : []),
    {
      name: 'Invitations',
      description: 'Générer et envoyer les invitations',
      icon: EnvelopeIcon,
      href: `/weddings/${id}/invitations`,
      color: 'bg-primary-100 text-primary-600'
    },
    {
      name: 'Check-in',
      description: 'Scanner les QR codes le jour J',
      icon: QrCodeIcon,
      href: `/weddings/${id}/checkin`,
      color: 'bg-green-100 text-green-600'
    },
    {
      name: 'Statistiques',
      description: 'Voir les analyses détaillées',
      icon: ChartBarIcon,
      href: `/weddings/${id}/stats`,
      color: 'bg-gold-100 text-gold-600'
    }
  ]

  return (
    <div className="space-y-6">
      {/* Top bar */}
      <div className="flex items-center justify-between gap-3">
        <button
          onClick={() => navigate('/weddings')}
          className="inline-flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-sm font-medium text-muted transition-colors hover:bg-surface-2 hover:text-content"
        >
          <ArrowLeftIcon className="h-4 w-4" />
          <span className="hidden sm:inline">Mes événements</span>
        </button>
        <div className="flex shrink-0 items-center gap-2">
          <Link to={`/weddings/${id}/edit`} className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-primary-500 px-4 py-2 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-primary-600">
            <PencilIcon className="h-4 w-4" />
            Modifier
          </Link>
          <button
            onClick={() => setShowDeleteModal(true)}
            className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-red-500/50 px-3 py-2 text-sm font-semibold text-red-600 transition-colors hover:bg-red-50 dark:hover:bg-red-500/10"
            title="Supprimer l'événement"
          >
            <TrashIcon className="h-4 w-4" />
            <span className="hidden sm:inline">Supprimer</span>
          </button>
        </div>
      </div>

      {/* Header — monogram cover + info (winvitepro style) */}
      <div className="relative overflow-hidden rounded-2xl border border-border">
        <EventCover wedding={wedding} name={eventDisplayName} />
        <div className="border-t border-border bg-surface p-6">
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-full bg-surface-2 px-2.5 py-1 text-xs font-medium text-muted">
              {eventTypeLabel}
            </span>
            {countdownLabel && (
              <span className="inline-flex items-center gap-1 rounded-full bg-primary-500/10 px-2.5 py-1 text-xs font-semibold text-primary-600 dark:text-primary-400">
                <ClockIcon className="h-3 w-3" /> {countdownLabel}
              </span>
            )}
            <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${
              wedding.status === 'ACTIVE' ? 'bg-green-50 text-green-700 dark:bg-green-500/10 dark:text-green-400' :
              wedding.status === 'DRAFT' ? 'bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400' :
              'bg-blue-50 text-blue-700 dark:bg-blue-500/10 dark:text-blue-400'
            }`}>
              {wedding.status === 'ACTIVE' ? 'Actif' : wedding.status === 'DRAFT' ? 'Brouillon' : wedding.status}
            </span>
          </div>

          <h1 className="mt-3 font-serif text-2xl font-bold text-content sm:text-3xl">{eventDisplayName}</h1>

          <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-sm text-muted">
            <span className="inline-flex items-center gap-1.5">
              <CalendarIcon className="h-4 w-4 shrink-0" />
              {format(new Date(wedding.weddingDate), 'EEEE d MMMM yyyy', { locale: fr })}
            </span>
            {wedding.ceremonyTime && (
              <span className="inline-flex items-center gap-1.5">
                <ClockIcon className="h-4 w-4 shrink-0" />
                {wedding.ceremonyTime}
              </span>
            )}
            {wedding.venueName && (
              <span className="inline-flex items-center gap-1.5">
                <MapPinIcon className="h-4 w-4 shrink-0" />
                {wedding.venueName}{wedding.venueCity && `, ${wedding.venueCity}`}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {[
          { icon: UserGroupIcon, value: stats.totalGuests || wedding._count?.guests || 0, label: 'Invités', tint: 'text-blue-500' },
          { icon: TicketIcon, value: stats.rsvp?.confirmed || 0, label: 'Confirmés', tint: 'text-emerald-500' },
          { icon: ClockIcon, value: stats.rsvp?.pending || 0, label: 'En attente', tint: 'text-amber-500' },
          { icon: QrCodeIcon, value: stats.checkIns?.unique || 0, label: 'Check-ins', tint: 'text-primary-500' },
        ].map((s, i) => (
          <div key={i} className="rounded-2xl border border-border bg-surface p-5">
            <div className="flex items-start justify-between">
              <p className="text-3xl font-bold text-content">{s.value}</p>
              <s.icon className={`h-6 w-6 ${s.tint}`} />
            </div>
            <p className="mt-1 text-sm text-muted">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {quickActions.map((action) => (
          <Link
            key={action.name}
            to={action.href}
            className="group flex items-center gap-4 rounded-2xl border border-border bg-surface p-5 transition-colors duration-200 hover:border-primary-500/40"
          >
            <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-primary-500/10 text-primary-600 dark:text-primary-400">
              <action.icon className="h-5 w-5" />
            </span>
            <div className="min-w-0 flex-1">
              <h3 className="font-semibold text-content">{action.name}</h3>
              <p className="mt-0.5 truncate text-sm text-muted">{action.description}</p>
            </div>
            <ChevronRightIcon className="h-5 w-5 shrink-0 text-muted transition-colors group-hover:text-primary-500" />
          </Link>
        ))}
      </div>

      {/* Print files + optional print service order */}
      <PrintSection weddingId={id} />

      {/* Details */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Event Details */}
        <div className="rounded-2xl border border-border bg-surface p-6">
          <h3 className="mb-4 font-serif text-lg font-bold text-content">
            Détails de l'événement
          </h3>
          <div className="space-y-4">
            <div className="flex gap-3">
              <CalendarIcon className="mt-0.5 h-5 w-5 shrink-0 text-muted" />
              <div>
                <p className="text-sm font-semibold text-content">Date</p>
                <p className="mt-0.5 text-sm text-muted">
                  {format(new Date(wedding.weddingDate), 'EEEE d MMMM yyyy', { locale: fr })}
                </p>
              </div>
            </div>
            {wedding.ceremonyTime && (
              <div className="flex gap-3">
                <ClockIcon className="mt-0.5 h-5 w-5 shrink-0 text-muted" />
                <div>
                  <p className="text-sm font-semibold text-content">Horaires</p>
                  <p className="mt-0.5 text-sm text-muted">
                    Cérémonie: {wedding.ceremonyTime}
                    {wedding.receptionTime && ` | Réception: ${wedding.receptionTime}`}
                  </p>
                </div>
              </div>
            )}
            <div className="flex gap-3">
              <MapPinIcon className="mt-0.5 h-5 w-5 shrink-0 text-muted" />
              <div>
                <p className="text-sm font-semibold text-content">Lieu</p>
                <p className="mt-0.5 text-sm text-muted">
                  {wedding.venueName}
                  {wedding.venueAddress && <><br />{wedding.venueAddress}</>}
                  {wedding.venueCity && <><br />{wedding.venueCity}</>}
                </p>
                {wedding.venueMapUrl && (
                  <a
                    href={wedding.venueMapUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-1 inline-block text-sm text-primary-600 hover:underline dark:text-primary-400"
                  >
                    Voir sur Google Maps →
                  </a>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Message */}
        <div className="rounded-2xl border border-border bg-surface p-6">
          <h3 className="mb-4 font-serif text-lg font-bold text-content">
            Message personnalisé
          </h3>
          <p className="whitespace-pre-wrap text-sm leading-relaxed text-muted">
            {wedding.customMessage || 'Aucun message personnalisé défini.'}
          </p>
        </div>
      </div>

      {/* Programme du mariage */}
      {(wedding.communeVenue || wedding.egliseVenue || wedding.receptionVenue) && (
        <div className="rounded-2xl border border-border bg-surface p-6">
          <h3 className="mb-6 font-serif text-lg font-bold text-content">
            Programme du mariage
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Mairie */}
            {(wedding.communeVenue || wedding.communeDate) && (
              <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl p-5 border border-blue-100">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 bg-blue-500 rounded-full flex items-center justify-center">
                    <BuildingLibraryIcon className="h-5 w-5 text-white" />
                  </div>
                  <h4 className="font-bold text-blue-900">Mariage Civil</h4>
                </div>
                <div className="space-y-2 text-sm">
                  {wedding.communeDate && (
                    <p className="flex items-center text-blue-700">
                      <CalendarIcon className="h-4 w-4 mr-2" />
                      {format(new Date(wedding.communeDate), 'd MMMM yyyy', { locale: fr })}
                      {wedding.communeTime && ` à ${wedding.communeTime}`}
                    </p>
                  )}
                  {wedding.communeVenue && (
                    <p className="flex items-center text-blue-700">
                      <BuildingLibraryIcon className="h-4 w-4 mr-2" />
                      {wedding.communeVenue}
                    </p>
                  )}
                  {wedding.communeAddress && (
                    <p className="flex items-center text-blue-600">
                      <MapPinIcon className="h-4 w-4 mr-2" />
                      {wedding.communeAddress}
                    </p>
                  )}
                </div>
              </div>
            )}

            {/* Église */}
            {(wedding.egliseVenue || wedding.egliseDate) && (
              <div className="bg-gradient-to-br from-purple-50 to-pink-50 rounded-xl p-5 border border-purple-100">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 bg-purple-500 rounded-full flex items-center justify-center">
                    <ChurchIcon className="h-5 w-5 text-white" />
                  </div>
                  <h4 className="font-bold text-purple-900">Mariage Religieux</h4>
                </div>
                <div className="space-y-2 text-sm">
                  {wedding.egliseDate && (
                    <p className="flex items-center text-purple-700">
                      <CalendarIcon className="h-4 w-4 mr-2" />
                      {format(new Date(wedding.egliseDate), 'd MMMM yyyy', { locale: fr })}
                      {wedding.egliseTime && ` à ${wedding.egliseTime}`}
                    </p>
                  )}
                  {wedding.egliseVenue && (
                    <p className="flex items-center text-purple-700">
                      <ChurchIcon className="h-4 w-4 mr-2" />
                      {wedding.egliseVenue}
                    </p>
                  )}
                  {wedding.egliseAddress && (
                    <p className="flex items-center text-purple-600">
                      <MapPinIcon className="h-4 w-4 mr-2" />
                      {wedding.egliseAddress}
                    </p>
                  )}
                </div>
              </div>
            )}

            {/* Réception */}
            {(wedding.receptionVenue || wedding.receptionDate) && (
              <div className="bg-gradient-to-br from-pink-50 to-rose-50 rounded-xl p-5 border border-pink-100">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 bg-pink-500 rounded-full flex items-center justify-center">
                    <MusicalNoteIcon className="h-5 w-5 text-white" />
                  </div>
                  <h4 className="font-bold text-pink-900">Soirée Dansante</h4>
                </div>
                <div className="space-y-2 text-sm">
                  {wedding.receptionDate && (
                    <p className="flex items-center text-pink-700">
                      <CalendarIcon className="h-4 w-4 mr-2" />
                      {format(new Date(wedding.receptionDate), 'd MMMM yyyy', { locale: fr })}
                      {wedding.receptionStartTime && ` à ${wedding.receptionStartTime}`}
                    </p>
                  )}
                  {wedding.receptionVenue && (
                    <p className="flex items-center text-pink-700">
                      <BuildingLibraryIcon className="h-4 w-4 mr-2" />
                      {wedding.receptionVenue}
                    </p>
                  )}
                  {wedding.receptionAddress && (
                    <p className="flex items-center text-pink-600">
                      <MapPinIcon className="h-4 w-4 mr-2" />
                      {wedding.receptionAddress}
                    </p>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Gestion des tables */}
      <TableManager weddingId={id} />

      {/* Delete Confirmation Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-stone-950/60 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl border border-border bg-surface p-6 shadow-2xl">
            <div className="text-center">
              <ExclamationTriangleIcon className="mx-auto mb-4 h-16 w-16 text-red-500" />
              <h3 className="mb-2 font-serif text-xl font-bold text-content">Supprimer l'événement</h3>
              <p className="mb-6 text-sm text-muted">
                Êtes-vous sûr de vouloir supprimer l'événement{' '}
                <strong className="text-content">{eventDisplayName}</strong> ?
                Cette action est irréversible et supprimera tous les invités, invitations et données associées.
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => setShowDeleteModal(false)}
                  className="flex-1 rounded-xl border border-border px-4 py-2.5 text-sm font-semibold text-content transition-colors hover:bg-surface-2"
                >
                  Annuler
                </button>
                <button
                  onClick={() => deleteMutation.mutate()}
                  disabled={deleteMutation.isLoading}
                  className="flex-1 rounded-xl bg-red-600 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-red-700 disabled:opacity-50"
                >
                  {deleteMutation.isLoading ? 'Suppression...' : 'Supprimer'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function TableManager({ weddingId }) {
  const queryClient = useQueryClient()
  const [newTable, setNewTable] = useState('')
  const [isEditing, setIsEditing] = useState(false)

  const { data: tablesData, isLoading } = useQuery(
    ['weddingTables', weddingId],
    () => weddingAPI.getTables(weddingId)
  )
  const tables = tablesData?.data?.tables || []

  const saveMutation = useMutation(
    (updatedTables) => weddingAPI.saveTables(weddingId, updatedTables),
    {
      onSuccess: () => {
        queryClient.invalidateQueries(['weddingTables', weddingId])
        queryClient.invalidateQueries(['seating', weddingId])
        toast.success('Tables enregistrées')
      },
      onError: () => toast.error('Erreur lors de la sauvegarde')
    }
  )

  const addTable = () => {
    const name = newTable.trim()
    if (!name) return
    if (tables.some(t => tableName(t) === name)) {
      return toast.error('Cette table existe déjà')
    }
    saveMutation.mutate([...tables, name])
    setNewTable('')
  }

  const removeTable = (name) => {
    saveMutation.mutate(tables.filter(t => tableName(t) !== name))
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      addTable()
    }
  }

  return (
    <div className="rounded-2xl border border-border bg-surface p-6">
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <TableCellsIcon className="h-6 w-6 text-primary-500" />
          <div>
            <h3 className="font-serif text-lg font-bold text-content">
              Tables de l'événement
            </h3>
            <p className="text-sm text-muted">
              {tables.length} table{tables.length !== 1 ? 's' : ''} enregistrée{tables.length !== 1 ? 's' : ''}
            </p>
          </div>
        </div>
        <button
          onClick={() => setIsEditing(!isEditing)}
          className="text-sm font-medium text-primary-600 hover:text-primary-700 dark:text-primary-400"
        >
          {isEditing ? 'Terminé' : 'Gérer'}
        </button>
      </div>

      {/* Table list */}
      {isLoading ? (
        <div className="py-4 text-center">
          <div className="mx-auto h-6 w-6 animate-spin rounded-full border-2 border-primary-500 border-t-transparent"></div>
        </div>
      ) : tables.length === 0 && !isEditing ? (
        <div className="rounded-xl bg-bg py-6 text-center">
          <TableCellsIcon className="mx-auto mb-2 h-10 w-10 text-muted/50" />
          <p className="text-sm text-muted">Aucune table définie</p>
          <button
            onClick={() => setIsEditing(true)}
            className="mt-3 text-sm font-medium text-primary-600 hover:text-primary-700 dark:text-primary-400"
          >
            + Ajouter des tables
          </button>
        </div>
      ) : (
        <div className="flex flex-wrap gap-2">
          {tables.map((table) => {
            const name = tableName(table)
            return (
            <div
              key={name}
              className="inline-flex items-center gap-1.5 rounded-full bg-primary-500/10 px-3 py-1.5 text-sm font-medium text-primary-600 dark:text-primary-400"
            >
              <span>{name}{typeof table === 'object' && table?.seats != null ? ` (${table.seats})` : ''}</span>
              {isEditing && (
                <button
                  onClick={() => removeTable(name)}
                  className="rounded-full p-0.5 transition-colors hover:bg-primary-500/20"
                >
                  <XMarkIcon className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
            )
          })}
        </div>
      )}

      {/* Add new table */}
      {isEditing && (
        <div className="mt-4 flex gap-2">
          <input
            type="text"
            value={newTable}
            onChange={(e) => setNewTable(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Nom de la table (ex: Table VIP, Table 1...)"
            className="flex-1 rounded-xl border border-border bg-bg px-3 py-2.5 text-sm text-content placeholder:text-muted transition focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500"
          />
          <button
            onClick={addTable}
            disabled={!newTable.trim() || saveMutation.isLoading}
            className="inline-flex items-center justify-center rounded-xl bg-primary-500 px-4 text-white transition-colors hover:bg-primary-600 disabled:opacity-50"
          >
            <PlusIcon className="h-5 w-5" />
          </button>
        </div>
      )}
    </div>
  )
}