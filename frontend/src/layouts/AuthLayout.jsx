import { Outlet, Link } from 'react-router-dom'
import { HeartIcon } from '@heroicons/react/24/solid'
import useSiteSettingsStore from '../stores/siteSettingsStore'

export default function AuthLayout() {
  const { siteName, siteLogo, logoHeight } = useSiteSettingsStore()
  return (
    <div className="min-h-screen bg-gradient-wedding flex">
      {/* Left panel - Branding */}
      <div className="hidden lg:flex lg:w-1/2 bg-primary-600 text-white flex-col justify-between p-12">
        <div>
          <Link to="/" className="flex items-center space-x-3">
            {siteLogo ? (
              <img src={siteLogo} alt={siteName} style={{ height: `${Math.round(logoHeight * 1.25)}px` }} className="object-contain" />
            ) : (
              <HeartIcon className="h-10 w-10" />
            )}
            <span className="text-2xl font-serif font-bold">{siteName}</span>
          </Link>
        </div>

        <div className="space-y-8">
          <h1 className="text-4xl font-serif font-bold leading-tight">
            Créez des invitations de mariage mémorables
          </h1>
          <p className="text-lg text-primary-100">
            Gérez vos invités, envoyez des invitations personnalisées avec QR code,
            et suivez les confirmations en temps réel.
          </p>
          
          <div className="grid grid-cols-2 gap-6">
            <div className="bg-white/10 rounded-xl p-5">
              <p className="text-3xl font-bold">500+</p>
              <p className="text-primary-200">Mariages célébrés</p>
            </div>
            <div className="bg-white/10 rounded-xl p-5">
              <p className="text-3xl font-bold">50k+</p>
              <p className="text-primary-200">Invitations envoyées</p>
            </div>
          </div>
        </div>

        <p className="text-primary-200 text-sm">
          © {new Date().getFullYear()} {siteName}. Tous droits réservés.
        </p>
      </div>

      {/* Right panel - Form */}
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="w-full max-w-md">
          {/* Mobile logo */}
          <div className="lg:hidden mb-8 text-center">
            <Link to="/" className="inline-flex items-center space-x-2">
              {siteLogo ? (
                <img src={siteLogo} alt={siteName} style={{ height: `${logoHeight}px` }} className="object-contain" />
              ) : (
                <HeartIcon className="h-8 w-8 text-primary-600" />
              )}
              <span className="text-xl font-serif font-bold text-gray-900">
                {siteName}
              </span>
            </Link>
          </div>

          <div className="bg-white rounded-2xl shadow-xl p-8">
            <Outlet />
          </div>

          {/* Footer links */}
          <div className="mt-6 text-center text-sm text-gray-500">
            <Link to="/" className="link">Accueil</Link>
            <span className="mx-2">•</span>
            <a href="mailto:support@weddinginvite.pro" className="link">
              Support
            </a>
          </div>
        </div>
      </div>
    </div>
  )
}
