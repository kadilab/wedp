import { useState } from 'react'
import { useNavigate, Navigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import { HeartIcon, WifiIcon } from '@heroicons/react/24/solid'
import { useAuthStore } from '../stores/authStore'
import useOnlineStatus from '../hooks/useOnlineStatus'

export default function Login() {
  const { login, isLoading, isAuthenticated } = useAuthStore()
  const navigate = useNavigate()
  const isOnline = useOnlineStatus()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')

  if (isAuthenticated) {
    return <Navigate to="/" replace />
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    const result = await login(email, password)
    if (result.success) {
      toast.success('Connecté !')
      navigate('/')
    } else {
      toast.error(result.error)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-rose-50 via-white to-gold-50 p-4 safe-top safe-bottom">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center h-16 w-16 rounded-full bg-primary-100 mb-4">
            <HeartIcon className="h-8 w-8 text-primary-600" />
          </div>
          <h1 className="text-2xl font-serif font-bold text-gray-900">WeddingInvite Check-in</h1>
          <p className="text-gray-500 mt-1">Connectez-vous pour gérer les arrivées</p>
        </div>

        {!isOnline && (
          <div className="mb-4 flex items-center gap-2 rounded-lg bg-amber-50 border border-amber-200 px-4 py-2.5 text-sm text-amber-700">
            <WifiIcon className="h-4 w-4 flex-shrink-0" />
            Pas de connexion — la première connexion nécessite internet. Si vous étiez déjà connecté, l'app s'ouvre automatiquement.
          </div>
        )}

        <form onSubmit={handleSubmit} className="card p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
            <input
              type="email"
              required
              autoComplete="username"
              className="input"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="vous@exemple.com"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Mot de passe</label>
            <input
              type="password"
              required
              autoComplete="current-password"
              className="input"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
            />
          </div>
          <button type="submit" disabled={isLoading} className="btn-primary btn-lg w-full">
            {isLoading ? 'Connexion...' : 'Se connecter'}
          </button>
        </form>

        <p className="text-center text-xs text-gray-400 mt-6">
          Une fois connecté, l'application reste utilisable même sans réseau.
        </p>
      </div>
    </div>
  )
}
