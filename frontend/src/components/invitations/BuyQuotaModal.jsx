import { useState, useMemo, useEffect, useRef, useCallback } from 'react'
import { useQuery, useMutation, useQueryClient } from 'react-query'
import { invitationOrderAPI, couponAPI } from '../../services/api'
import { formatMoney, formatUsd } from '../../utils/currency'
import { OPERATORS, buildFullPhone, detectOperator } from '../../utils/momo'
import toast from 'react-hot-toast'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'
import {
  XMarkIcon,
  CheckCircleIcon,
  ClockIcon,
  XCircleIcon,
  ShieldCheckIcon,
  DevicePhoneMobileIcon,
  CreditCardIcon,
  ExclamationTriangleIcon,
  ArrowPathIcon,
  MinusIcon,
  PlusIcon,
  BeakerIcon,
  InformationCircleIcon,
  BanknotesIcon,
  ClipboardDocumentIcon,
  PaperClipIcon
} from '@heroicons/react/24/outline'

const QUICK_QUANTITIES = [25, 50, 100, 200]
// Availability older than this is re-checked right before sending the payment.
const AVAILABILITY_MAX_AGE_MS = 2 * 60 * 1000
// Status polling: starts at 3 s, slows down progressively, gives up after ~3 min
// (the webhook keeps confirming the order server-side after that).
const POLL_FIRST_DELAY_MS = 3000
const POLL_MAX_DELAY_MS = 8000
const POLL_TIMEOUT_MS = 3 * 60 * 1000

function getStatusBadge(status, order) {
  if (status === 'PENDING' && order?.submittedAt) {
    return <span className="badge-warning flex items-center"><ClockIcon className="h-4 w-4 mr-1" />En vérification</span>
  }
  switch (status) {
    case 'APPROVED':
      return <span className="badge-success flex items-center"><CheckCircleIcon className="h-4 w-4 mr-1" />Payée</span>
    case 'PENDING':
      return <span className="badge flex items-center"><ClockIcon className="h-4 w-4 mr-1" />Non payée</span>
    case 'REJECTED':
      return <span className="badge-danger flex items-center"><XCircleIcon className="h-4 w-4 mr-1" />Annulée</span>
    default:
      return <span className="badge">{status}</span>
  }
}

function Spinner({ className = 'h-5 w-5' }) {
  return (
    <svg className={`animate-spin ${className}`} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.4 0 0 5.4 0 12h4z" />
    </svg>
  )
}

