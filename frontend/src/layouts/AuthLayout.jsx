import { Outlet, Link } from 'react-router-dom'
import { HeartIcon } from '@heroicons/react/24/solid'
import {
  QrCodeIcon,
  ChartBarIcon,
  CurrencyDollarIcon,
  DevicePhoneMobileIcon
} from '@heroicons/react/24/outline'
import useSiteSettingsStore from '../stores/siteSettingsStore'

const PERKS = [
  { icon: QrCodeIcon, text: 'QR code unique par invité' },
  { icon: ChartBarIcon, text: 'Suivi des RSVP en temps réel' },
  { icon: CurrencyDollarIcon, text: 'Paiement Mobile Money' },
  { icon: DevicePhoneMobileIcon, text: 'Envoi WhatsApp en 1 clic' }
]

export default function AuthLayout() {
  const { siteName, siteLogo, logoHeight } = useSiteSettingsStore()
  return (
    <div className="min-h-screen flex bg-gradient-to-br from-rose-50 via-white to-gold-50">
      {/* Left panel — Branding */}
      <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden bg-gradient-to-br from-primary-600 via-primary-700 to-primary-800 text-white flex-col justify-between p-12">
        {/* Decorative blobs */}
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute -top-20 -left-20 h-80 w-80 rounded-full bg-white/10 blur-3xl" />
          <div className="absolute bottom-0 -right-16 h-80 w-80 rounded-full bg-gold-400/20 blur-3xl" />
        </div>

        <div className="relative">
          <Link to="/" className="flex items-center space-x-3">
            {siteLogo ? (
              <img src={siteLogo} alt={siteName} style={{ height: `${Math.round(logoHeight * 1.25)}px` }} className="object-contain" />
            ) : (
              <HeartIcon className="h-10 w-10" />
            )}
            <span className="text-2xl font-serif font-bold">{siteName}</span>
          </Link>
        </div>

        <div className="relative space-y-8 max-w-md">
          <h1 className="text-4xl font-serif font-bold leading-tight">
            Donnez vie à vos événements
          </h1>
          <p className="text-lg text-primary-100">
            Mariage, anniversaire, cérémonie… Créez des invitations digitales élégantes,
            envoyez-les et suivez les confirmations en temps réel.
          </p>

          <ul className="space-y-3">
            {PERKS.map((p, i) => (
              <li key={i} className="flex items-center gap-3">
                <span className="flex-shrink-0 h-9 w-9 rounded-xl bg-white/15 backdrop-blur flex items-center justify-center">
                  <p.icon className="h-5 w-5" />
                </span>
                <span className="text-primary-50">{p.text}</span>
              </li>
            ))}
          </ul>

          <div className="grid grid-cols-2 gap-4 pt-2">
            <div className="bg-white/10 backdrop-blur rounded-2xl p-5 border border-white/10">
              <p className="text-3xl font-bold">500+</p>
              <p className="text-primary-200 text-sm">Événements célébrés</p>
            </div>
            <div className="bg-white/10 backdrop-blur rounded-2xl p-5 border border-white/10">
              <p className="text-3xl font-bold">50k+</p>
              <p className="text-primary-200 text-sm">Invitations envoyées</p>
            </div>
          </div>
        </div>

        <p className="relative text-primary-200 text-sm">
          © {new Date().getFullYear()} {siteName}. Tous droits réservés.
        </p>
      </div>

      {/* Right panel — Form */}
      <div className="flex-1 flex items-center justify-center p-6 sm:p-8 relative">
        {/* Subtle blobs on mobile/desktop right side */}
        <div className="pointer-events-none absolute inset-0 -z-0 lg:hidden">
          <div className="absolute -top-16 -right-16 h-64 w-64 rounded-full bg-primary-200/30 blur-3xl" />
          <div className="absolute bottom-0 -left-10 h-56 w-56 rounded-full bg-gold-200/40 blur-3xl" />
        </div>

        <div className="w-full max-w-md relative">
          {/* Mobile logo */}
          <div className="lg:hidden mb-8 text-center">
            <Link to="/" className="inline-flex items-center space-x-2">
              {siteLogo ? (
                <img src={siteLogo} alt={siteName} style={{ height: `${logoHeight}px` }} className="object-contain" />
              ) : (
                <HeartIcon className="h-8 w-8 text-primary-600" />
              )}
              <span className="text-xl font-serif font-bold text-gray-900">{siteName}</span>
            </Link>
          </div>

          <div className="bg-white/90 backdrop-blur rounded-3xl shadow-xl ring-1 ring-black/5 p-8">
            <Outlet />
          </div>

          {/* Footer links */}
          <div className="mt-6 text-center text-sm text-gray-500">
            <Link to="/" className="hover:text-primary-600 transition-colors">Accueil</Link>
            <span className="mx-2">•</span>
            <a href="mailto:support@weddinginvite.pro" className="hover:text-primary-600 transition-colors">Support</a>
          </div>
        </div>
      </div>
    </div>
  )
}
