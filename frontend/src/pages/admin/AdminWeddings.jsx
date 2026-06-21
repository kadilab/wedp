import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from 'react-query'
import { adminAPI } from '../../services/api'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'
import toast from 'react-hot-toast'
import {
  MagnifyingGlassIcon,
  HeartIcon,
  EyeIcon,
  TrashIcon,
  XMarkIcon,
  ExclamationTriangleIcon,
  CalendarIcon,
  UserGroupIcon,
  MapPinIcon
} from '@heroicons/react/24/outline'

const EVENT_TYPE_LABELS = { WEDDING: 'Mariage', BIRTHDAY: 'Anniversaire', DOT: 'Dot', CEREMONY: 'Cérémonie', CONFERENCE: 'Conférence', OTHER: 'Événement' }
const EVENT_TYPE_COLORS = {
  WEDDING: 'bg-rose-100 text-rose-700',
  BIRTHDAY: 'bg-orange-100 text-orange-700',
  DOT: 'bg-emerald-100 text-emerald-700',
  CEREMONY: 'bg-indigo-100 text-indigo-700',
  CONFERENCE: 'bg-sky-100 text-sky-700',
  OTHER: 'bg-gray-100 text-gray-700'
}
const eventTypeLabel = (wedding) => EVENT_TYPE_LABELS[wedding?.eventType] || 'Mariage'
const eventDisplayName = (wedding) =>
  (!wedding.eventType || wedding.eventType === 'WEDDING')
    ? `${wedding.groomName || ''} & ${wedding.brideName || ''}`
    : (wedding.eventTitle || eventTypeLabel(wedding))
const eventVenue = (wedding) =>
  wedding.venueName || wedding.receptionVenue || wedding.communeVenue || wedding.egliseVenue || ''

