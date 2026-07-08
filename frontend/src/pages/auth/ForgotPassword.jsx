import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { authAPI } from '../../services/api'
import toast from 'react-hot-toast'

export default function ForgotPassword() {
  const [isLoading, setIsLoading] = useState(false)
  const [submitted, setSubmitted] = useState(false)

  const {
    register,
    handleSubmit,
    formState: { errors }
  } = useForm()

  const onSubmit = async (data) => {
    setIsLoading(true)
    try {
      await authAPI.forgotPassword(data.email)
      setSubmitted(true)
      toast.success('Email de réinitialisation envoyé !')
    } catch (error) {
      toast.error(error.response?.data?.error || 'Une erreur est survenue')
    } finally {
      setIsLoading(false)
    }
  }

  if (submitted) {
    return (
      <div className="text-center">
        <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-emerald-500/15">
          <svg className="h-8 w-8 text-emerald-600 dark:text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <h2 className="mb-4 font-serif text-2xl font-bold text-content">
          Email envoyé !
        </h2>
        <p className="mb-6 text-muted">
          Si un compte existe avec cette adresse email, vous recevrez un lien
          pour réinitialiser votre mot de passe.
        </p>
        <p className="mb-6 text-sm text-muted">
          Vérifiez également votre dossier spam.
        </p>
        <Link to="/login" className="inline-flex items-center justify-center rounded-full bg-primary-500 px-6 py-3 font-semibold text-white transition-colors hover:bg-primary-600">
          Retour à la connexion
        </Link>
      </div>
    )
  }

  return (
    <div>
      <div className="mb-8">
        <h2 className="font-serif text-2xl font-bold text-content">
          Mot de passe oublié
        </h2>
        <p className="mt-2 text-muted">
          Entrez votre email pour recevoir un lien de réinitialisation
        </p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        <div>
          <label htmlFor="email" className="mb-1.5 block text-sm font-medium text-content">
            Email
          </label>
          <input
            id="email"
            type="email"
            className={`w-full rounded-xl border bg-bg px-3 py-3 text-sm text-content placeholder:text-muted transition focus:outline-none focus:ring-2 focus:ring-primary-500 ${errors.email ? 'border-red-500 focus:ring-red-500' : 'border-border focus:border-primary-500'}`}
            placeholder="votre@email.com"
            {...register('email', {
              required: 'L\'email est requis',
              pattern: {
                value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
                message: 'Email invalide'
              }
            })}
          />
          {errors.email && (
            <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.email.message}</p>
          )}
        </div>

        <button
          type="submit"
          disabled={isLoading}
          className="inline-flex w-full items-center justify-center rounded-full bg-primary-500 py-3 font-semibold text-white shadow-lg shadow-primary-500/25 transition-all hover:-translate-y-0.5 hover:bg-primary-600 disabled:opacity-60 disabled:hover:translate-y-0"
        >
          {isLoading ? 'Envoi en cours...' : 'Envoyer le lien'}
        </button>
      </form>

      <p className="mt-8 text-center text-muted">
        <Link to="/login" className="font-medium text-primary-600 hover:text-primary-700 dark:text-primary-400">
          ← Retour à la connexion
        </Link>
      </p>
    </div>
  )
}
