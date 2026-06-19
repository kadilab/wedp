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
  TicketIcon
} from '@heroicons/react/24/outline'

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
        toast.success('Mariage supprimé avec succès')
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

  const getStatusBadge = (status) => {
    switch (status) {
      case 'ACTIVE':
        return <span className="badge-success">Actif</span>
      case 'DRAFT':
        return <span className="badge-warning">Brouillon</span>
      case 'COMPLETED':
        return <span className="badge-info">Terminé</span>
      case 'CANCELLED':
        return <span className="badge-danger">Annulé</span>
      default:
        return <span className="badge">{status}</span>
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-serif font-bold text-gray-900">
            Mes mariages
          </h1>
          <p className="text-gray-600 mt-1">
            Gérez vos événements et invitations
          </p>
        </div>
        <Link to="/weddings/new" className="btn-primary">
          <PlusIcon className="h-5 w-5 mr-2" />
          Nouveau mariage
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
            Aucun mariage trouvé
          </h2>
          <p className="text-gray-500 mb-6">
            {search || statusFilter
              ? 'Aucun résultat ne correspond à votre recherche'
              : 'Commencez par créer votre premier événement'}
          </p>
          <Link to="/weddings/new" className="btn-primary">
            <PlusIcon className="h-5 w-5 mr-2" />
            Créer un mariage
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {weddings.map((wedding) => (
            <div key={wedding.id} className="card-hover">
              {/* Cover Image */}
              <div className="h-40 bg-gradient-wedding relative overflow-hidden">
                {wedding.coverPhoto ? (
                  <img
                    src={wedding.coverPhoto}
                    alt={`${wedding.brideName} & ${wedding.groomName}`}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <HeartIcon className="h-16 w-16 text-primary-200" />
                  </div>
                )}
                <div className="absolute top-3 right-3">
                  {getStatusBadge(wedding.status)}
                </div>
              </div>

              {/* Content */}
              <div className="p-5">
                <h3 className="text-lg font-serif font-bold text-gray-900 mb-1">
                  {wedding.brideName} & {wedding.groomName}
                </h3>
                <p className="text-sm text-gray-500 mb-4">
                  {format(new Date(wedding.weddingDate), 'd MMMM yyyy', { locale: fr })}
                  {wedding.ceremonyTime && ` à ${wedding.ceremonyTime}`}
                </p>

                {/* Stats */}
                <div className="flex items-center gap-4 text-sm text-gray-600 mb-4">
                  <span className="flex items-center">
                    <UserGroupIcon className="h-4 w-4 mr-1" />
                    {wedding._count?.guests || 0}
                  </span>
                  <span className="flex items-center">
                    <QrCodeIcon className="h-4 w-4 mr-1" />
                    {wedding._count?.invitations || 0}
                  </span>
                  <span className="flex items-center">
                    <TicketIcon className="h-4 w-4 mr-1" />
                    {wedding.confirmedGuests || 0}
                  </span>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2">
                  <Link
                    to={`/weddings/${wedding.id}`}
                    className="btn-primary btn-sm flex-1"
                  >
                    <EyeIcon className="h-4 w-4 mr-1" />
                    Voir
                  </Link>
                  <Link
                    to={`/weddings/${wedding.id}/edit`}
                    className="btn-secondary btn-sm"
                  >
                    <PencilIcon className="h-4 w-4" />
                  </Link>
                  <button
                    onClick={() => handleDelete(wedding.id, `${wedding.brideName} & ${wedding.groomName}`)}
                    className="btn-ghost btn-sm text-red-600 hover:bg-red-50"
                    disabled={deleteMutation.isLoading}
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
  )
}
