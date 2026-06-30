import { useState, useMemo } from 'react'
import { useQuery, useMutation, useQueryClient } from 'react-query'
import { invitationOrderAPI, couponAPI } from '../../services/api'
import { formatMoney } from '../../utils/currency'
import toast from 'react-hot-toast'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'
import {
  XMarkIcon,
  CheckCircleIcon,
  ClockIcon,
  XCircleIcon,
  ShieldCheckIcon,
  DevicePhoneMobileIcon
} from '@heroicons/react/24/outline'

// Mobile Money operators (RDC). Logos live in /public/providers.
const OPERATORS = [
  { code: 'AIRTEL_COD', label: 'Airtel Money', logo: '/providers/airtel.png', prefixes: ['097', '098', '099'] },
  { code: 'ORANGE_COD', label: 'Orange Money', logo: '/providers/orange.png', prefixes: ['084', '085', '089', '080'] },
  { code: 'VODACOM_MPESA_COD', label: 'M-Pesa', logo: '/providers/mpesa.png', prefixes: ['081', '082', '083'] }
]

// Turn whatever the user typed into the international RDC format 243XXXXXXXXX.
// Accepts "097...", "97...", "0970000000", "+243970000000", "243970000000".
function buildFullPhone(local) {
  let p = String(local || '').replace(/\D/g, '')
  p = p.replace(/^243/, '') // user already typed the country code
  p = p.replace(/^0/, '')   // drop the national trunk 0
  return p ? '243' + p : ''
}

