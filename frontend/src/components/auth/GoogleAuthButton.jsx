import { GoogleLogin } from '@react-oauth/google'
import { useNavigate, useLocation } from 'react-router-dom'
import toast from 'react-hot-toast'
import { useAuthStore } from '../../stores/authStore'

// "Continue with Google" button (ID token flow) shared by Login & Register.
export default function GoogleAuthButton({ label = 'ou' }) {
  const { loginWithGoogle } = useAuthStore()
  const navigate = useNavigate()
  const location = useLocation()
  const from = location.state?.from?.pathname

  const handleSuccess = async (resp) => {
    const credential = resp?.credential
    if (!credential) return toast.error('Connexion Google échouée')
    const result = await loginWithGoogle(credential)
    if (result.success) {
      toast.success('Connexion réussie !')
      const role = result.user?.role
      if (role === 'ADMIN' || role === 'SUPER_ADMIN') navigate('/admin', { replace: true })
      else navigate(from || '/dashboard', { replace: true })
    } else {
      toast.error(result.error)
    }
  }

  return (
    <div className="mt-6">
      <div className="flex items-center gap-3 mb-4">
        <div className="flex-1 border-t border-border" />
        <span className="text-xs text-muted uppercase tracking-wider">{label}</span>
        <div className="flex-1 border-t border-border" />
      </div>
      <div className="flex justify-center">
        <GoogleLogin
          onSuccess={handleSuccess}
          onError={() => toast.error('Connexion Google échouée')}
          text="continue_with"
          shape="pill"
          locale="fr"
          width="320"
        />
      </div>
    </div>
  )
}
