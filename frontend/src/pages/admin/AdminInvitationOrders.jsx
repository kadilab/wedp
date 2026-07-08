import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from 'react-query'
import { adminAPI } from '../../services/api'
import { formatMoney } from '../../utils/currency'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'
import toast from 'react-hot-toast'
import {
  TicketIcon,
  EyeIcon,
  CheckCircleIcon,
  XCircleIcon,
  ClockIcon,
  XMarkIcon,
  CalendarDaysIcon,
} from '@heroicons/react/24/outline'

const STATUS_META = {
  APPROVED: { label: 'Approuvée', cls: 'bg-green-100 text-green-700', Icon: CheckCircleIcon },
  PENDING: { label: 'En attente', cls: 'bg-amber-100 text-amber-700', Icon: ClockIcon },
  REJECTED: { label: 'Rejetée', cls: 'bg-red-100 text-red-700', Icon: XCircleIcon },
}

function StatusBadge({ status }) {
  const m = STATUS_META[status] || { label: status, cls: 'bg-gray-100 text-gray-600', Icon: ClockIcon }
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold ${m.cls}`}>
      <m.Icon className="h-3.5 w-3.5" /> {m.label}
    </span>
  )
}

const initials = (u) => `${(u?.firstName || '')[0] || ''}${(u?.lastName || '')[0] || ''}`.toUpperCase() || '?'
const weddingName = (o) => (o.wedding ? `${o.wedding.brideName} & ${o.wedding.groomName}` : '—')

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

  const pendingCount = orders.filter(o => o.status === 'PENDING').length

  const FILTERS = [
    { value: '', label: 'Toutes' },
    { value: 'PENDING', label: 'En attente' },
    { value: 'APPROVED', label: 'Approuvées' },
    { value: 'REJECTED', label: 'Rejetées' },
  ]

  return (
    <div className="space-y-6">
      {/* Header banner */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-primary-600 via-primary-500 to-secondary-500 p-6 text-white shadow-lg sm:p-8">
        <div className="pointer-events-none absolute -right-10 -top-10 h-48 w-48 rounded-full bg-white/10" />
        <div className="pointer-events-none absolute -bottom-16 -left-8 h-56 w-56 rounded-full bg-white/5" />
        <div className="relative flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-4">
            <div className="hidden h-14 w-14 items-center justify-center rounded-2xl bg-white/20 backdrop-blur sm:flex">
              <TicketIcon className="h-7 w-7" />
            </div>
            <div>
              <h1 className="font-serif text-3xl font-bold sm:text-4xl">Achats d'invitations</h1>
              <p className="mt-1 text-white/80">Validez les commandes de quota payées par mobile money</p>
            </div>
          </div>
          {pendingCount > 0 && (
            <div className="flex items-center gap-3 rounded-2xl bg-white/15 px-5 py-3 backdrop-blur">
              <span className="text-3xl font-bold leading-none">{pendingCount}</span>
              <span className="text-sm leading-tight text-white/80">commande(s)<br />en attente</span>
            </div>
          )}
        </div>
      </div>

      {/* Filter pills */}
      <div className="flex flex-wrap gap-2">
        {FILTERS.map((f) => (
          <button
            key={f.value || 'all'}
            onClick={() => setStatusFilter(f.value)}
            className={`rounded-full px-5 py-2.5 text-sm font-semibold transition-colors ${
              statusFilter === f.value ? 'bg-primary-600 text-white shadow-sm' : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Orders — responsive card list (no horizontal scroll) */}
      {isLoading ? (
        <div className="rounded-2xl border border-gray-100 bg-white p-12 text-center shadow-sm">
          <div className="mx-auto h-12 w-12 animate-spin rounded-full border-2 border-primary-500 border-t-transparent" />
        </div>
      ) : orders.length === 0 ? (
        <div className="rounded-2xl border border-gray-100 bg-white p-16 text-center shadow-sm">
          <div className="mx-auto mb-4 grid h-16 w-16 place-items-center rounded-2xl bg-primary-50 text-primary-500">
            <TicketIcon className="h-8 w-8" />
          </div>
          <p className="font-serif text-xl font-bold text-gray-900">Aucune commande</p>
          <p className="mt-1 text-gray-500">Rien à afficher pour ce filtre.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {orders.map((order) => {
            const pending = order.status === 'PENDING'
            return (
              <div
                key={order.id}
                className={`rounded-2xl border p-4 transition-shadow hover:shadow-md ${pending ? 'border-amber-200 bg-amber-50/50' : 'border-gray-200 bg-white'}`}
              >
                <div className="flex flex-col gap-4 lg:flex-row lg:items-center">
                  {/* User */}
                  <div className="flex min-w-0 items-center gap-3 lg:w-60">
                    <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-primary-100 text-sm font-bold text-primary-700">
                      {initials(order.user)}
                    </span>
                    <div className="min-w-0">
                      <p className="truncate font-semibold text-gray-900">{order.user?.firstName} {order.user?.lastName}</p>
                      <p className="truncate text-xs text-gray-500">{order.user?.email}</p>
                    </div>
                  </div>

                  {/* Wedding */}
                  <div className="min-w-0 flex-1">
                    <p className="text-[11px] font-medium uppercase tracking-wide text-gray-400">Événement</p>
                    <p className="truncate text-sm font-medium text-gray-700">{weddingName(order)}</p>
                  </div>

                  {/* Quantity + amount */}
                  <div className="flex items-center gap-6">
                    <div>
                      <p className="text-[11px] font-medium uppercase tracking-wide text-gray-400">Quantité</p>
                      <p className="text-sm font-bold text-gray-900">{order.quantity}</p>
                    </div>
                    <div>
                      <p className="text-[11px] font-medium uppercase tracking-wide text-gray-400">Montant</p>
                      <p className="text-sm font-bold text-gray-900">{formatMoney(order.totalAmount)}</p>
                    </div>
                  </div>

                  {/* Reference + date */}
                  <div className="lg:w-44">
                    <p className="truncate font-mono text-xs text-gray-600">
                      {order.transactionId || <span className="italic text-gray-400">non soumise</span>}
                    </p>
                    <p className="mt-0.5 inline-flex items-center gap-1 text-xs text-gray-400">
                      <CalendarDaysIcon className="h-3.5 w-3.5" />
                      {format(new Date(order.createdAt), 'd MMM yyyy HH:mm', { locale: fr })}
                    </p>
                  </div>

                  {/* Status + action */}
                  <div className="flex items-center justify-between gap-2 lg:justify-end">
                    <StatusBadge status={order.status} />
                    <button
                      onClick={() => { setSelectedOrder(order); setShowViewModal(true) }}
                      className="inline-flex items-center gap-1.5 rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm font-semibold text-gray-700 transition-colors hover:border-primary-300 hover:bg-primary-50 hover:text-primary-700"
                    >
                      <EyeIcon className="h-4 w-4" /> Voir
                    </button>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* View/Validate Modal */}
      {showViewModal && selectedOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-stone-950/60 p-4 backdrop-blur-sm">
          <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl bg-white shadow-2xl">
            <div className="sticky top-0 flex items-center justify-between border-b border-gray-100 bg-white p-5">
              <h3 className="font-serif text-xl font-bold text-gray-900">Détails de la commande</h3>
              <button onClick={() => setShowViewModal(false)} className="rounded-full p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-700">
                <XMarkIcon className="h-5 w-5" />
              </button>
            </div>
            <div className="space-y-5 p-5">
              {/* User */}
              <div className="flex items-center gap-3 rounded-2xl bg-gray-50 p-4">
                <span className="grid h-12 w-12 place-items-center rounded-full bg-primary-100 font-bold text-primary-700">
                  {initials(selectedOrder.user)}
                </span>
                <div className="min-w-0">
                  <p className="truncate font-semibold text-gray-900">{selectedOrder.user?.firstName} {selectedOrder.user?.lastName}</p>
                  <p className="truncate text-sm text-gray-500">{selectedOrder.user?.email}</p>
                </div>
              </div>

              {/* Details */}
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-2xl bg-gray-50 p-4">
                  <p className="text-xs text-gray-500">Événement</p>
                  <p className="mt-0.5 font-semibold text-gray-900">{weddingName(selectedOrder)}</p>
                </div>
                <div className="rounded-2xl bg-gray-50 p-4">
                  <p className="text-xs text-gray-500">Quantité</p>
                  <p className="mt-0.5 font-semibold text-gray-900">{selectedOrder.quantity} invitation(s)</p>
                </div>
                <div className="rounded-2xl bg-gray-50 p-4">
                  <p className="text-xs text-gray-500">Montant total</p>
                  <p className="mt-0.5 font-semibold text-gray-900">{formatMoney(selectedOrder.totalAmount)}</p>
                </div>
                <div className="rounded-2xl bg-gray-50 p-4">
                  <p className="text-xs text-gray-500">Date</p>
                  <p className="mt-0.5 font-semibold text-gray-900">{format(new Date(selectedOrder.createdAt), 'd MMMM yyyy', { locale: fr })}</p>
                </div>
              </div>

              {/* Payment declared by client */}
              {(selectedOrder.paymentProvider || selectedOrder.payerPhone) && (
                <div className="grid grid-cols-2 gap-3">
                  {selectedOrder.paymentProvider && (
                    <div className="rounded-2xl bg-gray-50 p-4">
                      <p className="text-xs text-gray-500">Méthode déclarée</p>
                      <p className="mt-0.5 font-semibold text-gray-900">{selectedOrder.paymentProvider}</p>
                    </div>
                  )}
                  {selectedOrder.payerPhone && (
                    <div className="rounded-2xl bg-gray-50 p-4">
                      <p className="text-xs text-gray-500">Numéro payeur</p>
                      <p className="mt-0.5 font-semibold text-gray-900">{selectedOrder.payerPhone}</p>
                    </div>
                  )}
                </div>
              )}

              {/* Transaction reference */}
              <div className="rounded-2xl bg-gray-50 p-4">
                <p className="text-xs text-gray-500">Numéro de transaction</p>
                <p className="mt-0.5 font-mono font-semibold text-gray-900">
                  {selectedOrder.transactionId || <span className="italic text-gray-400">Pas encore soumis</span>}
                </p>
              </div>

              {/* Current status */}
              <div className="flex items-center justify-between rounded-2xl bg-gray-50 p-4">
                <span className="text-gray-600">Statut actuel</span>
                <StatusBadge status={selectedOrder.status} />
              </div>

              {/* Actions */}
              {selectedOrder.status === 'PENDING' && (
                <div className="flex gap-3 border-t border-gray-100 pt-4">
                  <button
                    onClick={() => updateOrderMutation.mutate({ id: selectedOrder.id, status: 'REJECTED' })}
                    disabled={updateOrderMutation.isLoading}
                    className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-red-100 px-4 py-3 font-semibold text-red-700 transition-colors hover:bg-red-200 disabled:opacity-50"
                  >
                    <XCircleIcon className="h-5 w-5" /> Rejeter
                  </button>
                  <button
                    onClick={() => updateOrderMutation.mutate({ id: selectedOrder.id, status: 'APPROVED' })}
                    disabled={updateOrderMutation.isLoading || !selectedOrder.transactionId}
                    title={!selectedOrder.transactionId ? "Le client n'a pas encore soumis de numéro de transaction" : ''}
                    className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-green-600 px-4 py-3 font-semibold text-white transition-colors hover:bg-green-700 disabled:opacity-50"
                  >
                    <CheckCircleIcon className="h-5 w-5" /> Approuver
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
