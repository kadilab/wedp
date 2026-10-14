import { useEffect, useRef, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { useQueryClient } from 'react-query'
import { invitationOrderAPI } from '../../services/api'
import { CheckCircleIcon, XCircleIcon, ClockIcon, ArrowLeftIcon } from '@heroicons/react/24/outline'

// Landing page after the K-PAY hosted card page (returnUrl / cancelUrl).
// KPay appends ?status&reference&externalId&ts&sig. The query string is only
// used to pick a message: the backend asks K-PAY for the real status, which is
// what approves the order (the webhook is the other path).
const MAX_ATTEMPTS = 10
const RETRY_DELAY_MS = 3000

export default function PaymentReturn() {
  const [params] = useSearchParams()
  const queryClient = useQueryClient()
  const [state, setState] = useState('checking') // checking | success | pending | failed | cancelled
  const [info, setInfo] = useState({})
  const cancelledRef = useRef(false)

  useEffect(() => {
    cancelledRef.current = false
    const query = Object.fromEntries(params.entries())
    let attempts = 0

    const check = async () => {
      attempts++
      try {
        const { data } = await invitationOrderAPI.kpayReturn(query)
        if (cancelledRef.current) return
        setInfo(data)
        if (data.orderStatus === 'APPROVED' || data.paymentStatus === 'COMPLETED') {
          setState('success')
          if (data.weddingId) {
            queryClient.invalidateQueries(['quota', data.weddingId])
            queryClient.invalidateQueries(['invitation-orders', data.weddingId])
          }
          return
        }
        if (data.cancelled) return setState('cancelled')
        if (data.paymentStatus === 'FAILED') return setState('failed')
      } catch { /* retry below */ }
      if (attempts >= MAX_ATTEMPTS) return setState('pending')
      setTimeout(check, RETRY_DELAY_MS)
    }
    check()
    return () => { cancelledRef.current = true }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const backTo = info.weddingId ? `/weddings/${info.weddingId}/invitations` : '/dashboard'

  const views = {
    checking: {
      icon: <span className="h-12 w-12 rounded-full border-4 border-primary-200 border-t-primary-600 animate-spin" />,
      tint: 'bg-primary-50',
      title: 'Vérification du paiement…',
      text: 'Merci de patienter quelques secondes, nous confirmons votre paiement.'
    },
    success: {
      icon: <CheckCircleIcon className="h-12 w-12 text-green-600" />,
      tint: 'bg-green-100',
      title: 'Paiement réussi 🎉',
      text: info.quantity
        ? `${info.quantity} invitation${info.quantity > 1 ? 's ont été ajoutées' : ' a été ajoutée'} à votre quota.`
        : 'Vos invitations ont été débloquées.'
    },
    pending: {
      icon: <ClockIcon className="h-12 w-12 text-amber-600" />,
      tint: 'bg-amber-100',
      title: 'Paiement en cours de confirmation',
      text: 'Nous n\'avons pas encore reçu la confirmation de votre banque. Vos invitations seront débloquées automatiquement dès réception.'
    },
    failed: {
      icon: <XCircleIcon className="h-12 w-12 text-red-600" />,
      tint: 'bg-red-100',
      title: 'Le paiement n\'a pas abouti',
      text: info.failureReason || 'Votre carte n\'a pas été débitée. Vous pouvez réessayer ou choisir un autre moyen de paiement.'
    },
    cancelled: {
      icon: <XCircleIcon className="h-12 w-12 text-gray-500" />,
      tint: 'bg-gray-100',
      title: 'Paiement annulé',
      text: 'Aucun montant n\'a été débité. Vous pouvez reprendre votre achat quand vous le souhaitez.'
    }
  }
  const v = views[state]

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50 via-white to-gold-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-8 text-center">
        <div className={`mx-auto flex h-20 w-20 items-center justify-center rounded-full ${v.tint}`}>{v.icon}</div>
        <h1 className="mt-5 text-xl font-serif font-bold text-gray-900">{v.title}</h1>
        <p className="mt-2 text-sm text-gray-600">{v.text}</p>
        {state !== 'checking' && (
          <Link to={backTo} className="btn-primary mt-6 inline-flex items-center justify-center gap-2 w-full py-3">
            <ArrowLeftIcon className="h-4 w-4" />
            {info.weddingId ? 'Retour à mes invitations' : 'Retour au tableau de bord'}
          </Link>
        )}
      </div>
    </div>
  )
}
