import { useState } from 'react'
import { Link, useParams, useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { authAPI } from '../../services/api'
import toast from 'react-hot-toast'
import { EyeIcon, EyeSlashIcon } from '@heroicons/react/24/outline'

export default function ResetPassword() {
  const [showPassword, setShowPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const { token } = useParams()
  const navigate = useNavigate()

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors }
  } = useForm()

  const password = watch('password')

  const onSubmit = async (data) => {
    setIsLoading(true)
    try {
      await authAPI.resetPassword(token, data.password)
      toast.success('Mot de passe modifié avec succès !')
      navigate('/login')
    } catch (error) {
      toast.error(error.response?.data?.error || 'Le lien est invalide ou expiré')
    } finally {
      setIsLoading(false)
    }
  }

  const inputBase = 'w-full rounded-xl border bg-bg px-3 py-3 text-sm text-content placeholder:text-muted transition focus:outline-none focus:ring-2 focus:ring-primary-500'
  const borderCls = (err) => (err ? 'border-red-500 focus:ring-red-500' : 'border-border focus:border-primary-500')

  return (
    <div>
      <div className="mb-8">
        <h2 className="font-serif text-2xl font-bold text-content">
          Réinitialiser le mot de passe
        </h2>
        <p className="mt-2 text-muted">
          Choisissez un nouveau mot de passe sécurisé
        </p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        <div>
          <label htmlFor="password" className="mb-1.5 block text-sm font-medium text-content">
            Nouveau mot de passe
          </label>
          <div className="relative">
            <input
              id="password"
              type={showPassword ? 'text' : 'password'}
              className={`${inputBase} pr-10 ${borderCls(errors.password)}`}
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
          <input
            id="confirmPassword"
            type="password"
            className={`${inputBase} ${borderCls(errors.confirmPassword)}`}
            placeholder="••••••••"
            {...register('confirmPassword', {
              required: 'Veuillez confirmer le mot de passe',
              validate: (value) =>
                value === password || 'Les mots de passe ne correspondent pas'
            })}
          />
          {errors.confirmPassword && (
            <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.confirmPassword.message}</p>
          )}
        </div>

        <button
          type="submit"
          disabled={isLoading}
          className="inline-flex w-full items-center justify-center rounded-full bg-primary-500 py-3 font-semibold text-white shadow-lg shadow-primary-500/25 transition-all hover:-translate-y-0.5 hover:bg-primary-600 disabled:opacity-60 disabled:hover:translate-y-0"
        >
          {isLoading ? 'Modification en cours...' : 'Réinitialiser le mot de passe'}
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
