import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from 'react-query'
import { adminAPI } from '../../services/api'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'
import toast from 'react-hot-toast'
import {
  TicketIcon,
  EyeIcon,
  CheckCircleIcon,
  XCircleIcon,
  ClockIcon,
  XMarkIcon
} from '@heroicons/react/24/outline'

export default function AdminInvitationOrders() {
  const queryClient = useQueryClient()
  const [statusFilter, setStatusFilter] = useState('PENDING')
  const [selectedOrder, setSelectedOrder] = useState(null)
  const [showViewModal, setShowViewModal] = useState(false)

  const { data: ordersData, isLoading } = useQuery(
    ['admin-invitation-orders', statusFilter],
    () => adminAPI.getInvitationOrders({ status: statusFilter })
  )
  const orders = ordersData?.data?.orders || []

  const updateOrderMutation = useMutation(
    ({ id, status }) => adminAPI.updateInvitationOrder(id, { status }),
    {
      onSuccess: () => {
        queryClient.invalidateQueries('admin-invitation-orders')
        toast.success('Commande mise à jour')
        setShowViewModal(false)
      },
      onError: (err) => toast.error(err.response?.data?.error || 'Erreur')
    }
  )

  const getStatusBadge = (status) => {
    switch (status) {
      case 'APPROVED':
        return <span className="badge-success flex items-center"><CheckCircleIcon className="h-4 w-4 mr-1" />Approuvée</span>
      case 'PENDING':
        return <span className="badge-warning flex items-center"><ClockIcon className="h-4 w-4 mr-1" />En attente</span>
      case 'REJECTED':
        return <span className="badge-danger flex items-center"><XCircleIcon className="h-4 w-4 mr-1" />Rejetée</span>
      default:
        return <span className="badge">{status}</span>
    }
  }

  const pendingCount = orders.filter(o => o.status === 'PENDING').length

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-serif font-bold text-gray-900">Achats d'invitations</h1>
          <p className="text-gray-600 mt-1">Validez les commandes de quota d'invitations payées par mobile money</p>
        </div>
        {statusFilter === 'PENDING' && pendingCount > 0 && (
          <span className="bg-yellow-100 text-yellow-700 px-4 py-2 rounded-lg font-medium">
            {pendingCount} commande(s) en attente
          </span>
        )}
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl shadow-lg p-6">
        <div className="flex flex-wrap gap-2">
          {[
            { value: '', label: 'Toutes' },
            { value: 'PENDING', label: 'En attente' },
            { value: 'APPROVED', label: 'Approuvées' },
            { value: 'REJECTED', label: 'Rejetées' }
          ].map((filter) => (
            <button
              key={filter.value}
              onClick={() => setStatusFilter(filter.value)}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                statusFilter === filter.value
                  ? 'bg-primary-600 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {filter.label}
            </button>
          ))}
        </div>
      </div>

      {/* Orders Table */}
      <div className="bg-white rounded-xl shadow-lg overflow-hidden">
        {isLoading ? (
          <div className="p-12 text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto"></div>
          </div>
        ) : orders.length === 0 ? (
          <div className="p-12 text-center">
            <TicketIcon className="h-16 w-16 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500">Aucune commande trouvée</p>
          </div>
        ) : (
          <div className="table-container">
            <table className="table">
              <thead>
                <tr>
                  <th>Utilisateur</th>
                  <th>Mariage</th>
                  <th>Quantité</th>
                  <th>Montant</th>
                  <th>Référence</th>
                  <th>Date</th>
                  <th>Statut</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {orders.map((order) => (
                  <tr key={order.id} className={order.status === 'PENDING' ? 'bg-yellow-50' : ''}>
                    <td>
                      <div>
                        <p className="font-medium text-gray-900">
                          {order.user?.firstName} {order.user?.lastName}
                        </p>
                        <p className="text-sm text-gray-500">{order.user?.email}</p>
                      </div>
                    </td>
                    <td className="text-sm text-gray-600">
                      {order.wedding ? `${order.wedding.brideName} & ${order.wedding.groomName}` : '-'}
                    </td>
                    <td className="font-semibold text-gray-900">{order.quantity}</td>
                    <td className="font-semibold text-gray-900">
                      {Number(order.totalAmount).toLocaleString('fr-FR')} FC
                    </td>
                    <td className="text-sm text-gray-600 font-mono">
                      {order.transactionId || <span className="text-gray-400 italic">non soumise</span>}
                    </td>
                    <td className="text-sm text-gray-500">
                      {format(new Date(order.createdAt), 'd MMM yyyy HH:mm', { locale: fr })}
                    </td>
                    <td>{getStatusBadge(order.status)}</td>
                    <td>
                      <button
                        onClick={() => {
                          setSelectedOrder(order)
                          setShowViewModal(true)
                        }}
                        className="p-2 text-gray-600 hover:text-primary-600 hover:bg-primary-50 rounded-lg transition-colors"
                      >
                        <EyeIcon className="h-5 w-5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* View/Validate Modal */}
      {showViewModal && selectedOrder && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b sticky top-0 bg-white">
              <h3 className="text-xl font-serif font-bold text-gray-900">
                Détails de la commande
              </h3>
              <button onClick={() => setShowViewModal(false)} className="text-gray-500 hover:text-gray-700">
                <XMarkIcon className="h-6 w-6" />
              </button>
            </div>
            <div className="p-6 space-y-6">
              {/* User Info */}
              <div className="flex items-center p-4 bg-gray-50 rounded-xl">
                <div className="h-12 w-12 rounded-full bg-primary-100 flex items-center justify-center">
                  <span className="text-primary-600 font-bold">
                    {selectedOrder.user?.firstName?.charAt(0)}{selectedOrder.user?.lastName?.charAt(0)}
                  </span>
                </div>
                <div className="ml-4">
                  <p className="font-medium text-gray-900">
                    {selectedOrder.user?.firstName} {selectedOrder.user?.lastName}
                  </p>
                  <p className="text-sm text-gray-500">{selectedOrder.user?.email}</p>
                </div>
              </div>

              {/* Order Details */}
              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 bg-gray-50 rounded-xl">
                  <p className="text-sm text-gray-500">Mariage</p>
                  <p className="font-semibold text-gray-900">
                    {selectedOrder.wedding ? `${selectedOrder.wedding.brideName} & ${selectedOrder.wedding.groomName}` : '-'}
                  </p>
                </div>
                <div className="p-4 bg-gray-50 rounded-xl">
                  <p className="text-sm text-gray-500">Quantité</p>
                  <p className="font-semibold text-gray-900">{selectedOrder.quantity} invitation(s)</p>
                </div>
                <div className="p-4 bg-gray-50 rounded-xl">
                  <p className="text-sm text-gray-500">Montant total</p>
                  <p className="font-semibold text-gray-900">{Number(selectedOrder.totalAmount).toLocaleString()} $</p>
                </div>
                <div className="p-4 bg-gray-50 rounded-xl">
                  <p className="text-sm text-gray-500">Date</p>
                  <p className="font-semibold text-gray-900">
                    {format(new Date(selectedOrder.createdAt), 'd MMMM yyyy', { locale: fr })}
                  </p>
                </div>
              </div>

              {/* Payment declared by client */}
              {(selectedOrder.paymentProvider || selectedOrder.payerPhone) && (
                <div className="grid grid-cols-2 gap-4">
                  {selectedOrder.paymentProvider && (
                    <div className="p-4 bg-gray-50 rounded-xl">
                      <p className="text-sm text-gray-500">Méthode déclarée</p>
                      <p className="font-semibold text-gray-900">{selectedOrder.paymentProvider}</p>
                    </div>
                  )}
                  {selectedOrder.payerPhone && (
                    <div className="p-4 bg-gray-50 rounded-xl">
                      <p className="text-sm text-gray-500">Numéro payeur</p>
                      <p className="font-semibold text-gray-900">{selectedOrder.payerPhone}</p>
                    </div>
                  )}
                </div>
              )}

              {/* Transaction Reference */}
              <div className="p-4 bg-gray-50 rounded-xl">
                <p className="text-sm text-gray-500">Numéro de transaction</p>
                <p className="font-mono font-semibold text-gray-900">
                  {selectedOrder.transactionId || <span className="text-gray-400 italic">Pas encore soumis</span>}
                </p>
              </div>

              {/* Current Status */}
              <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
                <span className="text-gray-600">Statut actuel</span>
                {getStatusBadge(selectedOrder.status)}
              </div>

              {/* Actions */}
              {selectedOrder.status === 'PENDING' && (
                <div className="flex space-x-4 pt-4 border-t">
                  <button
                    onClick={() => updateOrderMutation.mutate({ id: selectedOrder.id, status: 'REJECTED' })}
                    disabled={updateOrderMutation.isLoading}
                    className="flex-1 bg-red-100 text-red-700 px-4 py-3 rounded-xl font-medium hover:bg-red-200 transition-colors flex items-center justify-center"
                  >
                    <XCircleIcon className="h-5 w-5 mr-2" />
                    Rejeter
                  </button>
                  <button
                    onClick={() => updateOrderMutation.mutate({ id: selectedOrder.id, status: 'APPROVED' })}
                    disabled={updateOrderMutation.isLoading || !selectedOrder.transactionId}
                    title={!selectedOrder.transactionId ? "Le client n'a pas encore soumis de numéro de transaction" : ''}
                    className="flex-1 bg-green-600 text-white px-4 py-3 rounded-xl font-medium hover:bg-green-700 transition-colors flex items-center justify-center disabled:opacity-50"
                  >
                    <CheckCircleIcon className="h-5 w-5 mr-2" />
                    Approuver
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