// Guess the operator from the local prefix (after dropping 243 / 0).
function detectOperator(local) {
  const p = String(local || '').replace(/\D/g, '').replace(/^243/, '').replace(/^0/, '')
  if (p.length < 3) return null
  const three = p.slice(0, 3)
  const match = OPERATORS.find((op) => op.prefixes.includes(three))
  return match ? match.code : null
}

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
  const [quantity, setQuantity] = useState(10)
  const [couponCode, setCouponCode] = useState('')
  const [appliedCoupon, setAppliedCoupon] = useState(null) // { code, discount, finalAmount }
  const [couponError, setCouponError] = useState('')
  // DIRECT (USSD) Mobile Money — RDC. The client picks an operator + enters their
  // local number, then validates the push on the handset. Status is auto-polled.
  const [provider, setProvider] = useState('')
  const [localPhone, setLocalPhone] = useState('')
  const [payingOnline, setPayingOnline] = useState(false)
  const [ussdMsg, setUssdMsg] = useState('')

  const { data: pricingData } = useQuery(
    ['invitation-pricing', weddingId],
    () => invitationOrderAPI.getPricing(weddingId),
    { enabled: isOpen && !!weddingId }
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

  const fullPhone = useMemo(() => buildFullPhone(localPhone), [localPhone])
  const phoneValid = /^243\d{9}$/.test(fullPhone)

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

  const onPhoneChange = (value) => {
    setLocalPhone(value)
    const guessed = detectOperator(value)
    if (guessed) setProvider(guessed)
  }

  // DIRECT (USSD) payment: create the order, init with operator + phone, then
  // the client validates the push on their handset. We poll K-PAY for the live
  // status; the webhook stays the source of truth. No admin action needed.
  const payDirect = async () => {
    if (!provider) return toast.error('Choisissez votre opérateur Mobile Money')
    if (!phoneValid) return toast.error('Numéro invalide. Saisissez votre numéro local (ex : 0970000000)')
    setPayingOnline(true)
    setUssdMsg('')
    try {
      const orderRes = await invitationOrderAPI.createOrder(weddingId, quantity, appliedCoupon?.code)
      const orderId = orderRes.data.order.id
      await invitationOrderAPI.payKpay(weddingId, orderId, { provider, phoneNumber: fullPhone })
      setUssdMsg('📲 Validez la demande sur votre téléphone (code PIN Mobile Money)…')

      let attempts = 0
      const poll = async () => {
        attempts++
        try {
          const { data } = await invitationOrderAPI.kpayStatus(weddingId, orderId)
          if (data.orderStatus === 'APPROVED' || data.paymentStatus === 'COMPLETED') {
            toast.success('Paiement réussi — invitations débloquées 🎉')
            queryClient.invalidateQueries(['quota', weddingId])
            queryClient.invalidateQueries(['invitation-orders', weddingId])
            setPayingOnline(false); setUssdMsg(''); close()
            return
          }
          if (data.paymentStatus === 'FAILED' || data.paymentStatus === 'CANCELLED') {
            toast.error('Paiement échoué ou annulé.')
            setPayingOnline(false); setUssdMsg('')
            return
          }
        } catch { /* transient — keep polling */ }
        if (attempts >= 30) {
          setUssdMsg('Toujours en attente… La confirmation se fera automatiquement dès validation.')
          setPayingOnline(false)
          queryClient.invalidateQueries(['invitation-orders', weddingId])
          return
        }
        setTimeout(poll, 3000)
      }
      setTimeout(poll, 3000)
    } catch (err) {
      toast.error(err.response?.data?.error || 'Erreur lors du paiement Mobile Money')
      setPayingOnline(false); setUssdMsg('')
    }
  }

  if (!isOpen) return null

  const close = () => {
    removeCoupon()
    setLocalPhone('')
    setProvider('')
    setUssdMsg('')
    onClose()
  }

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full max-h-[92vh] overflow-y-auto">
        {/* Header */}
        <div className="relative bg-gradient-to-br from-primary-600 to-primary-500 px-6 pt-6 pb-8 text-white">
          <button onClick={close} className="absolute top-4 right-4 text-white/80 hover:text-white">
            <XMarkIcon className="h-6 w-6" />
          </button>
          <h3 className="text-xl font-serif font-bold">Acheter des invitations</h3>
          <p className="text-primary-100 text-sm mt-1">Paiement Mobile Money instantané — en FC</p>
        </div>

        <div className="p-6 space-y-6 -mt-4 bg-white rounded-t-2xl relative">
          {/* Quantity + total card */}
          <div className="rounded-xl border border-gray-100 shadow-sm p-4">
            <label htmlFor="buyQty" className="block text-sm font-medium text-gray-700 mb-2">
              Combien d'invitations voulez-vous générer ?
            </label>
            <div className="flex items-center gap-3">
              <input
                id="buyQty"
                type="number"
                min="1"
                className="input w-24 text-center text-lg font-semibold"
                value={quantity}
                onChange={(e) => {
                  setQuantity(Math.max(1, parseInt(e.target.value) || 1))
                  removeCoupon()
                }}
              />
              <div className="flex-1 text-right">
                <p className="text-xs text-gray-400">Total à payer</p>
                {appliedCoupon ? (
                  <p>
                    <span className="line-through text-gray-400 text-sm mr-1">{formatMoney(total)}</span>
                    <span className="text-2xl font-bold text-green-600">{formatMoney(finalTotal)}</span>
                  </p>
                ) : (
                  <p className="text-2xl font-bold text-gray-900">{formatMoney(total)}</p>
                )}
                <p className="text-[11px] text-gray-400">{formatMoney(pricing.unitPrice)} / invitation</p>
              </div>
            </div>
          </div>

          {/* Coupon */}
          <div>
            <label htmlFor="couponCode" className="block text-sm font-medium text-gray-700 mb-1">
              Code promo (optionnel)
            </label>
            {appliedCoupon ? (
              <div className="flex items-center justify-between p-3 bg-green-50 border border-green-200 rounded-lg">
                <span className="text-sm text-green-700">
                  Coupon <strong>{appliedCoupon.code}</strong> — −{formatMoney(appliedCoupon.discount)}
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
                  {validateCouponMutation.isLoading ? '...' : 'Appliquer'}
                </button>
              </div>
            )}
            {couponError && <p className="text-xs text-red-600 mt-1">{couponError}</p>}
          </div>

          {/* Operator picker */}
          <div>
            <p className="text-sm font-medium text-gray-700 mb-2">Choisissez votre opérateur Mobile Money</p>
            <div className="grid grid-cols-3 gap-2">
              {OPERATORS.map((op) => {
                const active = provider === op.code
                return (
                  <button
                    key={op.code}
                    type="button"
                    onClick={() => setProvider(op.code)}
                    className={`flex flex-col items-center gap-1.5 px-2 py-3 rounded-xl border-2 transition ${active ? 'border-primary-500 bg-primary-50 ring-2 ring-primary-200' : 'border-gray-200 bg-white hover:border-primary-300'}`}
                  >
                    <img src={op.logo} alt={op.label} className="h-9 w-9 object-contain" />
                    <span className={`text-[11px] font-medium ${active ? 'text-primary-700' : 'text-gray-600'}`}>{op.label}</span>
                  </button>
                )
              })}
            </div>
          </div>

          {/* Phone input with flag + dial code */}
          <div>
            <label htmlFor="momoPhone" className="block text-sm font-medium text-gray-700 mb-1">
              Numéro Mobile Money
            </label>
            <div className={`flex items-stretch rounded-lg border overflow-hidden transition ${localPhone && !phoneValid ? 'border-red-300 ring-1 ring-red-200' : 'border-gray-300 focus-within:ring-2 focus-within:ring-primary-500'}`}>
              <span className="flex items-center gap-1.5 px-3 bg-gray-50 border-r border-gray-200 text-gray-700 font-medium select-none">
                <span className="text-lg leading-none">🇨🇩</span>
                <span className="text-sm">+243</span>
              </span>
              <input
                id="momoPhone"
                type="tel"
                inputMode="numeric"
                autoComplete="tel"
                value={localPhone}
                onChange={(e) => onPhoneChange(e.target.value)}
                placeholder="097 000 0000"
                className="flex-1 px-3 py-2.5 outline-none text-gray-900"
              />
            </div>
            <p className="text-xs text-gray-500 mt-1.5">
              Commencez votre numéro par <strong>097</strong> ou <strong>97</strong> — le <strong>+243</strong> est ajouté automatiquement.
            </p>
            {phoneValid && (
              <p className="text-xs text-green-600 mt-0.5">✓ Numéro complet : {fullPhone}</p>
            )}
          </div>

          {/* Pay button */}
          <button
            onClick={payDirect}
            disabled={payingOnline || quantity < 1 || !provider || !phoneValid}
            className="btn-primary w-full flex items-center justify-center gap-2 py-3 text-base"
          >
            {payingOnline ? (
              <>
                <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.4 0 0 5.4 0 12h4z" />
                </svg>
                Paiement en cours…
              </>
            ) : (
              <>
                <DevicePhoneMobileIcon className="h-5 w-5" />
                Payer {formatMoney(finalTotal)}
              </>
            )}
          </button>

          {ussdMsg && (
            <div className="rounded-lg bg-amber-50 border border-amber-200 p-3 text-center text-sm text-amber-800">
              {ussdMsg}
            </div>
          )}

          <p className="flex items-center justify-center gap-1.5 text-[11px] text-gray-400">
            <ShieldCheckIcon className="h-4 w-4" />
            Paiement sécurisé — vous validez avec votre code PIN sur votre téléphone.
          </p>

          {/* My orders */}
          {orders.length > 0 && (
            <div className="pt-4 border-t">
              <p className="text-sm font-medium text-gray-700 mb-2">Mes commandes</p>
              <div className="space-y-2 max-h-44 overflow-y-auto">
                {orders.map((order) => (
                  <div key={order.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg text-sm">
                    <div>
                      <p className="font-medium text-gray-900">{order.quantity} invitation(s) — {formatMoney(order.totalAmount)}</p>
                      <p className="text-gray-500 text-xs">
                        {format(new Date(order.createdAt), 'd MMM yyyy', { locale: fr })}
                      </p>
                    </div>
                    {getStatusBadge(order.status)}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
