import { useEffect, useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { collaboratorAPI } from '../../services/api'
import { XCircleIcon } from '@heroicons/react/24/outline'

export default function CollaboratorAccept() {
  const { token } = useParams()
  const navigate = useNavigate()
  const [state, setState] = useState('loading') // loading | error
  const [error, setError] = useState('')

  useEffect(() => {
    let cancelled = false
    collaboratorAPI.accept(token)
      .then((res) => {
        if (cancelled) return
        navigate(`/weddings/${res.data.weddingId}`, { replace: true })
      })
      .catch((err) => {
        if (cancelled) return
        setState('error')
        setError(err.response?.data?.error || 'Une erreur est survenue')
      })
    return () => { cancelled = true }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token])

  if (state === 'loading') {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-gray-50">
        <div className="h-10 w-10 animate-spin rounded-full border-2 border-primary-500 border-t-transparent" />
        <p className="text-gray-500">Vérification de l'invitation...</p>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-gray-50 px-6 text-center">
      <XCircleIcon className="h-12 w-12 text-gray-300" />
      <p className="max-w-sm text-gray-600">{error}</p>
      <Link to="/dashboard" className="btn-primary">Retour au tableau de bord</Link>
    </div>
  )
}
