import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { CheckCircleIcon, XCircleIcon } from '@heroicons/react/24/solid'
import { authAPI } from '../../services/api'
import { useAuthStore } from '../../stores/authStore'

export default function VerifyEmail() {
  const { token } = useParams()
  const { user, updateUser } = useAuthStore()
  const [status, setStatus] = useState('loading') // loading | success | error
  const [message, setMessage] = useState('')

  useEffect(() => {
    let active = true
    authAPI
      .verifyEmail(token)
      .then((res) => {
        if (!active) return
        setStatus('success')
        setMessage(res.data?.message || 'Adresse email confirmée avec succès.')
        // Keep the local user in sync if it's the same account.
        if (user && (!res.data?.email || res.data.email === user.email)) {
          updateUser?.({ emailVerified: true })
        }
      })
      .catch((err) => {
        if (!active) return
        setStatus('error')
        setMessage(err.response?.data?.error || 'Lien de confirmation invalide ou expiré.')
      })
    return () => { active = false }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token])

  return (
    <div className="text-center">
      {status === 'loading' && (
        <>
          <div className="mx-auto mb-6 h-12 w-12 animate-spin rounded-full border-4 border-primary-500 border-t-transparent" />
          <h1 className="font-serif text-2xl font-bold text-content">Confirmation en cours…</h1>
          <p className="mt-2 text-muted">Vérification de votre lien.</p>
        </>
      )}

      {status === 'success' && (
        <>
          <CheckCircleIcon className="mx-auto mb-4 h-16 w-16 text-green-500" />
          <h1 className="font-serif text-2xl font-bold text-content">Email confirmé !</h1>
          <p className="mt-2 text-muted">{message}</p>
          <Link
            to={user ? '/dashboard' : '/login'}
            className="mt-6 inline-flex items-center justify-center rounded-full bg-primary-500 px-6 py-3 font-semibold text-white transition-colors hover:bg-primary-600"
          >
            {user ? 'Aller au tableau de bord' : 'Se connecter'}
          </Link>
        </>
      )}

      {status === 'error' && (
        <>
          <XCircleIcon className="mx-auto mb-4 h-16 w-16 text-red-500" />
          <h1 className="font-serif text-2xl font-bold text-content">Confirmation impossible</h1>
          <p className="mt-2 text-muted">{message}</p>
          <p className="mt-4 text-sm text-muted">
            Connectez-vous et utilisez le bouton « Renvoyer l'email de confirmation » depuis votre tableau de bord.
          </p>
          <Link
            to="/login"
            className="mt-6 inline-flex items-center justify-center rounded-full border border-border px-6 py-3 font-semibold text-content transition-colors hover:bg-surface-2"
          >
            Se connecter
          </Link>
        </>
      )}
    </div>
  )
}
