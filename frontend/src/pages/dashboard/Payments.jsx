import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useQuery } from 'react-query'
import { weddingAPI, invitationOrderAPI } from '../../services/api'
import BuyQuotaModal from '../../components/invitations/BuyQuotaModal'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'
import {
  TicketIcon,
  CheckCircleIcon,
  ClockIcon,
  XCircleIcon,
  ShoppingCartIcon,
  HeartIcon
} from '@heroicons/react/24/outline'

function getStatusBadge(status) {
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

function WeddingQuotaRow({ wedding, onBuy }) {
  const { data: quotaData } = useQuery(
    ['quota', wedding.id],
    () => invitationOrderAPI.getQuota(wedding.id)
  )
  const quota = quotaData?.data?.quota

  return (
    <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
      <div className="flex items-center gap-3">
        <div className="h-10 w-10 rounded-full bg-primary-100 flex items-center justify-center">
          <HeartIcon className="h-5 w-5 text-primary-600" />
        </div>
        <div>
          <p className="font-medium text-gray-900">{wedding.brideName} & {wedding.groomName}</p>
          {quota && (
            <p className="text-sm text-gray-500">
              {quota.remaining} invitation{quota.remaining > 1 ? 's' : ''} restante{quota.remaining > 1 ? 's' : ''} sur {quota.totalAllowed}
            </p>
          )}
        </div>
      </div>
      <button onClick={() => onBuy(wedding.id)} className="btn-secondary btn-sm">
        <ShoppingCartIcon className="h-4 w-4 mr-1" />
        Acheter
      </button>
    </div>
  )
}

export default function Payments() {
  const [buyModalWeddingId, setBuyModalWeddingId] = useState(null)

  const { data: weddingsData } = useQuery('weddings', () => weddingAPI.getAll())
  const weddings = weddingsData?.data?.weddings || []

  const { data: ordersData, isLoading } = useQuery('my-invitation-orders', () => invitationOrderAPI.getMine())
  const orders = ordersData?.data?.orders || []

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-serif font-bold text-gray-900">Paiements</h1>
        <p className="text-gray-600 mt-1">
          Chaque mariage a droit à 1 invitation gratuite. Au-delà, achetez votre quota via Mobile Money.
        </p>
      </div>

      {/* Quota per wedding */}
      {weddings.length > 0 && (
        <div className="bg-white rounded-xl shadow-lg p-6">
          <h2 className="text-lg font-serif font-bold text-gray-900 mb-4">
            Mes mariages — quota d'invitations
          </h2>
          <div className="space-y-3">
            {weddings.map((wedding) => (
              <WeddingQuotaRow key={wedding.id} wedding={wedding} onBuy={setBuyModalWeddingId} />
            ))}
          </div>
        </div>
      )}

      {/* Order history */}
      <div className="bg-white rounded-xl shadow-lg overflow-hidden">
        <div className="p-6 border-b">
          <h2 className="text-xl font-serif font-bold text-gray-900">
            Historique de mes commandes
          </h2>
        </div>

        {isLoading ? (
          <div className="p-12 text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto"></div>
          </div>
        ) : orders.length === 0 ? (
          <div className="p-12 text-center text-gray-500">
            <TicketIcon className="h-16 w-16 text-gray-300 mx-auto mb-4" />
            Aucune commande d'invitations pour le moment
          </div>
        ) : (
          <div className="table-container">
            <table className="table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Mariage</th>
                  <th>Quantité</th>
                  <th>Montant</th>
                  <th>Référence transaction</th>
                  <th>Statut</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {orders.map((order) => (
                  <tr key={order.id}>
                    <td>{format(new Date(order.createdAt), 'd MMM yyyy', { locale: fr })}</td>
                    <td>
                      {order.wedding ? (
                        <Link to={`/weddings/${order.wedding.id}/invitations`} className="text-primary-600 hover:underline">
                          {order.wedding.brideName} & {order.wedding.groomName}
                        </Link>
                      ) : '-'}
                    </td>
                    <td className="font-medium">{order.quantity}</td>
                    <td className="font-medium">{Number(order.totalAmount).toLocaleString()} $</td>
                    <td className="font-mono text-sm text-gray-600">
                      {order.transactionId || <span className="text-gray-400 italic">non soumise</span>}
                    </td>
                    <td>{getStatusBadge(order.status)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <BuyQuotaModal
        weddingId={buyModalWeddingId}
        isOpen={!!buyModalWeddingId}
        onClose={() => setBuyModalWeddingId(null)}
      />
    </div>
  )
}
