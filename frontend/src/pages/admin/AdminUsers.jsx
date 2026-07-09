import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from 'react-query'
import { adminAPI } from '../../services/api'
import { useAuthStore } from '../../stores/authStore'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'
import toast from 'react-hot-toast'
import {
  MagnifyingGlassIcon,
  UserCircleIcon,
  PencilIcon,
  TrashIcon,
  ShieldCheckIcon,
  XMarkIcon,
  CheckCircleIcon,
  XCircleIcon,
  ExclamationTriangleIcon,
  EyeIcon,
  EnvelopeIcon,
  PhoneIcon,
  PrinterIcon,
  QrCodeIcon,
  ArrowLeftIcon,
  DocumentTextIcon,
  PhotoIcon,
  HeartIcon
} from '@heroicons/react/24/outline'

const PRINT_SIZES = {
  A7: 'A7', A6: 'A6', A5: 'A5', B6: 'B6', B5: 'B5',
  '10x15': '10×15', '13x18': '13×18', custom: 'Custom'
}

export default function AdminUsers() {
  const queryClient = useQueryClient()
  const { user: currentUser } = useAuthStore()
  const [search, setSearch] = useState('')
  const [roleFilter, setRoleFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [selectedUser, setSelectedUser] = useState(null)
  const [showEditModal, setShowEditModal] = useState(false)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [viewUserId, setViewUserId] = useState(null)

  const { data: usersData, isLoading } = useQuery(
    ['admin-users', search, roleFilter, statusFilter],
    () => adminAPI.getUsers({ search, role: roleFilter, status: statusFilter })
  )
  const users = usersData?.data?.users || []

  // Fetch detailed user data when viewing
  const { data: userDetailData, isLoading: isLoadingDetail } = useQuery(
    ['admin-user-detail', viewUserId],
    () => adminAPI.getUser(viewUserId),
    { enabled: !!viewUserId }
  )
  const userDetail = userDetailData?.data?.user

  const updateUserMutation = useMutation(
    async ({ id, data }) => {
      if (data.role) await adminAPI.updateUserRole(id, data.role)
      if (data.status) await adminAPI.updateUserStatus(id, data.status)
    },
    {
      onSuccess: () => {
        queryClient.invalidateQueries('admin-users')
        queryClient.invalidateQueries('admin-user-detail')
        toast.success('Utilisateur mis à jour')
        setShowEditModal(false)
      },
      onError: (err) => toast.error(err.response?.data?.error || 'Erreur')
    }
  )

  const deleteUserMutation = useMutation(
    (id) => adminAPI.deleteUser(id),
    {
      onSuccess: () => {
        queryClient.invalidateQueries('admin-users')
        toast.success('Utilisateur supprimé')
        setShowDeleteModal(false)
        setViewUserId(null)
      },
      onError: (err) => toast.error(err.response?.data?.message || 'Erreur')
    }
  )

  const createUserMutation = useMutation(
    (data) => adminAPI.createUser(data),
    {
      onSuccess: () => {
        queryClient.invalidateQueries('admin-users')
        toast.success('Utilisateur créé avec succès')
        setShowCreateModal(false)
      },
      onError: (err) => toast.error(err.response?.data?.error || 'Erreur')
    }
  )

  const getStatusBadge = (status) => {
    switch (status) {
      case 'ACTIVE':
        return <span className="badge-success flex items-center"><CheckCircleIcon className="h-4 w-4 mr-1" />Actif</span>
      case 'INACTIVE':
        return <span className="badge-warning flex items-center"><XCircleIcon className="h-4 w-4 mr-1" />Inactif</span>
      case 'SUSPENDED':
        return <span className="badge-danger flex items-center"><ExclamationTriangleIcon className="h-4 w-4 mr-1" />Suspendu</span>
      default:
        return <span className="badge">{status}</span>
    }
  }

  const getRoleBadge = (role, isCreator = false) => {
    if (role === 'SUPER_ADMIN') {
      return <span className="bg-red-100 text-red-700 px-2 py-1 rounded-full text-xs font-medium flex items-center"><ShieldCheckIcon className="h-4 w-4 mr-1" />Super Admin</span>
    }
    if (role === 'ADMIN') {
      return <span className="bg-purple-100 text-purple-700 px-2 py-1 rounded-full text-xs font-medium flex items-center"><ShieldCheckIcon className="h-4 w-4 mr-1" />Admin</span>
    }
    if (role === 'CREATOR' || isCreator) {
      return (
        <span className="inline-flex items-center gap-1.5">
          <span className="bg-blue-100 text-blue-700 px-2 py-1 rounded-full text-xs font-medium flex items-center"><ShieldCheckIcon className="h-4 w-4 mr-1" />Créateur</span>
          {isCreator && role === 'CLIENT' && (
            <span className="bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full text-[10px] font-medium">+ Client</span>
          )}
        </span>
      )
    }
    return <span className="badge">Client</span>
  }

  const getStatusColor = (status) => {
    switch (status) {
      case 'PENDING': return 'yellow'
      case 'CONFIRMED': return 'blue'
      case 'PRINTING': return 'purple'
      case 'SHIPPED': return 'indigo'
      case 'DELIVERED': return 'green'
      case 'CANCELLED': return 'red'
      default: return 'gray'
    }
  }

  // ===================== USER DETAIL VIEW =====================
  if (viewUserId) {
    return (
      <div className="space-y-6">
        <button
          onClick={() => setViewUserId(null)}
          className="flex items-center text-gray-600 hover:text-gray-900 transition-colors"
        >
          <ArrowLeftIcon className="h-5 w-5 mr-2" />
          Retour à la liste
        </button>

        {isLoadingDetail ? (
          <div className="p-12 text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto"></div>
          </div>
        ) : !userDetail ? (
          <div className="bg-white rounded-xl shadow-lg p-12 text-center">
            <UserCircleIcon className="h-16 w-16 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500">Utilisateur non trouvé</p>
          </div>
        ) : (
          <>
            {/* User Header */}
            <div className="bg-white rounded-xl shadow-lg p-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="h-16 w-16 rounded-full bg-primary-100 flex items-center justify-center">
                    <span className="text-2xl font-bold text-primary-600">
                      {userDetail.firstName?.charAt(0)}{userDetail.lastName?.charAt(0)}
                    </span>
                  </div>
                  <div>
                    <h1 className="text-2xl font-serif font-bold text-gray-900">
                      {userDetail.firstName} {userDetail.lastName}
                    </h1>
                    <div className="flex items-center gap-4 mt-1 text-sm text-gray-500">
                      <span className="flex items-center"><EnvelopeIcon className="h-4 w-4 mr-1" />{userDetail.email}</span>
                      {userDetail.phone && <span className="flex items-center"><PhoneIcon className="h-4 w-4 mr-1" />{userDetail.phone}</span>}
                    </div>
                    <div className="flex items-center gap-3 mt-2">
                      {getRoleBadge(userDetail.role, userDetail.isCreator)}
                      {getStatusBadge(userDetail.status)}
                      <span className="text-xs text-gray-400">Inscrit le {format(new Date(userDetail.createdAt), 'd MMM yyyy', { locale: fr })}</span>
                    </div>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => { setSelectedUser(userDetail); setShowEditModal(true) }}
                    className="btn-secondary flex items-center text-sm"
                  >
                    <PencilIcon className="h-4 w-4 mr-1" /> Modifier
                  </button>
                </div>
              </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-white rounded-xl shadow-sm p-5 text-center">
                <p className="text-3xl font-bold text-gray-900">{userDetail.weddings?.length || 0}</p>
                <p className="text-sm text-gray-500">Mariages</p>
              </div>
              <div className="bg-white rounded-xl shadow-sm p-5 text-center">
                <p className="text-3xl font-bold text-primary-600">
                  {userDetail.weddings?.reduce((sum, w) => sum + (w._count?.invitations || 0), 0) || 0}
                </p>
                <p className="text-sm text-gray-500">Invitations</p>
              </div>
              <div className="bg-white rounded-xl shadow-sm p-5 text-center">
                <p className="text-3xl font-bold text-green-600">
                  {userDetail.weddings?.reduce((sum, w) => sum + (w._count?.guests || 0), 0) || 0}
                </p>
                <p className="text-sm text-gray-500">Invités</p>
              </div>
              <div className="bg-white rounded-xl shadow-sm p-5 text-center">
                <p className="text-3xl font-bold text-amber-600">{userDetail.payments?.length || 0}</p>
                <p className="text-sm text-gray-500">Paiements</p>
              </div>
            </div>

            {/* Weddings & Invitations */}
            {userDetail.weddings?.map((wedding) => (
              <div key={wedding.id} className="bg-white rounded-xl shadow-lg overflow-hidden">
                {/* Wedding Header */}
                <div className="p-6 border-b bg-gradient-to-r from-primary-50 to-white">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <HeartIcon className="h-6 w-6 text-primary-500" />
                      <div>
                        <h2 className="text-lg font-serif font-bold text-gray-900">
                          {wedding.brideName} & {wedding.groomName}
                        </h2>
                        <div className="flex items-center gap-3 text-sm text-gray-500 mt-1">
                          {wedding.plan && (
                            <span className="bg-gold-100 text-gold-700 px-2 py-0.5 rounded-full text-xs font-medium">{wedding.plan.name}</span>
                          )}
                          {wedding.template && (
                            <span className="text-xs text-gray-400">Template: {wedding.template.name}</span>
                          )}
                          <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                            wedding.status === 'ACTIVE' ? 'bg-green-100 text-green-700' :
                            wedding.status === 'DRAFT' ? 'bg-gray-100 text-gray-600' :
                            'bg-yellow-100 text-yellow-700'
                          }`}>{wedding.status}</span>
                        </div>
                      </div>
                    </div>
                    <div className="text-right text-sm text-gray-500">
                      <p>{wedding._count?.guests || 0} invités</p>
                      <p>{wedding._count?.invitations || 0} invitations</p>
                    </div>
                  </div>
                </div>

                {/* Invitations Table */}
                {wedding.invitations?.length > 0 && (
                  <div className="p-4">
                    <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center">
                      <DocumentTextIcon className="h-4 w-4 mr-2 text-primary-500" />
                      Invitations ({wedding.invitations.length})
                    </h3>
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm table-responsive">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Invité</th>
                            <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">RSVP</th>
                            <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Code</th>
                            <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Vues</th>
                            <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">QR / PDF</th>
                            <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y">
                          {wedding.invitations.map((inv) => (
                            <tr key={inv.id} className="hover:bg-gray-50">
                              <td data-label="Invité" className="px-3 py-2 font-medium text-gray-900">
                                {inv.guest?.firstName} {inv.guest?.lastName}
                              </td>
                              <td data-label="RSVP" className="px-3 py-2">
                                <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                                  inv.guest?.rsvpStatus === 'CONFIRMED' ? 'bg-green-100 text-green-700' :
                                  inv.guest?.rsvpStatus === 'DECLINED' ? 'bg-red-100 text-red-700' :
                                  'bg-yellow-100 text-yellow-700'
                                }`}>
                                  {inv.guest?.rsvpStatus === 'CONFIRMED' ? 'Confirmé' :
                                   inv.guest?.rsvpStatus === 'DECLINED' ? 'Décliné' : 'En attente'}
                                </span>
                              </td>
                              <td data-label="Code" className="px-3 py-2 font-mono text-xs text-gray-400">{inv.uniqueCode}</td>
                              <td data-label="Vues" className="px-3 py-2 text-gray-600">{inv.viewCount}</td>
                              <td data-label="QR / PDF" className="px-3 py-2">
                                <div className="flex items-center gap-2">
                                  {inv.qrCodeUrl && (
                                    <a href={inv.qrCodeUrl} target="_blank" rel="noopener noreferrer"
                                      className="p-1 text-blue-600 hover:bg-blue-50 rounded" title="QR Code">
                                      <QrCodeIcon className="h-4 w-4" />
                                    </a>
                                  )}
                                  {inv.pdfUrl && (
                                    <a href={inv.pdfUrl} target="_blank" rel="noopener noreferrer"
                                      className="p-1 text-red-600 hover:bg-red-50 rounded" title="PDF">
                                      <DocumentTextIcon className="h-4 w-4" />
                                    </a>
                                  )}
                                  {inv.imageUrl && (
                                    <a href={inv.imageUrl} target="_blank" rel="noopener noreferrer"
                                      className="p-1 text-green-600 hover:bg-green-50 rounded" title="Image">
                                      <PhotoIcon className="h-4 w-4" />
                                    </a>
                                  )}
                                </div>
                              </td>
                              <td data-label="Date" className="px-3 py-2 text-gray-400 text-xs">
                                {format(new Date(inv.createdAt), 'd MMM yyyy', { locale: fr })}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {/* Print Orders */}
                {wedding.printOrders?.length > 0 && (
                  <div className="p-4 border-t bg-amber-50/30">
                    <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center">
                      <PrinterIcon className="h-4 w-4 mr-2 text-amber-500" />
                      Commandes d'impression ({wedding.printOrders.length})
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {wedding.printOrders.map((po) => (
                        <div key={po.id} className="bg-white rounded-lg p-3 border border-gray-100">
                          <div className="flex items-center justify-between">
                            <div className="text-sm">
                              <p className="font-medium text-gray-900">{po.quantity} ex. — {PRINT_SIZES[po.size] || po.size}</p>
                              <p className="text-gray-500 text-xs capitalize">{po.paperType} • {po.finish}</p>
                            </div>
                            <div className="text-right">
                              <p className="font-semibold text-gray-900">{Number(po.price).toFixed(2)} €</p>
                              <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium bg-${getStatusColor(po.status)}-100 text-${getStatusColor(po.status)}-700`}>
                                {po.status}
                              </span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {(!wedding.invitations || wedding.invitations.length === 0) && (
                  <div className="p-6 text-center text-gray-400">
                    <DocumentTextIcon className="h-8 w-8 mx-auto mb-2" />
                    <p className="text-sm">Aucune invitation générée pour ce mariage</p>
                  </div>
                )}
              </div>
            ))}

            {(!userDetail.weddings || userDetail.weddings.length === 0) && (
              <div className="bg-white rounded-xl shadow-lg p-12 text-center">
                <HeartIcon className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-500">Cet utilisateur n'a créé aucun mariage</p>
              </div>
            )}
          </>
        )}

        {/* Edit Modal (also accessible from detail view) */}
        {showEditModal && selectedUser && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-2xl max-w-md w-full">
              <div className="flex items-center justify-between p-6 border-b">
                <h3 className="text-xl font-serif font-bold text-gray-900">
                  Modifier l'utilisateur
                </h3>
                <button onClick={() => setShowEditModal(false)} className="text-gray-500 hover:text-gray-700">
                  <XMarkIcon className="h-6 w-6" />
                </button>
              </div>
              <form
                onSubmit={(e) => {
                  e.preventDefault()
                  const formData = new FormData(e.target)
                  updateUserMutation.mutate({
                    id: selectedUser.id,
                    data: {
                      role: formData.get('role'),
                      status: formData.get('status')
                    }
                  })
                }}
                className="p-6 space-y-4"
              >
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Rôle</label>
                  <select name="role" className="input" defaultValue={selectedUser.role}>
                    <option value="CLIENT">Client</option>
                    <option value="ADMIN">Admin</option>
                    {currentUser?.role === 'SUPER_ADMIN' && (
                      <option value="SUPER_ADMIN">Super Admin</option>
                    )}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Statut</label>
                  <select name="status" className="input" defaultValue={selectedUser.status}>
                    <option value="ACTIVE">Actif</option>
                    <option value="INACTIVE">Inactif</option>
                    <option value="SUSPENDED">Suspendu</option>
                  </select>
                </div>
                <div className="flex space-x-4 pt-4">
                  <button type="button" onClick={() => setShowEditModal(false)} className="flex-1 btn-secondary">Annuler</button>
                  <button type="submit" disabled={updateUserMutation.isLoading} className="flex-1 btn-primary">
                    {updateUserMutation.isLoading ? 'Enregistrement...' : 'Enregistrer'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    )
  }

  // ===================== USERS LIST VIEW =====================
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-serif font-bold text-gray-900">Utilisateurs</h1>
          <p className="text-gray-600 mt-1">Gérez les utilisateurs de la plateforme</p>
        </div>
        <button onClick={() => setShowCreateModal(true)} className="btn-primary">
          + Créer un utilisateur
        </button>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl shadow-lg p-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="relative md:col-span-2">
            <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
            <input
              type="text"
              placeholder="Rechercher par nom ou email..."
              className="input pl-10"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <select className="input" value={roleFilter} onChange={(e) => setRoleFilter(e.target.value)}>
            <option value="">Tous les rôles</option>
            <option value="CLIENT">Client</option>
            <option value="CREATOR">Créateur</option>
            <option value="ADMIN">Admin</option>
            <option value="SUPER_ADMIN">Super Admin</option>
          </select>
          <select className="input" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
            <option value="">Tous les statuts</option>
            <option value="ACTIVE">Actif</option>
            <option value="INACTIVE">Inactif</option>
            <option value="SUSPENDED">Suspendu</option>
          </select>
        </div>
      </div>

      {/* Users Table */}
      <div className="bg-white rounded-xl shadow-lg overflow-hidden">
        {isLoading ? (
          <div className="p-12 text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto"></div>
          </div>
        ) : users.length === 0 ? (
          <div className="p-12 text-center">
            <UserCircleIcon className="h-16 w-16 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500">Aucun utilisateur trouvé</p>
          </div>
        ) : (
          <div className="table-container">
            <table className="table table-responsive">
              <thead>
                <tr>
                  <th>Utilisateur</th>
                  <th>Rôle</th>
                  <th>Mariages</th>
                  <th>Statut</th>
                  <th>Inscription</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {users.map((user) => (
                  <tr key={user.id} className="hover:bg-gray-50 cursor-pointer" onClick={() => setViewUserId(user.id)}>
                    <td data-label="Utilisateur">
                      <div className="flex items-center">
                        <div className="h-10 w-10 rounded-full bg-primary-100 flex items-center justify-center">
                          <span className="text-primary-600 font-semibold">
                            {user.firstName?.charAt(0)}{user.lastName?.charAt(0)}
                          </span>
                        </div>
                        <div className="ml-3">
                          <p className="font-medium text-gray-900">{user.firstName} {user.lastName}</p>
                          <p className="text-sm text-gray-500">{user.email}</p>
                        </div>
                      </div>
                    </td>
                    <td data-label="Rôle">{getRoleBadge(user.role, user.isCreator)}</td>
                    <td data-label="Mariages"><span className="badge">{user._count?.weddings || 0}</span></td>
                    <td data-label="Statut">{getStatusBadge(user.status)}</td>
                    <td data-label="Inscription" className="text-sm text-gray-500">
                      {format(new Date(user.createdAt), 'd MMM yyyy', { locale: fr })}
                    </td>
                    <td className="cell-actions">
                      <div className="flex items-center space-x-2" onClick={(e) => e.stopPropagation()}>
                        <button
                          onClick={() => setViewUserId(user.id)}
                          className="p-2 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                          title="Voir les détails et invitations"
                        >
                          <EyeIcon className="h-5 w-5" />
                        </button>
                        <button
                          onClick={() => { setSelectedUser(user); setShowEditModal(true) }}
                          className="p-2 text-gray-600 hover:text-primary-600 hover:bg-primary-50 rounded-lg transition-colors"
                        >
                          <PencilIcon className="h-5 w-5" />
                        </button>
                        <button
                          onClick={() => { setSelectedUser(user); setShowDeleteModal(true) }}
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

      {/* Edit Modal */}
      {showEditModal && selectedUser && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full">
            <div className="flex items-center justify-between p-6 border-b">
              <h3 className="text-xl font-serif font-bold text-gray-900">Modifier l'utilisateur</h3>
              <button onClick={() => setShowEditModal(false)} className="text-gray-500 hover:text-gray-700">
                <XMarkIcon className="h-6 w-6" />
              </button>
            </div>
            <form
              onSubmit={(e) => {
                e.preventDefault()
                const formData = new FormData(e.target)
                updateUserMutation.mutate({
                  id: selectedUser.id,
                  data: { role: formData.get('role'), status: formData.get('status') }
                })
              }}
              className="p-6 space-y-4"
            >
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Rôle</label>
                <select name="role" className="input" defaultValue={selectedUser.role}>
                  <option value="CLIENT">Client</option>
                  <option value="CREATOR">Créateur</option>
                  <option value="ADMIN">Admin</option>
                  {currentUser?.role === 'SUPER_ADMIN' && <option value="SUPER_ADMIN">Super Admin</option>}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Statut</label>
                <select name="status" className="input" defaultValue={selectedUser.status}>
                  <option value="ACTIVE">Actif</option>
                  <option value="INACTIVE">Inactif</option>
                  <option value="SUSPENDED">Suspendu</option>
                </select>
              </div>
              <div className="flex space-x-4 pt-4">
                <button type="button" onClick={() => setShowEditModal(false)} className="flex-1 btn-secondary">Annuler</button>
                <button type="submit" disabled={updateUserMutation.isLoading} className="flex-1 btn-primary">
                  {updateUserMutation.isLoading ? 'Enregistrement...' : 'Enregistrer'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Modal */}
      {showDeleteModal && selectedUser && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6">
            <div className="text-center">
              <ExclamationTriangleIcon className="h-16 w-16 text-red-500 mx-auto mb-4" />
              <h3 className="text-xl font-bold text-gray-900 mb-2">Supprimer l'utilisateur</h3>
              <p className="text-gray-600 mb-6">
                Êtes-vous sûr de vouloir supprimer <strong>{selectedUser.firstName} {selectedUser.lastName}</strong> ?
                Cette action est irréversible.
              </p>
              <div className="flex space-x-4">
                <button onClick={() => setShowDeleteModal(false)} className="flex-1 btn-secondary">Annuler</button>
                <button
                  onClick={() => deleteUserMutation.mutate(selectedUser.id)}
                  disabled={deleteUserMutation.isLoading}
                  className="flex-1 bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700"
                >
                  {deleteUserMutation.isLoading ? 'Suppression...' : 'Supprimer'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Create Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full">
            <div className="flex items-center justify-between p-6 border-b">
              <h3 className="text-xl font-serif font-bold text-gray-900">Créer un utilisateur</h3>
              <button onClick={() => setShowCreateModal(false)} className="text-gray-500 hover:text-gray-700">
                <XMarkIcon className="h-6 w-6" />
              </button>
            </div>
            <form
              onSubmit={(e) => {
                e.preventDefault()
                const formData = new FormData(e.target)
                createUserMutation.mutate({
                  email: formData.get('email'),
                  password: formData.get('password'),
                  firstName: formData.get('firstName'),
                  lastName: formData.get('lastName'),
                  phone: formData.get('phone') || null,
                  role: formData.get('role') || 'CLIENT',
                  status: 'ACTIVE'
                })
              }}
              className="p-6 space-y-4"
            >
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Prénom</label>
                <input type="text" name="firstName" className="input" required />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nom</label>
                <input type="text" name="lastName" className="input" required />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                <input type="email" name="email" className="input" required />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Mot de passe</label>
                <input type="password" name="password" className="input" required />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Téléphone (optionnel)</label>
                <input type="tel" name="phone" className="input" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Rôle</label>
                <select name="role" className="input" defaultValue="CLIENT">
                  <option value="CLIENT">Client</option>
                  <option value="CREATOR">Créateur</option>
                  <option value="ADMIN">Admin</option>
                  {currentUser?.role === 'SUPER_ADMIN' && <option value="SUPER_ADMIN">Super Admin</option>}
                </select>
              </div>
              <div className="flex space-x-4 pt-4">
                <button type="button" onClick={() => setShowCreateModal(false)} className="flex-1 btn-secondary">Annuler</button>
                <button type="submit" disabled={createUserMutation.isLoading} className="flex-1 btn-primary">
                  {createUserMutation.isLoading ? 'Création...' : 'Créer'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