const formatElapsed = (ms) => {
  const s = Math.floor(ms / 1000)
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`
}

export default function BuyQuotaModal({ weddingId, isOpen, onClose }) {
  const queryClient = useQueryClient()
  const [quantity, setQuantity] = useState(50)
  const [couponCode, setCouponCode] = useState('')
  const [appliedCoupon, setAppliedCoupon] = useState(null) // { code, discount, finalAmount }
  const [couponError, setCouponError] = useState('')
  const [showCoupon, setShowCoupon] = useState(false)
  // 'MOMO'   → Mobile Money via K-PAY (charged in FC, operator currency)
  // 'CARD'   → Visa/Mastercard via K-PAY (charged in USD, hosted page)
  // 'MANUAL' → transfer to a number configured by the admin, then the client
  //            submits the transaction reference for validation
  const [method, setMethod] = useState('MOMO')
  const [manualIdx, setManualIdx] = useState(0)
  const [manualRef, setManualRef] = useState('')
  const [manualPhone, setManualPhone] = useState('')
  const [proofFile, setProofFile] = useState(null)
  const [provider, setProvider] = useState('')
  const [localPhone, setLocalPhone] = useState('')
  const [providerError, setProviderError] = useState('')
  // 'form' | 'submitting' | 'waiting' | 'success' | 'failed' | 'timeout' | 'redirecting' | 'submitted'
  const [phase, setPhase] = useState('form')
  const [payStatus, setPayStatus] = useState('PENDING')
  const [failureReason, setFailureReason] = useState('')
  const [waitStartedAt, setWaitStartedAt] = useState(0)
  const [now, setNow] = useState(Date.now())

  // Reuse the same PENDING order across retries (other operator, card…) so we
  // don't litter the order history with abandoned orders.
  const pendingOrderRef = useRef(null) // { id, quantity, coupon }
  const pollRef = useRef({ timer: null, cancelled: false })

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
  // Availability is checked BEFORE the payment form is usable.
  const {
    data: availabilityData,
    isLoading: availabilityLoading,
    isFetching: availabilityFetching,
    refetch: refetchAvailability,
    dataUpdatedAt: availabilityUpdatedAt
  } = useQuery(
    'payment-availability',
    () => invitationOrderAPI.paymentAvailability(),
    { enabled: isOpen, staleTime: 60 * 1000, retry: 0, refetchOnWindowFocus: false }
  )

  const pricing = pricingData?.data || { unitPrice: 0, usdRate: 0, cardMinUsd: 1 }
  const orders = ordersData?.data?.orders || []
  const availability = availabilityData?.data
  const isTestMode = availability?.environment === 'TEST'

  const operators = useMemo(() => {
    const byCode = Object.fromEntries((availability?.mobileMoney || []).map(m => [m.provider, m]))
    return OPERATORS.map(op => ({
      ...op,
      label: byCode[op.code]?.label || op.label,
      status: byCode[op.code]?.status || 'UNKNOWN'
    }))
  }, [availability])
  const kpayConfigured = availability ? availability.configured !== false : true
  const anyMomo = kpayConfigured && (availability ? availability.anyMobileMoneyAvailable !== false : true)
  const cardAvailable = kpayConfigured && availability?.card?.status === 'AVAILABLE'
  const manualMethods = (pricing.paymentMethods || []).filter(m => m?.provider && m?.number)
  const manualAvailable = manualMethods.length > 0
  const selectedManual = manualMethods[Math.min(manualIdx, manualMethods.length - 1)]
  const availabilityUnknown = operators.every(op => op.status === 'UNKNOWN')
  const selectedOp = operators.find(op => op.code === provider)
  const providerUsable = selectedOp && selectedOp.status !== 'UNAVAILABLE'

  const total = Math.round(quantity * pricing.unitPrice * 100) / 100
  const finalTotal = appliedCoupon ? appliedCoupon.finalAmount : total
  // Card amount preview (the server recomputes it at payment time).
  const usdRate = Number(pricing.usdRate) || 0
  const usdTotal = usdRate > 0
    ? Math.max(Math.round((finalTotal / usdRate) * 100) / 100, pricing.cardMinUsd || 1)
    : null

  const fullPhone = useMemo(() => buildFullPhone(localPhone), [localPhone])
  const phoneValid = /^243\d{9}$/.test(fullPhone)

  // No Mobile Money at all → steer towards the next method that works.
  useEffect(() => {
    if (!availability || method !== 'MOMO' || anyMomo) return
    if (cardAvailable) setMethod('CARD')
    else if (manualAvailable) setMethod('MANUAL')
  }, [availability, anyMomo, cardAvailable, manualAvailable, method])

  // An operator that just became unavailable can't stay selected.
  useEffect(() => {
    if (selectedOp && selectedOp.status === 'UNAVAILABLE') setProvider('')
  }, [selectedOp])

  // Elapsed-time ticker on the "validate on your phone" screen.
  useEffect(() => {
    if (phase !== 'waiting') return
    const t = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(t)
  }, [phase])

  const stopPolling = useCallback(() => {
    pollRef.current.cancelled = true
    clearTimeout(pollRef.current.timer)
  }, [])
  useEffect(() => stopPolling, [stopPolling])

  const resetCoupon = () => {
    setAppliedCoupon(null)
    setCouponCode('')
    setCouponError('')
  }

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

  const changeQuantity = (q) => {
    setQuantity(Math.max(1, Math.min(10000, parseInt(q, 10) || 1)))
    if (appliedCoupon) resetCoupon()
  }

  const onPhoneChange = (value) => {
    setLocalPhone(value)
    const guessed = detectOperator(value)
    // Suggestion only — never switch to an operator that doesn't work.
    const guessedOp = operators.find(op => op.code === guessed)
    if (guessedOp && guessedOp.status !== 'UNAVAILABLE' && guessed !== provider) setProvider(guessed)
  }

  const close = () => {
    if (phase === 'submitting' || phase === 'redirecting') return
    stopPolling()
    resetCoupon()
    setShowCoupon(false)
    setLocalPhone('')
    setProvider('')
    setProviderError('')
    setPhase('form')
    setFailureReason('')
    setManualRef('')
    setManualPhone('')
    setProofFile(null)
    pendingOrderRef.current = null
    onClose()
  }

  // Escape closes the modal (except while a request is in flight).
  useEffect(() => {
    if (!isOpen) return
    const onKey = (e) => { if (e.key === 'Escape') close() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  })

  const ensureOrder = async () => {
    const coupon = appliedCoupon?.code || null
    const existing = pendingOrderRef.current
    if (existing && existing.quantity === quantity && existing.coupon === coupon) return existing.id
    const orderRes = await invitationOrderAPI.createOrder(weddingId, quantity, coupon || undefined)
    pendingOrderRef.current = { id: orderRes.data.order.id, quantity, coupon }
    return pendingOrderRef.current.id
  }

  const finishSuccess = () => {
    stopPolling()
    setPhase('success')
    pendingOrderRef.current = null
    queryClient.invalidateQueries(['quota', weddingId])
    queryClient.invalidateQueries(['invitation-orders', weddingId])
  }

  const startPolling = (orderId) => {
    stopPolling()
    pollRef.current = { timer: null, cancelled: false }
    const startedAt = Date.now()
    let delay = POLL_FIRST_DELAY_MS

    const tick = async () => {
      if (pollRef.current.cancelled) return
      try {
        const { data } = await invitationOrderAPI.kpayStatus(weddingId, orderId)
        if (pollRef.current.cancelled) return
        if (data.orderStatus === 'APPROVED' || data.paymentStatus === 'COMPLETED') return finishSuccess()
        if (data.paymentStatus === 'FAILED' || data.paymentStatus === 'CANCELLED') {
          setFailureReason(data.failureReason || (data.paymentStatus === 'CANCELLED'
            ? 'Le paiement a été annulé.'
            : 'Le paiement n\'a pas abouti.'))
          setPhase('failed')
          return
        }
        if (data.paymentStatus) setPayStatus(data.paymentStatus)
      } catch { /* transient — keep polling */ }
      if (Date.now() - startedAt > POLL_TIMEOUT_MS) {
        setPhase('timeout')
        queryClient.invalidateQueries(['invitation-orders', weddingId])
        return
      }
      delay = Math.min(POLL_MAX_DELAY_MS, Math.round(delay * 1.25))
      pollRef.current.timer = setTimeout(tick, delay)
    }
    pollRef.current.timer = setTimeout(tick, delay)
  }

  // Re-check availability if the modal has been open for a while.
  const freshAvailability = async () => {
    if (Date.now() - availabilityUpdatedAt < AVAILABILITY_MAX_AGE_MS) return availability
    const res = await refetchAvailability()
    return res.data?.data || availability
  }

  const payMobileMoney = async () => {
    if (!provider || !providerUsable) return setProviderError('Choisissez un opérateur disponible.')
    if (!phoneValid) return toast.error('Numéro invalide. Saisissez votre numéro local (ex : 0812345678)')
    setPhase('submitting')
    setProviderError('')
    try {
      const latest = await freshAvailability()
      const op = latest?.mobileMoney?.find(m => m.provider === provider)
      if (op?.status === 'UNAVAILABLE') {
        setPhase('form')
        setProvider('')
        setProviderError(`${op.label} est temporairement indisponible. Choisissez un autre moyen de paiement.`)
        return
      }

      const orderId = await ensureOrder()
      await invitationOrderAPI.payKpay(weddingId, orderId, { method: 'MOBILE_MONEY', provider, phoneNumber: fullPhone })
      setPayStatus('PENDING')
      setWaitStartedAt(Date.now())
      setNow(Date.now())
      setPhase('waiting')
      startPolling(orderId)
    } catch (err) {
      const data = err.response?.data
      setPhase('form')
      if (data?.code === 'PROVIDER_UNAVAILABLE') {
        // Operator not usable: back to operator choice, keep everything typed.
        setProvider('')
        setProviderError(data.error)
        refetchAvailability()
        return
      }
      toast.error(data?.error || 'Erreur lors du paiement Mobile Money')
    }
  }

  const payCard = async () => {
    setPhase('submitting')
    try {
      const orderId = await ensureOrder()
      const { data } = await invitationOrderAPI.payKpay(weddingId, orderId, { method: 'CARD' })
      if (!data.gatewayUrl) throw new Error('no gateway url')
      setPhase('redirecting')
      window.location.assign(data.gatewayUrl)
    } catch (err) {
      setPhase('form')
      toast.error(err.response?.data?.error || 'Impossible d\'ouvrir la page de paiement par carte')
    }
  }

  const payManual = async () => {
    if (!selectedManual) return
    if (!manualRef.trim()) return toast.error('Indiquez la référence de la transaction')
    setPhase('submitting')
    try {
      const orderId = await ensureOrder()
      if (proofFile) {
        await invitationOrderAPI.uploadProof(weddingId, orderId, proofFile).catch(() => {
          toast.error('La capture n\'a pas pu être envoyée — la référence suffit.')
        })
      }
      await invitationOrderAPI.submitTransaction(weddingId, orderId, {
        transactionId: manualRef.trim(),
        paymentProvider: selectedManual.provider,
        payerPhone: manualPhone.trim() || undefined
      })
      pendingOrderRef.current = null
      setPhase('submitted')
      queryClient.invalidateQueries(['invitation-orders', weddingId])
      queryClient.invalidateQueries('my-invitation-orders')
    } catch (err) {
      setPhase('form')
      toast.error(err.response?.data?.error || 'Impossible d\'envoyer la référence de paiement')
    }
  }

  const copyNumber = async (value) => {
    try {
      await navigator.clipboard.writeText(value)
      toast.success('Numéro copié')
    } catch { /* clipboard unavailable — the number is visible anyway */ }
  }

  const backToForm = () => {
    stopPolling()
    setPhase('form')
    setFailureReason('')
  }

  if (!isOpen) return null

  const busy = phase === 'submitting' || phase === 'redirecting'
  const elapsed = waitStartedAt ? now - waitStartedAt : 0

  return (
    <div
      className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center z-50 sm:p-4"
      onMouseDown={(e) => { if (e.target === e.currentTarget) close() }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="buy-quota-title"
    >
      <div className="bg-white w-full sm:max-w-lg rounded-t-3xl sm:rounded-2xl shadow-2xl max-h-[94vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="relative bg-gradient-to-br from-primary-700 via-primary-600 to-primary-500 px-6 pt-5 pb-6 text-white shrink-0">
          <button
            onClick={close}
            disabled={busy}
            className="absolute top-4 right-4 p-1.5 rounded-full text-white/80 hover:text-white hover:bg-white/10 disabled:opacity-40"
            aria-label="Fermer"
          >
            <XMarkIcon className="h-6 w-6" />
          </button>
          <div className="flex items-center gap-2">
            <h3 id="buy-quota-title" className="text-xl font-serif font-bold">Acheter des invitations</h3>
            {isTestMode && (
              <span className="inline-flex items-center gap-1 rounded-full bg-amber-400 text-amber-950 text-[11px] font-bold uppercase tracking-wide px-2 py-0.5">
                <BeakerIcon className="h-3.5 w-3.5" /> Test
              </span>
            )}
          </div>
          <div className="mt-3 flex items-end justify-between gap-3">
            <div>
              <p className="text-primary-100 text-xs uppercase tracking-wide">Total à payer</p>
              <p className="text-3xl font-bold leading-tight">
                {method === 'CARD' && usdTotal != null ? formatUsd(usdTotal) : formatMoney(finalTotal)}
              </p>
              <p className="text-primary-100 text-xs mt-0.5">
                {method === 'CARD'
                  ? <>soit {formatMoney(finalTotal)}</>
                  : usdTotal != null && <>≈ {formatUsd(finalTotal / usdRate)}</>}
                {appliedCoupon && <> · coupon {appliedCoupon.code} appliqué</>}
              </p>
            </div>
            <p className="text-right text-primary-100 text-xs">
              {quantity} invitation{quantity > 1 ? 's' : ''}<br />
              {formatMoney(pricing.unitPrice)} / invitation
            </p>
          </div>
        </div>

        <div className="overflow-y-auto">
          {isTestMode && phase === 'form' && (
            <div className="mx-6 mt-4 rounded-lg bg-amber-50 border border-amber-200 px-3 py-2 text-xs text-amber-800">
              Mode test : aucun argent réel ne sera débité.
            </div>
          )}

          {/* ---------- Waiting for USSD validation ---------- */}
          {phase === 'waiting' && (
            <div className="p-8 text-center">
              <div className="relative mx-auto h-24 w-24">
                <span className="absolute inset-0 rounded-full bg-primary-200 animate-ping opacity-60" />
                <span className="relative flex h-24 w-24 items-center justify-center rounded-full bg-primary-100 text-primary-700">
                  <DevicePhoneMobileIcon className="h-12 w-12" />
                </span>
              </div>
              <h4 className="mt-6 text-lg font-semibold text-gray-900">Validez le paiement sur votre téléphone</h4>
              <p className="mt-2 text-sm text-gray-600">
                Une demande de <strong>{formatMoney(finalTotal)}</strong> a été envoyée au <strong>+{fullPhone}</strong> ({selectedOp?.label}).
                Saisissez votre <strong>code PIN Mobile Money</strong> pour confirmer.
              </p>
              <div className="mt-5 inline-flex items-center gap-2 rounded-full bg-gray-100 px-4 py-1.5 text-sm text-gray-700">
                <Spinner className="h-4 w-4 text-primary-600" />
                {payStatus === 'PROCESSING' ? 'Traitement en cours…' : 'En attente de votre validation…'}
                <span className="font-mono text-gray-500">{formatElapsed(elapsed)}</span>
              </div>
              {selectedOp?.status === 'DELAYED' && (
                <p className="mt-3 text-xs text-amber-700">Service lent en ce moment, la confirmation peut prendre quelques minutes.</p>
              )}
              <p className="mt-6 text-xs text-gray-400">Pas reçu de demande ? Vérifiez que votre téléphone est allumé et que le solde est suffisant.</p>
              <button onClick={backToForm} className="mt-3 text-sm text-gray-500 underline hover:text-gray-800">
                Modifier le numéro ou l'opérateur
              </button>
            </div>
          )}

          {/* ---------- Success ---------- */}
          {phase === 'success' && (
            <div className="p-8 text-center">
              <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-green-100">
                <CheckCircleIcon className="h-12 w-12 text-green-600" />
              </div>
              <h4 className="mt-5 text-lg font-semibold text-gray-900">Paiement réussi 🎉</h4>
              <p className="mt-2 text-sm text-gray-600">
                {quantity} invitation{quantity > 1 ? 's ont été ajoutées' : ' a été ajoutée'} à votre quota. Un reçu vous a été envoyé par email.
              </p>
              <button onClick={close} className="btn-primary mt-6 w-full py-3">Continuer</button>
            </div>
          )}

          {/* ---------- Manual payment submitted ---------- */}
          {phase === 'submitted' && (
            <div className="p-8 text-center">
              <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-primary-50">
                <ClockIcon className="h-12 w-12 text-primary-600" />
              </div>
              <h4 className="mt-5 text-lg font-semibold text-gray-900">Paiement envoyé pour vérification</h4>
              <p className="mt-2 text-sm text-gray-600">
                Nous vérifions votre transfert (réf. <strong className="font-mono">{manualRef}</strong>).
                Vos {quantity} invitation{quantity > 1 ? 's seront débloquées' : ' sera débloquée'} dès validation —
                vous recevrez une notification.
              </p>
              <button onClick={close} className="btn-primary mt-6 w-full py-3">Compris</button>
            </div>
          )}

          {/* ---------- Failed / timeout ---------- */}
          {(phase === 'failed' || phase === 'timeout') && (
            <div className="p-8 text-center">
              <div className={`mx-auto flex h-20 w-20 items-center justify-center rounded-full ${phase === 'failed' ? 'bg-red-100' : 'bg-amber-100'}`}>
                {phase === 'failed'
                  ? <XCircleIcon className="h-12 w-12 text-red-600" />
                  : <ClockIcon className="h-12 w-12 text-amber-600" />}
              </div>
              <h4 className="mt-5 text-lg font-semibold text-gray-900">
                {phase === 'failed' ? 'Le paiement n\'a pas abouti' : 'Toujours en attente…'}
              </h4>
              <p className="mt-2 text-sm text-gray-600">
                {phase === 'failed'
                  ? failureReason
                  : 'Nous n\'avons pas encore reçu la confirmation. Si vous avez validé sur votre téléphone, vos invitations seront débloquées automatiquement dès réception — vous pouvez fermer cette fenêtre.'}
              </p>
              <div className="mt-6 flex gap-3">
                <button onClick={close} className="btn-secondary flex-1">Fermer</button>
                <button onClick={backToForm} className="btn-primary flex-1 flex items-center justify-center gap-2">
                  <ArrowPathIcon className="h-4 w-4" /> Réessayer
                </button>
              </div>
            </div>
          )}

          {/* ---------- Form ---------- */}
          {(phase === 'form' || busy) && (
            <div className="p-6 space-y-6">
              {/* Quantity */}
              <section>
                <label htmlFor="buyQty" className="block text-sm font-semibold text-gray-800 mb-2">
                  Combien d'invitations ?
                </label>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => changeQuantity(quantity - 1)}
                    disabled={busy || quantity <= 1}
                    className="h-11 w-11 shrink-0 rounded-xl border border-gray-200 flex items-center justify-center text-gray-600 hover:bg-gray-50 disabled:opacity-40"
                    aria-label="Moins"
                  >
                    <MinusIcon className="h-5 w-5" />
                  </button>
                  <input
                    id="buyQty"
                    type="number"
                    min="1"
                    inputMode="numeric"
                    disabled={busy}
                    className="input h-11 text-center text-lg font-semibold"
                    value={quantity}
                    onChange={(e) => changeQuantity(e.target.value)}
                  />
                  <button
                    type="button"
                    onClick={() => changeQuantity(quantity + 1)}
                    disabled={busy}
                    className="h-11 w-11 shrink-0 rounded-xl border border-gray-200 flex items-center justify-center text-gray-600 hover:bg-gray-50 disabled:opacity-40"
                    aria-label="Plus"
                  >
                    <PlusIcon className="h-5 w-5" />
                  </button>
                </div>
                <div className="mt-2 flex flex-wrap gap-2">
                  {QUICK_QUANTITIES.map((q) => (
                    <button
                      key={q}
                      type="button"
                      disabled={busy}
                      onClick={() => changeQuantity(q)}
                      className={`px-3 py-1 rounded-full text-xs font-medium border transition ${quantity === q ? 'border-primary-500 bg-primary-50 text-primary-700' : 'border-gray-200 text-gray-600 hover:border-primary-300'}`}
                    >
                      {q}
                    </button>
                  ))}
                </div>

                {/* Coupon (collapsed by default) */}
                <div className="mt-3">
                  {appliedCoupon ? (
                    <div className="flex items-center justify-between p-2.5 bg-green-50 border border-green-200 rounded-lg">
                      <span className="text-sm text-green-700">
                        Coupon <strong>{appliedCoupon.code}</strong> — −{formatMoney(appliedCoupon.discount)}
                      </span>
                      <button onClick={resetCoupon} disabled={busy} className="text-xs text-green-700 underline hover:text-green-900">
                        Retirer
                      </button>
                    </div>
                  ) : !showCoupon ? (
                    <button type="button" onClick={() => setShowCoupon(true)} className="text-sm text-primary-700 hover:text-primary-900 underline">
                      J'ai un code promo
                    </button>
                  ) : (
                    <>
                      <div className="flex gap-2">
                        <input
                          id="couponCode"
                          type="text"
                          autoFocus
                          className="input flex-1 font-mono uppercase"
                          placeholder="Ex : WEDX1Y2Z3"
                          aria-label="Code promo"
                          value={couponCode}
                          onChange={(e) => { setCouponCode(e.target.value.toUpperCase()); setCouponError('') }}
                        />
                        <button
                          type="button"
                          onClick={() => validateCouponMutation.mutate()}
                          disabled={!couponCode.trim() || validateCouponMutation.isLoading}
                          className="btn-secondary whitespace-nowrap"
                        >
                          {validateCouponMutation.isLoading ? '…' : 'Appliquer'}
                        </button>
                      </div>
                      {couponError && <p className="text-xs text-red-600 mt-1">{couponError}</p>}
                    </>
                  )}
                </div>
              </section>

              {/* Payment — only usable once availability has been checked */}
              <section>
                <p className="text-sm font-semibold text-gray-800 mb-2">Moyen de paiement</p>

                {availabilityLoading ? (
                  <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-gray-200 py-10 text-sm text-gray-500">
                    <Spinner className="h-6 w-6 text-primary-600" />
                    Vérification des moyens de paiement…
                  </div>
                ) : (
                  <>
                    {/* No Mobile Money at all → banner first */}
                    {!anyMomo && kpayConfigured && (
                      <div className="mb-4 rounded-xl border border-red-200 bg-red-50 p-4">
                        <div className="flex gap-3">
                          <ExclamationTriangleIcon className="h-5 w-5 text-red-600 shrink-0 mt-0.5" />
                          <div className="text-sm text-red-800">
                            <p className="font-semibold">Le paiement Mobile Money est momentanément indisponible.</p>
                            <p className="mt-0.5">
                              {cardAvailable
                                ? 'Vous pouvez payer par carte Visa/Mastercard ou réessayer plus tard.'
                                : manualAvailable
                                  ? 'Vous pouvez payer par transfert manuel ou réessayer plus tard.'
                                  : 'Merci de réessayer un peu plus tard.'}
                            </p>
                          </div>
                        </div>
                        <div className="mt-3 flex gap-2">
                          {cardAvailable && (
                            <button type="button" onClick={() => setMethod('CARD')} className="btn-primary flex-1 flex items-center justify-center gap-2 text-sm">
                              <CreditCardIcon className="h-4 w-4" /> Payer par carte
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => refetchAvailability()}
                            disabled={availabilityFetching}
                            className="btn-secondary flex-1 flex items-center justify-center gap-2 text-sm"
                          >
                            <ArrowPathIcon className={`h-4 w-4 ${availabilityFetching ? 'animate-spin' : ''}`} /> Réessayer
                          </button>
                        </div>
                      </div>
                    )}

                    {/* Payment method — the currency follows the method */}
                    <div className={`grid gap-2 ${manualAvailable ? 'grid-cols-3' : 'grid-cols-2'}`} role="radiogroup" aria-label="Moyen de paiement">
                      {[
                        { key: 'MOMO', icon: DevicePhoneMobileIcon, title: 'Mobile Money', sub: anyMomo ? `En FC · ${formatMoney(finalTotal)}` : 'Indisponible', enabled: anyMomo },
                        { key: 'CARD', icon: CreditCardIcon, title: 'Carte', sub: cardAvailable ? `En USD${usdTotal != null ? ` · ${formatUsd(usdTotal)}` : ''}` : 'Bientôt disponible', enabled: cardAvailable },
                        ...(manualAvailable ? [{ key: 'MANUAL', icon: BanknotesIcon, title: 'Transfert', sub: 'Manuel, vérifié', enabled: true }] : [])
                      ].map((m) => (
                        <button
                          key={m.key}
                          type="button"
                          role="radio"
                          aria-checked={method === m.key}
                          disabled={busy || !m.enabled}
                          onClick={() => setMethod(m.key)}
                          className={`rounded-xl border-2 p-2.5 sm:p-3 text-left transition disabled:opacity-50 disabled:cursor-not-allowed ${method === m.key ? 'border-primary-500 bg-primary-50' : 'border-gray-200 hover:border-primary-300'}`}
                        >
                          <m.icon className="h-5 w-5 text-primary-600" />
                          <span className="mt-1 block text-sm font-semibold text-gray-900">{m.title}</span>
                          <span className="block text-[11px] leading-tight text-gray-500 mt-0.5">{m.sub}</span>
                        </button>
                      ))}
                    </div>

                    {availabilityUnknown && anyMomo && (
                      <p className="mt-2 flex items-center gap-1.5 text-xs text-gray-400">
                        <InformationCircleIcon className="h-4 w-4" />
                        Nous n'avons pas pu vérifier la disponibilité des opérateurs.
                      </p>
                    )}

                    {/* ---- Mobile Money (FC) ---- */}
                    {method === 'MOMO' && anyMomo && (
                      <div className="mt-4 space-y-4">
                        <div>
                          <p className="text-sm font-medium text-gray-700 mb-2">Choisissez votre opérateur</p>
                          <div className="grid grid-cols-3 gap-2">
                            {operators.map((op) => {
                              const active = provider === op.code
                              const unavailable = op.status === 'UNAVAILABLE'
                              return (
                                <button
                                  key={op.code}
                                  type="button"
                                  disabled={unavailable || busy}
                                  aria-pressed={active}
                                  onClick={() => { setProvider(op.code); setProviderError('') }}
                                  title={unavailable ? `${op.label} est temporairement indisponible` : op.label}
                                  className={`relative flex flex-col items-center gap-1.5 px-2 py-3 rounded-xl border-2 transition ${
                                    unavailable
                                      ? 'border-gray-100 bg-gray-50 cursor-not-allowed'
                                      : active
                                        ? 'border-primary-500 bg-primary-50 ring-2 ring-primary-200'
                                        : 'border-gray-200 bg-white hover:border-primary-300'
                                  }`}
                                >
                                  {op.status === 'DELAYED' && (
                                    <span className="absolute -top-2 right-1 rounded-full bg-amber-500 px-1.5 py-0.5 text-[10px] font-semibold text-white">Lent</span>
                                  )}
                                  <img src={op.logo} alt="" className={`h-9 w-9 object-contain ${unavailable ? 'grayscale opacity-40' : ''}`} />
                                  <span className={`text-[11px] font-medium leading-tight text-center ${unavailable ? 'text-gray-400' : active ? 'text-primary-700' : 'text-gray-600'}`}>
                                    {op.label}
                                  </span>
                                  {unavailable && <span className="text-[10px] text-gray-400">Indisponible</span>}
                                </button>
                              )
                            })}
                          </div>
                          {operators.filter(op => op.status === 'UNAVAILABLE').map(op => (
                            <p key={op.code} className="text-xs text-gray-500 mt-1.5">
                              {op.label} est temporairement indisponible. Choisissez un autre moyen de paiement.
                            </p>
                          ))}
                          {selectedOp?.status === 'DELAYED' && (
                            <p className="mt-2 rounded-lg bg-amber-50 border border-amber-200 px-3 py-2 text-xs text-amber-800">
                              Service lent en ce moment, la confirmation peut prendre quelques minutes.
                            </p>
                          )}
                          {providerError && <p className="text-xs text-red-600 mt-2">{providerError}</p>}
                        </div>

                        <div>
                          <label htmlFor="momoPhone" className="block text-sm font-medium text-gray-700 mb-1">
                            Numéro Mobile Money
                          </label>
                          <div className={`flex items-stretch rounded-lg border overflow-hidden transition ${
                            !providerUsable ? 'border-gray-200 bg-gray-50' :
                              localPhone && !phoneValid ? 'border-red-300 ring-1 ring-red-200' : 'border-gray-300 focus-within:ring-2 focus-within:ring-primary-500'
                          }`}>
                            <span className="flex items-center gap-1.5 px-3 bg-gray-50 border-r border-gray-200 text-gray-700 font-medium select-none">
                              <span className="text-lg leading-none">🇨🇩</span>
                              <span className="text-sm">+243</span>
                            </span>
                            <input
                              id="momoPhone"
                              type="tel"
                              inputMode="numeric"
                              autoComplete="tel"
                              disabled={!providerUsable || busy}
                              value={localPhone}
                              onChange={(e) => onPhoneChange(e.target.value)}
                              placeholder={providerUsable ? '081 234 5678' : 'Choisissez d\'abord un opérateur'}
                              className="flex-1 min-w-0 px-3 py-2.5 outline-none text-gray-900 bg-transparent disabled:cursor-not-allowed"
                            />
                          </div>
                          {providerUsable && (
                            <p className="text-xs text-gray-500 mt-1.5">
                              {phoneValid
                                ? <span className="text-green-600">✓ Numéro complet : +{fullPhone}</span>
                                : <>Votre numéro local (ex : 081…, 097…) — le +243 est ajouté automatiquement.</>}
                            </p>
                          )}
                        </div>

                        <button
                          onClick={payMobileMoney}
                          disabled={busy || quantity < 1 || !providerUsable || !phoneValid}
                          className="btn-primary w-full flex items-center justify-center gap-2 py-3 text-base"
                        >
                          {busy ? <><Spinner /> Envoi de la demande…</> : <><DevicePhoneMobileIcon className="h-5 w-5" /> Payer {formatMoney(finalTotal)}</>}
                        </button>
                      </div>
                    )}

                    {/* ---- Card (USD) ---- */}
                    {method === 'CARD' && cardAvailable && (
                      <div className="mt-4 space-y-3">
                        <div className="rounded-xl bg-gray-50 border border-gray-100 p-4 text-sm text-gray-600">
                          <p>
                            Vous allez être redirigé vers la page sécurisée K-PAY pour payer
                            <strong className="text-gray-900"> {usdTotal != null ? formatUsd(usdTotal) : 'en USD'}</strong> par carte.
                          </p>
                          <div className="mt-2 flex items-center gap-2 text-xs font-semibold text-gray-500">
                            <span className="rounded border border-gray-200 bg-white px-1.5 py-0.5 text-blue-800">VISA</span>
                            <span className="rounded border border-gray-200 bg-white px-1.5 py-0.5 text-orange-600">Mastercard</span>
                          </div>
                        </div>
                        <button
                          onClick={payCard}
                          disabled={busy || quantity < 1}
                          className="btn-primary w-full flex items-center justify-center gap-2 py-3 text-base"
                        >
                          {busy
                            ? <><Spinner /> {phase === 'redirecting' ? 'Redirection…' : 'Préparation…'}</>
                            : <><CreditCardIcon className="h-5 w-5" /> Payer {usdTotal != null ? formatUsd(usdTotal) : ''} par carte</>}
                        </button>
                      </div>
                    )}
                    {/* ---- Manual transfer ---- */}
                    {method === 'MANUAL' && selectedManual && (
                      <div className="mt-4 space-y-4">
                        {manualMethods.length > 1 && (
                          <div className="flex flex-wrap gap-2">
                            {manualMethods.map((m, i) => (
                              <button
                                key={`${m.provider}-${i}`}
                                type="button"
                                onClick={() => setManualIdx(i)}
                                className={`flex items-center gap-2 rounded-full border px-3 py-1.5 text-sm transition ${i === manualIdx ? 'border-primary-500 bg-primary-50 text-primary-700' : 'border-gray-200 text-gray-600 hover:border-primary-300'}`}
                              >
                                {m.logo && <img src={m.logo} alt="" className="h-5 w-5 object-contain" />}
                                {m.provider}
                              </button>
                            ))}
                          </div>
                        )}

                        <ol className="space-y-3 text-sm">
                          <li className="rounded-xl border border-gray-200 p-4">
                            <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">1. Envoyez le paiement</p>
                            <div className="mt-2 flex items-center gap-3">
                              {selectedManual.logo && <img src={selectedManual.logo} alt="" className="h-10 w-10 object-contain" />}
                              <div className="min-w-0 flex-1">
                                <p className="text-gray-600">Envoyez <strong className="text-gray-900">{formatMoney(finalTotal)}</strong> via {selectedManual.provider} au</p>
                                <p className="font-mono text-lg font-semibold text-gray-900 truncate">{selectedManual.number}</p>
                              </div>
                              <button
                                type="button"
                                onClick={() => copyNumber(selectedManual.number)}
                                className="shrink-0 rounded-lg border border-gray-200 p-2 text-gray-500 hover:bg-gray-50"
                                aria-label="Copier le numéro"
                                title="Copier le numéro"
                              >
                                <ClipboardDocumentIcon className="h-5 w-5" />
                              </button>
                            </div>
                            {selectedManual.instructions && (
                              <p className="mt-2 text-xs text-gray-500">{selectedManual.instructions}</p>
                            )}
                          </li>
                          <li className="rounded-xl border border-gray-200 p-4 space-y-3">
                            <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">2. Indiquez la référence reçue par SMS</p>
                            <input
                              type="text"
                              className="input font-mono"
                              placeholder="Ex : PP231015.1234.A12345"
                              aria-label="Référence de la transaction"
                              value={manualRef}
                              disabled={busy}
                              onChange={(e) => setManualRef(e.target.value)}
                            />
                            <input
                              type="tel"
                              inputMode="tel"
                              className="input"
                              placeholder="Numéro utilisé pour payer (facultatif)"
                              aria-label="Numéro utilisé pour payer"
                              value={manualPhone}
                              disabled={busy}
                              onChange={(e) => setManualPhone(e.target.value)}
                            />
                            <label className="flex items-center gap-2 text-xs text-gray-500 cursor-pointer hover:text-gray-700">
                              <PaperClipIcon className="h-4 w-4" />
                              {proofFile ? <span className="truncate">{proofFile.name}</span> : 'Joindre une capture du paiement (facultatif)'}
                              <input type="file" accept="image/*" className="hidden" disabled={busy} onChange={(e) => setProofFile(e.target.files?.[0] || null)} />
                            </label>
                          </li>
                        </ol>

                        <button
                          onClick={payManual}
                          disabled={busy || quantity < 1 || !manualRef.trim()}
                          className="btn-primary w-full flex items-center justify-center gap-2 py-3 text-base"
                        >
                          {busy ? <><Spinner /> Envoi…</> : <><CheckCircleIcon className="h-5 w-5" /> J'ai payé — envoyer la référence</>}
                        </button>
                        <p className="text-center text-xs text-gray-400">Validation manuelle, généralement sous quelques heures.</p>
                      </div>
                    )}

                    {!kpayConfigured && !manualAvailable && (
                      <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
                        Le paiement en ligne est momentanément indisponible. Merci de réessayer plus tard.
                      </div>
                    )}
                  </>
                )}

                <p className="mt-4 flex items-center justify-center gap-1.5 text-[11px] text-gray-400">
                  <ShieldCheckIcon className="h-4 w-4" />
                  {method === 'CARD'
                    ? 'Paiement sécurisé — vos données de carte ne transitent jamais par Winvite.'
                    : method === 'MANUAL'
                      ? 'Vos invitations sont débloquées dès que nous avons vérifié le transfert.'
                      : 'Paiement sécurisé — vous validez avec votre code PIN sur votre téléphone.'}
                </p>
              </section>

              {/* Order history */}
              {orders.length > 0 && (
                <section className="pt-4 border-t">
                  <p className="text-sm font-medium text-gray-700 mb-2">Mes commandes</p>
                  <div className="space-y-2 max-h-44 overflow-y-auto">
                    {orders.map((order) => (
                      <div key={order.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg text-sm">
                        <div>
                          <p className="font-medium text-gray-900">{order.quantity} invitation(s) — {formatMoney(order.totalAmount)}</p>
                          <p className="text-gray-500 text-xs">
                            {format(new Date(order.createdAt), 'd MMM yyyy, HH:mm', { locale: fr })}
                          </p>
                        </div>
                        {getStatusBadge(order.status, order)}
                      </div>
                    ))}
                  </div>
                </section>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
