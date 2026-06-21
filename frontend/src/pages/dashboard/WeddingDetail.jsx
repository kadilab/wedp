import { Link, useParams, useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from 'react-query'
import { weddingAPI } from '../../services/api'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'
import toast from 'react-hot-toast'
import { useState } from 'react'
import {
  ArrowLeftIcon,
  HeartIcon,
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
      <div className="text-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto"></div>
        <p className="mt-4 text-gray-600">Chargement...</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <p className="text-red-600">Erreur lors du chargement de l'événement</p>
        <button onClick={() => navigate('/weddings')} className="btn-primary mt-4">
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

  const quickActions = [
    {
      name: 'Invités',
      description: 'Gérer la liste des invités',
      icon: UserGroupIcon,
      href: `/weddings/${id}/guests`,
      color: 'bg-blue-100 text-blue-600'
    },
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
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <button
            onClick={() => navigate('/weddings')}
            className="p-2 text-gray-600 hover:text-gray-900 rounded-lg hover:bg-gray-100"
          >
            <ArrowLeftIcon className="h-5 w-5" />
          </button>
          <div>
            <h1 className="text-3xl font-serif font-bold text-gray-900">
              {eventDisplayName}
            </h1>
            <div className="flex items-center gap-4 mt-1 text-gray-500">
              <span className="flex items-center">
                <CalendarIcon className="h-4 w-4 mr-1" />
                {format(new Date(wedding.weddingDate), 'd MMMM yyyy', { locale: fr })}
              </span>
              <span className={`badge ${
                wedding.status === 'ACTIVE' ? 'badge-success' :
                wedding.status === 'DRAFT' ? 'badge-warning' :
                'badge-info'
              }`}>
                {wedding.status === 'ACTIVE' ? 'Actif' :
                 wedding.status === 'DRAFT' ? 'Brouillon' :
                 wedding.status}
              </span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Link to={`/weddings/${id}/edit`} className="btn-primary">
            <PencilIcon className="h-5 w-5 mr-2" />
            Modifier
          </Link>
          <button
            onClick={() => setShowDeleteModal(true)}
            className="inline-flex items-center px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
          >
            <TrashIcon className="h-5 w-5 mr-2" />
            Supprimer
          </button>
        </div>
      </div>

      {/* Cover */}
      <div className="h-64 rounded-xl overflow-hidden bg-gradient-wedding relative">
        {wedding.coverPhoto ? (
          <img
            src={wedding.coverPhoto}
            alt="Cover"
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <HeartIcon className="h-24 w-24 text-primary-200" />
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
        <div className="absolute bottom-6 left-6 text-white">
          <h2 className="text-2xl font-serif font-bold">
            {eventDisplayName}
          </h2>
          <p className="flex items-center mt-2">
            <MapPinIcon className="h-5 w-5 mr-1" />
            {wedding.venueName}
            {wedding.venueCity && `, ${wedding.venueCity}`}
          </p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="stat-card">
          <div className="flex items-center justify-between">
            <div>
              <p className="stat-value">{stats.totalGuests || wedding._count?.guests || 0}</p>
              <p className="stat-label">Invités</p>
            </div>
            <UserGroupIcon className="h-8 w-8 text-blue-500" />
          </div>
        </div>
        <div className="stat-card">
          <div className="flex items-center justify-between">
            <div>
              <p className="stat-value">{stats.rsvp?.confirmed || 0}</p>
              <p className="stat-label">Confirmés</p>
            </div>
            <TicketIcon className="h-8 w-8 text-green-500" />
          </div>
        </div>
        <div className="stat-card">
          <div className="flex items-center justify-between">
            <div>
              <p className="stat-value">{stats.rsvp?.pending || 0}</p>
              <p className="stat-label">En attente</p>
            </div>
            <ClockIcon className="h-8 w-8 text-yellow-500" />
          </div>
        </div>
        <div className="stat-card">
          <div className="flex items-center justify-between">
            <div>
              <p className="stat-value">{stats.checkIns?.unique || 0}</p>
              <p className="stat-label">Check-ins</p>
            </div>
            <QrCodeIcon className="h-8 w-8 text-primary-500" />
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {quickActions.map((action) => (
          <Link
            key={action.name}
            to={action.href}
            className="card-hover p-6 flex items-start space-x-4"
          >
            <div className={`p-3 rounded-xl ${action.color}`}>
              <action.icon className="h-6 w-6" />
            </div>
            <div>
              <h3 className="font-medium text-gray-900">{action.name}</h3>
              <p className="text-sm text-gray-500 mt-1">{action.description}</p>
            </div>
          </Link>
        ))}
      </div>

      {/* Details */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Event Details */}
        <div className="bg-white rounded-xl shadow-lg p-6">
          <h3 className="text-lg font-serif font-bold text-gray-900 mb-4">
            Détails de l'événement
          </h3>
          <div className="space-y-4">
            <div className="flex items-start">
              <CalendarIcon className="h-5 w-5 text-gray-400 mr-3 mt-0.5" />
              <div>
                <p className="font-medium text-gray-900">Date</p>
                <p className="text-gray-600">
                  {format(new Date(wedding.weddingDate), 'EEEE d MMMM yyyy', { locale: fr })}
                </p>
              </div>
            </div>
            {wedding.ceremonyTime && (
              <div className="flex items-start">
                <ClockIcon className="h-5 w-5 text-gray-400 mr-3 mt-0.5" />
                <div>
                  <p className="font-medium text-gray-900">Horaires</p>
                  <p className="text-gray-600">
                    Cérémonie: {wedding.ceremonyTime}
                    {wedding.receptionTime && ` | Réception: ${wedding.receptionTime}`}
                  </p>
                </div>
              </div>
            )}
            <div className="flex items-start">
              <MapPinIcon className="h-5 w-5 text-gray-400 mr-3 mt-0.5" />
              <div>
                <p className="font-medium text-gray-900">Lieu</p>
                <p className="text-gray-600">
                  {wedding.venueName}
                  {wedding.venueAddress && <><br />{wedding.venueAddress}</>}
                  {wedding.venueCity && <><br />{wedding.venueCity}</>}
                </p>
                {wedding.venueMapUrl && (
                  <a
                    href={wedding.venueMapUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary-600 text-sm hover:underline mt-1 inline-block"
                  >
                    Voir sur Google Maps →
                  </a>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Message */}
        <div className="bg-white rounded-xl shadow-lg p-6">
          <h3 className="text-lg font-serif font-bold text-gray-900 mb-4">
            Message personnalisé
          </h3>
          <p className="text-gray-600 whitespace-pre-wrap">
            {wedding.customMessage || 'Aucun message personnalisé défini.'}
          </p>
        </div>
      </div>

      {/* Programme du mariage */}
      {(wedding.communeVenue || wedding.egliseVenue || wedding.receptionVenue) && (
        <div className="bg-white rounded-xl shadow-lg p-6">
          <h3 className="text-lg font-serif font-bold text-gray-900 mb-6">
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
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6">
            <div className="text-center">
              <ExclamationTriangleIcon className="h-16 w-16 text-red-500 mx-auto mb-4" />
              <h3 className="text-xl font-bold text-gray-900 mb-2">Supprimer l'événement</h3>
              <p className="text-gray-600 mb-6">
                Êtes-vous sûr de vouloir supprimer l'événement{' '}
                <strong>{eventDisplayName}</strong> ?
                Cette action est irréversible et supprimera tous les invités, invitations et données associées.
              </p>
              <div className="flex space-x-4">
                <button
                  onClick={() => setShowDeleteModal(false)}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
                >
                  Annuler
                </button>
                <button
                  onClick={() => deleteMutation.mutate()}
                  disabled={deleteMutation.isLoading}
                  className="flex-1 bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700"
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
        toast.success('Tables enregistrées')
      },
      onError: () => toast.error('Erreur lors de la sauvegarde')
    }
  )

  const addTable = () => {
    const name = newTable.trim()
    if (!name) return
    if (tables.includes(name)) {
      return toast.error('Cette table existe déjà')
    }
    saveMutation.mutate([...tables, name])
    setNewTable('')
  }

  const removeTable = (tableName) => {
    saveMutation.mutate(tables.filter(t => t !== tableName))
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      addTable()
    }
  }

  return (
    <div className="bg-white rounded-xl shadow-lg p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <TableCellsIcon className="h-6 w-6 text-primary-600" />
          <div>
            <h3 className="text-lg font-serif font-bold text-gray-900">
              Tables de l'événement
            </h3>
            <p className="text-sm text-gray-500">
              {tables.length} table{tables.length !== 1 ? 's' : ''} enregistrée{tables.length !== 1 ? 's' : ''}
            </p>
          </div>
        </div>
        <button
          onClick={() => setIsEditing(!isEditing)}
          className="text-sm text-primary-600 hover:text-primary-700 font-medium"
        >
          {isEditing ? 'Terminé' : 'Gérer'}
        </button>
      </div>

      {/* Table list */}
      {isLoading ? (
        <div className="text-center py-4">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary-600 mx-auto"></div>
        </div>
      ) : tables.length === 0 && !isEditing ? (
        <div className="text-center py-6 bg-gray-50 rounded-lg">
          <TableCellsIcon className="h-10 w-10 text-gray-300 mx-auto mb-2" />
          <p className="text-gray-500 text-sm">Aucune table définie</p>
          <button
            onClick={() => setIsEditing(true)}
            className="mt-3 text-sm text-primary-600 hover:text-primary-700 font-medium"
          >
            + Ajouter des tables
          </button>
        </div>
      ) : (
        <div className="flex flex-wrap gap-2">
          {tables.map((table) => (
            <div
              key={table}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-primary-50 text-primary-700 rounded-full text-sm font-medium border border-primary-200"
            >
              <span>{table}</span>
              {isEditing && (
                <button
                  onClick={() => removeTable(table)}
                  className="p-0.5 hover:bg-primary-200 rounded-full transition-colors"
                >
                  <XMarkIcon className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
          ))}
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
            className="input flex-1"
          />
          <button
            onClick={addTable}
            disabled={!newTable.trim() || saveMutation.isLoading}
            className="btn-primary px-4"
          >
            <PlusIcon className="h-5 w-5" />
          </button>
        </div>
      )}
    </div>
  )
}