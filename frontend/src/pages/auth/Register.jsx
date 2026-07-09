import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { useAuthStore } from '../../stores/authStore'
import toast from 'react-hot-toast'
import { EyeIcon, EyeSlashIcon, EnvelopeIcon, LockClosedIcon, UserIcon, PhoneIcon, ArrowRightIcon } from '@heroicons/react/24/outline'
import GoogleAuthButton from '../../components/auth/GoogleAuthButton'

export default function Register() {
  const [showPassword, setShowPassword] = useState(false)
  const { register: registerUser, isLoading } = useAuthStore()
  const navigate = useNavigate()

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors }
  } = useForm()

  const password = watch('password')

  const onSubmit = async (data) => {
    const result = await registerUser({
      email: data.email,
      password: data.password,
      firstName: data.firstName,
      lastName: data.lastName,
      phone: data.phone
    })
    
    if (result.success) {
      toast.success('Inscription réussie ! Bienvenue.')
      navigate('/dashboard')
    } else {
      toast.error(result.error)
    }
  }

  const inputBase = 'w-full rounded-xl border bg-bg py-3 text-sm text-content placeholder:text-muted transition focus:outline-none focus:ring-2 focus:ring-primary-500'
  const borderCls = (err) => (err ? 'border-red-500 focus:ring-red-500' : 'border-border focus:border-primary-500')

  return (
    <div>
      <div className="mb-8">
        <h2 className="font-serif text-3xl font-bold text-content">
          Créer un compte
        </h2>
        <p className="mt-2 text-muted">
          Commencez à créer vos invitations en quelques minutes
        </p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label htmlFor="firstName" className="mb-1.5 block text-sm font-medium text-content">Prénom</label>
            <div className="relative">
              <UserIcon className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-muted" />
              <input
                id="firstName"
                type="text"
                className={`${inputBase} pl-10 pr-3 ${borderCls(errors.firstName)}`}
                placeholder="Jean"
                {...register('firstName', { required: 'Le prénom est requis' })}
              />
            </div>
            {errors.firstName && (
              <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.firstName.message}</p>
            )}
          </div>

          <div>
            <label htmlFor="lastName" className="mb-1.5 block text-sm font-medium text-content">Nom</label>
            <input
              id="lastName"
              type="text"
              className={`${inputBase} px-3 ${borderCls(errors.lastName)}`}
              placeholder="Dupont"
              {...register('lastName', { required: 'Le nom est requis' })}
            />
            {errors.lastName && (
              <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.lastName.message}</p>
            )}
          </div>
        </div>

        <div>
          <label htmlFor="email" className="mb-1.5 block text-sm font-medium text-content">Email</label>
          <div className="relative">
            <EnvelopeIcon className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-muted" />
            <input
              id="email"
              type="email"
              className={`${inputBase} pl-10 pr-3 ${borderCls(errors.email)}`}
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
          <label htmlFor="phone" className="mb-1.5 block text-sm font-medium text-content">Téléphone (optionnel)</label>
          <div className="relative">
            <PhoneIcon className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-muted" />
            <input
              id="phone"
              type="tel"
              className={`${inputBase} pl-10 pr-3 border-border focus:border-primary-500`}
              placeholder="+229 01 23 45 67"
              {...register('phone')}
            />
          </div>
        </div>

        <div>
          <label htmlFor="password" className="mb-1.5 block text-sm font-medium text-content">Mot de passe</label>
          <div className="relative">
            <LockClosedIcon className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-muted" />
            <input
              id="password"
              type={showPassword ? 'text' : 'password'}
              className={`${inputBase} pl-10 pr-10 ${borderCls(errors.password)}`}
              placeholder="••••••••"
              {...register('password', {
                required: 'Le mot de passe est requis',
                minLength: {
                  value: 8,
                  message: 'Le mot de passe doit contenir au moins 8 caractères'
                },
                pattern: {
                  value: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/,
                  message: 'Le mot de passe doit contenir au moins une majuscule, une minuscule et un chiffre'
                }
              })}
            />
            <button
              type="button"
              className="absolute inset-y-0 right-0 flex items-center pr-3 text-muted hover:text-content"
              onClick={() => setShowPassword(!showPassword)}
            >
              {showPassword ? (
                <EyeSlashIcon className="h-5 w-5" />
              ) : (
                <EyeIcon className="h-5 w-5" />
              )}
            </button>
          </div>
          {errors.password && (
            <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.password.message}</p>
          )}
        </div>

        <div>
          <label htmlFor="confirmPassword" className="mb-1.5 block text-sm font-medium text-content">
            Confirmer le mot de passe
          </label>
          <div className="relative">
            <LockClosedIcon className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-muted" />
            <input
              id="confirmPassword"
              type="password"
              className={`${inputBase} pl-10 pr-3 ${borderCls(errors.confirmPassword)}`}
              placeholder="••••••••"
              {...register('confirmPassword', {
                required: 'Veuillez confirmer le mot de passe',
                validate: (value) =>
                  value === password || 'Les mots de passe ne correspondent pas'
              })}
            />
          </div>
          {errors.confirmPassword && (
            <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.confirmPassword.message}</p>
          )}
        </div>

        <div className="flex items-start">
          <input
            id="terms"
            type="checkbox"
            className="mt-1 rounded border-border text-primary-500 focus:ring-primary-500"
            {...register('terms', {
              required: 'Vous devez accepter les conditions d\'utilisation'
            })}
          />
          <label htmlFor="terms" className="ml-2 text-sm text-muted">
            J'accepte les{' '}
            <a href="/legal/conditions" target="_blank" rel="noopener noreferrer" className="text-primary-600 hover:text-primary-700 dark:text-primary-400">
              conditions d'utilisation
            </a>{' '}
            et la{' '}
            <a href="/legal/confidentialite" target="_blank" rel="noopener noreferrer" className="text-primary-600 hover:text-primary-700 dark:text-primary-400">
              politique de confidentialité
            </a>
          </label>
        </div>
        {errors.terms && (
          <p className="text-sm text-red-600 dark:text-red-400">{errors.terms.message}</p>
        )}

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
              Création en cours...
            </span>
          ) : (
            <>Créer mon compte <ArrowRightIcon className="h-5 w-5" /></>
          )}
        </button>
      </form>

      <GoogleAuthButton label="ou s'inscrire avec" />

      <p className="mt-8 text-center text-muted">
        Déjà un compte ?{' '}
        <Link to="/login" className="font-semibold text-primary-600 hover:text-primary-700 dark:text-primary-400">
          Se connecter
        </Link>
      </p>
    </div>
  )
}
