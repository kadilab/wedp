import { useState } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { useAuthStore } from '../../stores/authStore'
import toast from 'react-hot-toast'
import { EyeIcon, EyeSlashIcon, EnvelopeIcon, LockClosedIcon, ArrowRightIcon } from '@heroicons/react/24/outline'

export default function Login() {
  const [showPassword, setShowPassword] = useState(false)
  const { login, isLoading } = useAuthStore()
  const navigate = useNavigate()
  const location = useLocation()

  const from = location.state?.from?.pathname || '/dashboard'

  const {
    register,
    handleSubmit,
    formState: { errors }
  } = useForm()

  const onSubmit = async (data) => {
    const result = await login(data.email, data.password)
    
    if (result.success) {
      toast.success('Connexion réussie !')
      // Redirect admin to admin dashboard
      const { user } = useAuthStore.getState()
      if (user?.role === 'ADMIN' || user?.role === 'SUPER_ADMIN') {
        navigate('/admin', { replace: true })
      } else {
        navigate(from, { replace: true })
      }
    } else {
      toast.error(result.error)
    }
  }

  return (
    <div>
      <div className="mb-8">
        <h2 className="text-3xl font-serif font-bold text-gray-900">
          Bon retour 👋
        </h2>
        <p className="text-gray-500 mt-2">
          Connectez-vous à votre espace de gestion d'invitations
        </p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
        <div>
          <label htmlFor="email" className="label">Email</label>
          <div className="relative">
            <EnvelopeIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
            <input
              id="email"
              type="email"
              className={`input pl-10 ${errors.email ? 'input-error' : ''}`}
              placeholder="votre@email.com"
              {...register('email', {
                required: 'L\'email est requis',
                pattern: {
                  value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
                  message: 'Email invalide'
                }
              })}
            />
          </div>
          {errors.email && (
            <p className="mt-1 text-sm text-red-600">{errors.email.message}</p>
          )}
        </div>

        <div>
          <label htmlFor="password" className="label">Mot de passe</label>
          <div className="relative">
            <LockClosedIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
            <input
              id="password"
              type={showPassword ? 'text' : 'password'}
              className={`input pl-10 pr-10 ${errors.password ? 'input-error' : ''}`}
              placeholder="••••••••"
              {...register('password', {
                required: 'Le mot de passe est requis',
                minLength: {
                  value: 6,
                  message: 'Le mot de passe doit contenir au moins 6 caractères'
                }
              })}
            />
            <button
              type="button"
              className="absolute inset-y-0 right-0 flex items-center pr-3 text-gray-400 hover:text-gray-600"
              onClick={() => setShowPassword(!showPassword)}
            >
              {showPassword ? <EyeSlashIcon className="h-5 w-5" /> : <EyeIcon className="h-5 w-5" />}
            </button>
          </div>
          {errors.password && (
            <p className="mt-1 text-sm text-red-600">{errors.password.message}</p>
          )}
        </div>

        <div className="flex items-center justify-between">
          <label className="flex items-center">
            <input
              type="checkbox"
              className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
            />
            <span className="ml-2 text-sm text-gray-600">Se souvenir de moi</span>
          </label>

          <Link
            to="/forgot-password"
            className="text-sm text-primary-600 hover:text-primary-700"
          >
            Mot de passe oublié ?
          </Link>
        </div>

        <button
          type="submit"
          disabled={isLoading}
          className="w-full inline-flex items-center justify-center gap-2 py-3.5 rounded-full bg-gradient-to-r from-primary-600 to-primary-700 text-white font-semibold shadow-lg shadow-primary-600/25 hover:shadow-xl hover:-translate-y-0.5 transition-all disabled:opacity-60 disabled:hover:translate-y-0"
        >
          {isLoading ? (
            <span className="flex items-center justify-center">
              <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              Connexion en cours...
            </span>
          ) : (
            <>Se connecter <ArrowRightIcon className="h-5 w-5" /></>
          )}
        </button>
      </form>

      <p className="mt-8 text-center text-gray-600">
        Pas encore de compte ?{' '}
        <Link to="/register" className="text-primary-600 hover:text-primary-700 font-semibold">
          Créer un compte
        </Link>
      </p>
    </div>
  )
}
