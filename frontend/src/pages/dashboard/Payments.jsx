import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useQuery } from 'react-query'
import { weddingAPI, invitationOrderAPI } from '../../services/api'
import BuyQuotaModal from '../../components/invitations/BuyQuotaModal'
import { formatMoney } from '../../utils/currency'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'
import {
  TicketIcon,
  CheckCircleIcon,
  ClockIcon,
  XCircleIcon,
  ShoppingCartIcon,
  HeartIcon,
  CurrencyDollarIcon,
  GiftIcon,
  WalletIcon
} from '@heroicons/react/24/outline'

const EVENT_TYPE_LABELS = { WEDDING: 'Mariage', BIRTHDAY: 'Anniversaire', DOT: 'Mariage coutumier', CEREMONY: 'Cérémonie', CONFERENCE: 'Conférence', OTHER: 'Événement' }
const eventDisplayName = (w) =>
  (!w.eventType || w.eventType === 'WEDDING') ? `${w.brideName} & ${w.groomName}` : (w.eventTitle || EVENT_TYPE_LABELS[w.eventType])

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
  const pct = quota?.totalAllowed ? Math.min(100, Math.round((quota.used / quota.totalAllowed) * 100)) : 0
  const isLow = quota && quota.remaining === 0

  return (
    <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl gap-4">
      <div className="flex items-center gap-3 flex-1 min-w-0">
        <div className="h-10 w-10 rounded-full bg-primary-100 flex items-center justify-center shrink-0">
          <HeartIcon className="h-5 w-5 text-primary-600" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <p className="font-medium text-gray-900 truncate">{eventDisplayName(wedding)}</p>
            <span className="shrink-0 text-xs px-1.5 py-0.5 rounded bg-gray-200 text-gray-600">
              {EVENT_TYPE_LABELS[wedding.eventType] || 'Mariage'}
            </span>
          </div>
          {quota && (
            <>
              <p className="text-sm text-gray-500 mt-0.5">
                {quota.used} générée{quota.used > 1 ? 's' : ''} / {quota.totalAllowed} achetée{quota.totalAllowed > 1 ? 's' : ''}
                {quota.freeQuota > 0 ? ` (dont ${quota.freeQuota} gratuite${quota.freeQuota > 1 ? 's' : ''})` : ''}
              </p>
              <div className="w-full h-1.5 bg-gray-200 rounded-full mt-1.5 overflow-hidden">
                <div
                  className={`h-full rounded-full ${isLow ? 'bg-amber-500' : 'bg-primary-500'}`}
                  style={{ width: `${pct}%` }}
                />
              </div>
            </>
          )}
        </div>
      </div>
      <div className="text-right shrink-0">
        {quota && (
          <p className={`text-sm font-semibold mb-1 ${isLow ? 'text-amber-600' : 'text-gray-900'}`}>
            {quota.remaining} restante{quota.remaining > 1 ? 's' : ''}
          </p>
        )}
        <button onClick={() => onBuy(wedding.id)} className="btn-secondary btn-sm">
          <ShoppingCartIcon className="h-4 w-4 mr-1" />
          Acheter
        </button>
      </div>
    </div>
  )
}

export default function Payments() {
  const [buyModalWeddingId, setBuyModalWeddingId] = useState(null)

  const { data: weddingsData } = useQuery('weddings', () => weddingAPI.getAll())
  const weddings = weddingsData?.data?.weddings || []

  const { data: ordersData, isLoading } = useQuery('my-invitation-orders', () => invitationOrderAPI.getMine())
  const orders = ordersData?.data?.orders || []

  const { data: pricingData } = useQuery('invitation-pricing', () => invitationOrderAPI.getPricing())
  const pricing = pricingData?.data || { unitPrice: 0, paymentMethods: [] }

  const approvedOrders = orders.filter(o => o.status === 'APPROVED')
  const pendingOrders = orders.filter(o => o.status === 'PENDING')
  const totalSpent = approvedOrders.reduce((sum, o) => sum + Number(o.totalAmount || 0), 0)

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-serif font-bold text-gray-900">Paiements</h1>
        <p className="text-gray-600 mt-1">
          Achetez le quota d'invitations de vos événements via Mobile Money (paiement en FC).
        </p>
      </div>

      {/* Summary stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 flex items-center gap-3">
          <div className="p-2.5 bg-primary-50 rounded-lg"><CurrencyDollarIcon className="h-5 w-5 text-primary-600" /></div>
          <div>
            <p className="text-xl font-bold text-gray-900">{formatMoney(totalSpent)}</p>
            <p className="text-xs text-gray-500">Total dépensé</p>
          </div>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 flex items-center gap-3">
          <div className="p-2.5 bg-amber-50 rounded-lg"><ClockIcon className="h-5 w-5 text-amber-600" /></div>
          <div>
            <p className="text-xl font-bold text-gray-900">{pendingOrders.length}</p>
            <p className="text-xs text-gray-500">Commande{pendingOrders.length > 1 ? 's' : ''} en attente</p>
          </div>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 flex items-center gap-3">
          <div className="p-2.5 bg-green-50 rounded-lg"><WalletIcon className="h-5 w-5 text-green-600" /></div>
          <div>
            <p className="text-xl font-bold text-gray-900">Selon le design</p>
            <p className="text-xs text-gray-500">Prix par invitation</p>
          </div>
        </div>
      </div>

      {/* Pricing & payment info */}
      <div className="bg-primary-50 border border-primary-100 rounded-xl p-5 flex items-start gap-3">
        <GiftIcon className="h-5 w-5 text-primary-600 mt-0.5 shrink-0" />
        <div className="text-sm text-primary-900">
          <p>
            Le <strong>prix par invitation dépend du design choisi</strong> pour votre événement.
            Achetez votre quota, puis générez vos invitations.
          </p>
          <p className="mt-2 text-primary-700">
            Paiement <strong>Mobile Money</strong> instantané en <strong>FC</strong>
            {' '}(Airtel Money, Orange Money, M-Pesa) — cliquez sur « Acheter » pour payer.
          </p>
        </div>
      </div>

      {/* Quota per wedding */}
      {weddings.length > 0 && (
        <div className="bg-white rounded-xl shadow-lg p-6">
          <h2 className="text-lg font-serif font-bold text-gray-900 mb-4">
            Mes événements — quota d'invitations
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
            <table className="table table-responsive">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Événement</th>
                  <th>Quantité</th>
                  <th>Montant</th>
                  <th>Référence transaction</th>
                  <th>Statut</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {orders.map((order) => (
                  <tr key={order.id}>
                    <td data-label="Date">{format(new Date(order.createdAt), 'd MMM yyyy', { locale: fr })}</td>
                    <td data-label="Événement">
                      {order.wedding ? (
                        <Link to={`/weddings/${order.wedding.id}/invitations`} className="text-primary-600 hover:underline">
                          {eventDisplayName(order.wedding)}
                        </Link>
                      ) : '-'}
                    </td>
                    <td data-label="Quantité" className="font-medium">{order.quantity}</td>
                    <td data-label="Montant" className="font-medium">{formatMoney(order.totalAmount)}</td>
                    <td data-label="Référence" className="font-mono text-sm text-gray-600">
                      {order.transactionId || <span className="text-gray-400 italic">non soumise</span>}
                    </td>
                    <td data-label="Statut">{getStatusBadge(order.status)}</td>
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
