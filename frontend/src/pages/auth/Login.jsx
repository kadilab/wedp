import { useState } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { useAuthStore } from '../../stores/authStore'
import toast from 'react-hot-toast'
import { EyeIcon, EyeSlashIcon, EnvelopeIcon, LockClosedIcon, ArrowRightIcon } from '@heroicons/react/24/outline'
import GoogleAuthButton from '../../components/auth/GoogleAuthButton'

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

  const inputBase = 'w-full rounded-xl border bg-bg py-3 pl-10 pr-3 text-sm text-content placeholder:text-muted transition focus:outline-none focus:ring-2 focus:ring-primary-500'

  return (
    <div>
      <div className="mb-8">
        <h2 className="font-serif text-3xl font-bold text-content">
          Bon retour 👋
        </h2>
        <p className="mt-2 text-muted">
          Connectez-vous à votre espace de gestion d'invitations
        </p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
        <div>
          <label htmlFor="email" className="mb-1.5 block text-sm font-medium text-content">Email</label>
          <div className="relative">
            <EnvelopeIcon className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-muted" />
            <input
              id="email"
              type="email"
              className={`${inputBase} ${errors.email ? 'border-red-500 focus:ring-red-500' : 'border-border focus:border-primary-500'}`}
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
            <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.email.message}</p>
          )}
        </div>

        <div>
          <label htmlFor="password" className="mb-1.5 block text-sm font-medium text-content">Mot de passe</label>
          <div className="relative">
            <LockClosedIcon className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-muted" />
            <input
              id="password"
              type={showPassword ? 'text' : 'password'}
              className={`${inputBase} pr-10 ${errors.password ? 'border-red-500 focus:ring-red-500' : 'border-border focus:border-primary-500'}`}
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
              className="absolute inset-y-0 right-0 flex items-center pr-3 text-muted hover:text-content"
              onClick={() => setShowPassword(!showPassword)}
            >
              {showPassword ? <EyeSlashIcon className="h-5 w-5" /> : <EyeIcon className="h-5 w-5" />}
            </button>
          </div>
          {errors.password && (
            <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.password.message}</p>
          )}
        </div>

        <div className="flex items-center justify-between">
          <label className="flex items-center">
            <input
              type="checkbox"
              className="rounded border-border text-primary-500 focus:ring-primary-500"
            />
            <span className="ml-2 text-sm text-muted">Se souvenir de moi</span>
          </label>

          <Link
            to="/forgot-password"
            className="text-sm font-medium text-primary-600 hover:text-primary-700 dark:text-primary-400"
          >
            Mot de passe oublié ?
          </Link>
        </div>

        <button
          type="submit"
          disabled={isLoading}
          className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-primary-500 py-3.5 font-semibold text-white shadow-lg shadow-primary-500/25 transition-all hover:-translate-y-0.5 hover:bg-primary-600 disabled:opacity-60 disabled:hover:translate-y-0"
        >
          {isLoading ? (
            <span className="flex items-center justify-center">
              <svg className="-ml-1 mr-3 h-5 w-5 animate-spin text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
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

      <GoogleAuthButton />

      <p className="mt-8 text-center text-muted">
        Pas encore de compte ?{' '}
        <Link to="/register" className="font-semibold text-primary-600 hover:text-primary-700 dark:text-primary-400">
          Créer un compte
        </Link>
      </p>
    </div>
  )
}