export default function AdminWeddings() {
  const queryClient = useQueryClient()
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [selectedWedding, setSelectedWedding] = useState(null)
  const [showViewModal, setShowViewModal] = useState(false)
  const [showDeleteModal, setShowDeleteModal] = useState(false)

  const { data: weddingsData, isLoading } = useQuery(
    ['admin-weddings', search, statusFilter],
    () => adminAPI.getWeddings({ search, status: statusFilter })
  )
  const weddings = weddingsData?.data?.weddings || []

  const deleteWeddingMutation = useMutation(
    (id) => adminAPI.deleteWedding(id),
    {
      onSuccess: () => {
        queryClient.invalidateQueries('admin-weddings')
        toast.success('Événement supprimé')
        setShowDeleteModal(false)
      },
      onError: (err) => toast.error(err.response?.data?.message || 'Erreur')
    }
  )

  const getStatusBadge = (status) => {
    switch (status) {
      case 'ACTIVE':
        return <span className="badge-success">Actif</span>
      case 'COMPLETED':
        return <span className="badge">Terminé</span>
      case 'CANCELLED':
        return <span className="badge-danger">Annulé</span>
      case 'DRAFT':
        return <span className="badge-warning">Brouillon</span>
      default:
        return <span className="badge">{status}</span>
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-serif font-bold text-gray-900">Événements</h1>
        <p className="text-gray-600 mt-1">Gérez tous les événements de la plateforme</p>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl shadow-lg p-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="relative md:col-span-2">
            <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
            <input
              type="text"
              placeholder="Rechercher par titre, noms des mariés..."
              className="input pl-10"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <select
            className="input"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="">Tous les statuts</option>
            <option value="DRAFT">Brouillon</option>
            <option value="ACTIVE">Actif</option>
            <option value="COMPLETED">Terminé</option>
            <option value="CANCELLED">Annulé</option>
          </select>
        </div>
      </div>

      {/* Weddings Table */}
      <div className="bg-white rounded-xl shadow-lg overflow-hidden">
        {isLoading ? (
          <div className="p-12 text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto"></div>
          </div>
        ) : weddings.length === 0 ? (
          <div className="p-12 text-center">
            <HeartIcon className="h-16 w-16 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500">Aucun événement trouvé</p>
          </div>
        ) : (
          <div className="table-container">
            <table className="table">
              <thead>
                <tr>
                  <th>Type d'événement</th>
                  <th>Propriétaire</th>
                  <th>Date</th>
                  <th>Invités</th>
                  <th>Statut</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {weddings.map((wedding) => (
                  <tr key={wedding.id}>
                    <td>
                      <div className="flex items-center">
                        <div className="h-10 w-10 rounded-full bg-rose-100 flex items-center justify-center">
                          <HeartIcon className="h-5 w-5 text-rose-500" />
                        </div>
                        <div className="ml-3">
                          <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${EVENT_TYPE_COLORS[wedding.eventType] || EVENT_TYPE_COLORS.WEDDING}`}>
                            {eventTypeLabel(wedding)}
                          </span>
                          <p className="text-sm text-gray-700 mt-0.5">{eventDisplayName(wedding)}</p>
                        </div>
                      </div>
                    </td>
                    <td>
                      <p className="text-sm text-gray-900">
                        {wedding.user?.firstName} {wedding.user?.lastName}
                      </p>
                      <p className="text-xs text-gray-500">{wedding.user?.email}</p>
                    </td>
                    <td className="text-sm text-gray-600">
                      {wedding.weddingDate
                        ? format(new Date(wedding.weddingDate), 'd MMM yyyy', { locale: fr })
                        : '-'}
                    </td>
                    <td>
                      <span className="flex items-center text-sm text-gray-600">
                        <UserGroupIcon className="h-4 w-4 mr-1" />
                        {wedding._count?.guests || 0}
                      </span>
                    </td>
                    <td>{getStatusBadge(wedding.status)}</td>
                    <td>
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => {
                            setSelectedWedding(wedding)
                            setShowViewModal(true)
                          }}
                          className="p-2 text-gray-600 hover:text-primary-600 hover:bg-primary-50 rounded-lg transition-colors"
                        >
                          <EyeIcon className="h-5 w-5" />
                        </button>
                        <button
                          onClick={() => {
                            setSelectedWedding(wedding)
                            setShowDeleteModal(true)
                          }}
                          className="p-2 text-gray-600 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        >
                          <TrashIcon className="h-5 w-5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* View Modal */}
      {showViewModal && selectedWedding && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-lg w-full">
            <div className="flex items-center justify-between p-6 border-b">
              <h3 className="text-xl font-serif font-bold text-gray-900">
                Détails de l'événement
              </h3>
              <button onClick={() => setShowViewModal(false)} className="text-gray-500 hover:text-gray-700">
                <XMarkIcon className="h-6 w-6" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div className="text-center py-4 bg-rose-50 rounded-xl">
                <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium mb-2 ${EVENT_TYPE_COLORS[selectedWedding.eventType] || EVENT_TYPE_COLORS.WEDDING}`}>
                  {eventTypeLabel(selectedWedding)}
                </span>
                <p className="text-2xl font-serif font-bold text-gray-900">
                  {eventDisplayName(selectedWedding)}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="flex items-center p-3 bg-gray-50 rounded-lg">
                  <CalendarIcon className="h-5 w-5 text-gray-400 mr-3" />
                  <div>
                    <p className="text-xs text-gray-500">Date</p>
                    <p className="font-medium text-gray-900">
                      {selectedWedding.weddingDate
                        ? format(new Date(selectedWedding.weddingDate), 'd MMMM yyyy', { locale: fr })
                        : '-'}
                    </p>
                  </div>
                </div>
                <div className="flex items-center p-3 bg-gray-50 rounded-lg">
                  <MapPinIcon className="h-5 w-5 text-gray-400 mr-3" />
                  <div>
                    <p className="text-xs text-gray-500">Lieu</p>
                    <p className="font-medium text-gray-900">{eventVenue(selectedWedding) || '-'}</p>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4 text-center">
                <div className="p-3 bg-gray-50 rounded-lg">
                  <p className="text-2xl font-bold text-gray-900">{selectedWedding._count?.guests || 0}</p>
                  <p className="text-xs text-gray-500">Invités</p>
                </div>
                <div className="p-3 bg-gray-50 rounded-lg">
                  <p className="text-2xl font-bold text-gray-900">{selectedWedding._count?.invitations || 0}</p>
                  <p className="text-xs text-gray-500">Invitations</p>
                </div>
                <div className="p-3 bg-gray-50 rounded-lg">
                  <p className="text-2xl font-bold text-gray-900">{selectedWedding._count?.checkins || 0}</p>
                  <p className="text-xs text-gray-500">Check-ins</p>
                </div>
              </div>

              <div className="pt-4 border-t">
                <p className="text-sm text-gray-500">Propriétaire</p>
                <p className="font-medium text-gray-900">
                  {selectedWedding.user?.firstName} {selectedWedding.user?.lastName}
                </p>
                <p className="text-sm text-gray-500">{selectedWedding.user?.email}</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete Modal */}
      {showDeleteModal && selectedWedding && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6">
            <div className="text-center">
              <ExclamationTriangleIcon className="h-16 w-16 text-red-500 mx-auto mb-4" />
              <h3 className="text-xl font-bold text-gray-900 mb-2">Supprimer l'événement</h3>
              <p className="text-gray-600 mb-6">
                Êtes-vous sûr de vouloir supprimer l'événement{' '}
                <strong>{eventDisplayName(selectedWedding)}</strong> ?
                Cette action supprimera également tous les invités et invitations.
              </p>
              <div className="flex space-x-4">
                <button
                  onClick={() => setShowDeleteModal(false)}
                  className="flex-1 btn-secondary"
                >
                  Annuler
                </button>
                <button
                  onClick={() => deleteWeddingMutation.mutate(selectedWedding.id)}
                  disabled={deleteWeddingMutation.isLoading}
                  className="flex-1 bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700"
                >
                  {deleteWeddingMutation.isLoading ? 'Suppression...' : 'Supprimer'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
