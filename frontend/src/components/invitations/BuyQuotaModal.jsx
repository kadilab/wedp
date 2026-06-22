import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from 'react-query'
import { invitationOrderAPI, couponAPI } from '../../services/api'
import toast from 'react-hot-toast'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'
import {
  XMarkIcon,
  CheckCircleIcon,
  ClockIcon,
  XCircleIcon
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

export default function BuyQuotaModal({ weddingId, isOpen, onClose }) {
  const queryClient = useQueryClient()
  const [view, setView] = useState('list') // list | order | submit
  const [quantity, setQuantity] = useState(10)
  const [activeOrderId, setActiveOrderId] = useState(null)
  const [transactionForm, setTransactionForm] = useState({ transactionId: '', paymentProvider: '', payerPhone: '' })
  const [couponCode, setCouponCode] = useState('')
  const [appliedCoupon, setAppliedCoupon] = useState(null) // { code, discount, finalAmount }
  const [couponError, setCouponError] = useState('')

  const { data: pricingData } = useQuery(
    'invitation-pricing',
    () => invitationOrderAPI.getPricing(),
    { enabled: isOpen }
  )
  const { data: ordersData } = useQuery(
    ['invitation-orders', weddingId],
    () => invitationOrderAPI.getMyOrders(weddingId),
    { enabled: isOpen && !!weddingId }
  )

  const pricing = pricingData?.data || { unitPrice: 0, paymentMethods: [] }
  const orders = ordersData?.data?.orders || []
  const total = Math.round(quantity * pricing.unitPrice * 100) / 100
  const finalTotal = appliedCoupon ? appliedCoupon.finalAmount : total

  const validateCouponMutation = useMutation(
    () => couponAPI.validate(couponCode.trim(), total),
    {
      onSuccess: (res) => {
        setAppliedCoupon({ code: couponCode.trim().toUpperCase(), ...res.data })
        setCouponError('')
        toast.success('Coupon appliqué !')
      },
      onError: (err) => {
        setAppliedCoupon(null)
        setCouponError(err.response?.data?.error || 'Code coupon invalide')
      }
    }
  )

  const removeCoupon = () => {
    setAppliedCoupon(null)
    setCouponCode('')
    setCouponError('')
  }

  const createOrderMutation = useMutation(
    () => invitationOrderAPI.createOrder(weddingId, quantity, appliedCoupon?.code),
    {
      onSuccess: (res) => {
        queryClient.invalidateQueries(['invitation-orders', weddingId])
        setActiveOrderId(res.data.order.id)
        setTransactionForm({ transactionId: '', paymentProvider: '', payerPhone: '' })
        removeCoupon()
        setView('submit')
      },
      onError: (err) => toast.error(err.response?.data?.error || 'Erreur lors de la création de la commande')
    }
  )

  const submitTransactionMutation = useMutation(
    () => invitationOrderAPI.submitTransaction(weddingId, activeOrderId, transactionForm),
    {
      onSuccess: () => {
        toast.success('Numéro de transaction envoyé. En attente de validation.')
        queryClient.invalidateQueries(['invitation-orders', weddingId])
        queryClient.invalidateQueries(['quota', weddingId])
        setView('list')
      },
      onError: (err) => toast.error(err.response?.data?.error || 'Erreur lors de l\'envoi')
    }
  )

  if (!isOpen) return null

  const close = () => {
    setView('list')
    removeCoupon()
    onClose()
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b">
          <h3 className="text-xl font-serif font-bold text-gray-900">
            Acheter des invitations
          </h3>
          <button onClick={close} className="text-gray-500 hover:text-gray-700">
            <XMarkIcon className="h-6 w-6" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {view === 'list' && (
            <>
              <div>
                <label htmlFor="buyQty" className="block text-sm font-medium text-gray-700 mb-1">
                  Combien d'invitations voulez-vous générer ?
                </label>
                <input
                  id="buyQty"
                  type="number"
                  min="1"
                  className="input"
                  value={quantity}
                  onChange={(e) => {
                    setQuantity(Math.max(1, parseInt(e.target.value) || 1))
                    removeCoupon()
                  }}
                />
                <p className="text-sm text-gray-500 mt-2">
                  Prix unitaire : {pricing.unitPrice}$ — Total :{' '}
                  {appliedCoupon ? (
                    <>
                      <span className="line-through text-gray-400">{total}$</span>{' '}
                      <span className="font-semibold text-green-600">{finalTotal}$</span>
                    </>
                  ) : (
                    <span className="font-semibold text-gray-900">{total}$</span>
                  )}
                </p>
              </div>

              <div>
                <label htmlFor="couponCode" className="block text-sm font-medium text-gray-700 mb-1">
                  Code promo (optionnel)
                </label>
                {appliedCoupon ? (
                  <div className="flex items-center justify-between p-3 bg-green-50 border border-green-200 rounded-lg">
                    <span className="text-sm text-green-700">
                      Coupon <strong>{appliedCoupon.code}</strong> appliqué — réduction de {appliedCoupon.discount}$
                    </span>
                    <button onClick={removeCoupon} className="text-xs text-green-700 underline hover:text-green-900">
                      Retirer
                    </button>
                  </div>
                ) : (
                  <div className="flex gap-2">
                    <input
                      id="couponCode"
                      type="text"
                      className="input flex-1 font-mono uppercase"
                      placeholder="Ex: WEDX1Y2Z3"
                      value={couponCode}
                      onChange={(e) => { setCouponCode(e.target.value.toUpperCase()); setCouponError('') }}
                    />
                    <button
                      type="button"
                      onClick={() => validateCouponMutation.mutate()}
                      disabled={!couponCode.trim() || validateCouponMutation.isLoading}
                      className="btn-secondary whitespace-nowrap"
                    >
                      {validateCouponMutation.isLoading ? 'Vérification...' : 'Appliquer'}
                    </button>
                  </div>
                )}
                {couponError && <p className="text-xs text-red-600 mt-1">{couponError}</p>}
              </div>

              {pricing.paymentMethods.length > 0 ? (
                <div className="p-4 bg-gray-50 rounded-xl space-y-3">
                  <p className="text-sm font-medium text-gray-700">Moyens de paiement disponibles</p>
                  {pricing.paymentMethods.map((m, i) => (
                    <div key={i} className="text-sm flex items-start gap-2">
                      {m.logo && (
                        <img src={m.logo} alt={m.provider} className="w-8 h-8 object-contain rounded shrink-0" />
                      )}
                      <div>
                        <span className="font-semibold text-gray-900">{m.provider}</span>{' '}
                        <span className="font-mono text-gray-700">{m.number}</span>
                        {m.instructions && <p className="text-gray-500 mt-0.5">{m.instructions}</p>}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-amber-600">
                  Aucun moyen de paiement n'est configuré pour le moment. Contactez le support.
                </p>
              )}

              <button
                onClick={() => createOrderMutation.mutate()}
                disabled={createOrderMutation.isLoading || pricing.paymentMethods.length === 0}
                className="btn-primary w-full"
              >
                {createOrderMutation.isLoading ? 'Création...' : `Commander ${quantity} invitation(s) — ${finalTotal}$`}
              </button>

              {orders.length > 0 && (
                <div className="pt-4 border-t">
                  <p className="text-sm font-medium text-gray-700 mb-2">Mes commandes</p>
                  <div className="space-y-2 max-h-48 overflow-y-auto">
                    {orders.map((order) => (
                      <div key={order.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg text-sm">
                        <div>
                          <p className="font-medium text-gray-900">{order.quantity} invitation(s) — {order.totalAmount}$</p>
                          <p className="text-gray-500 text-xs">
                            {format(new Date(order.createdAt), 'd MMM yyyy', { locale: fr })}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          {getStatusBadge(order.status)}
                          {order.status === 'PENDING' && !order.transactionId && (
                            <button
                              onClick={() => {
                                setActiveOrderId(order.id)
                                setTransactionForm({ transactionId: '', paymentProvider: '', payerPhone: '' })
                                setView('submit')
                              }}
                              className="text-primary-600 hover:text-primary-700 text-xs font-medium underline"
                            >
                              Soumettre
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}

          {view === 'submit' && (
            <>
              <p className="text-sm text-gray-600">
                Une fois le paiement envoyé, indiquez ci-dessous le numéro de transaction reçu pour que
                nous puissions valider votre commande.
              </p>

              <div>
                <label htmlFor="txProvider" className="block text-sm font-medium text-gray-700 mb-1">
                  Moyen de paiement utilisé
                </label>
                <input
                  id="txProvider"
                  type="text"
                  className="input"
                  placeholder="Ex: Orange Money"
                  value={transactionForm.paymentProvider}
                  onChange={(e) => setTransactionForm(prev => ({ ...prev, paymentProvider: e.target.value }))}
                />
              </div>

              <div>
                <label htmlFor="txPhone" className="block text-sm font-medium text-gray-700 mb-1">
                  Numéro depuis lequel l'argent a été envoyé (optionnel)
                </label>
                <input
                  id="txPhone"
                  type="tel"
                  className="input"
                  value={transactionForm.payerPhone}
                  onChange={(e) => setTransactionForm(prev => ({ ...prev, payerPhone: e.target.value }))}
                />
              </div>

              <div>
                <label htmlFor="txId" className="block text-sm font-medium text-gray-700 mb-1">
                  Numéro de transaction
                </label>
                <input
                  id="txId"
                  type="text"
                  className="input"
                  placeholder="Ex: MP240619.1234.A56789"
                  value={transactionForm.transactionId}
                  onChange={(e) => setTransactionForm(prev => ({ ...prev, transactionId: e.target.value }))}
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button onClick={() => setView('list')} className="flex-1 btn-outline">
                  Retour
                </button>
                <button
                  onClick={() => submitTransactionMutation.mutate()}
                  disabled={submitTransactionMutation.isLoading || !transactionForm.transactionId.trim()}
                  className="flex-1 btn-primary"
                >
                  {submitTransactionMutation.isLoading ? 'Envoi...' : 'Envoyer'}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
