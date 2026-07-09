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

  // Theme is applied globally on <html> (utils/theme.js), so this layout just
  // reads the tokens — no per-layout dark class needed.
  return (
    <div className="flex min-h-screen bg-bg text-content">
      {/* Left panel — Branding */}
      <div className="relative hidden flex-col justify-between overflow-hidden bg-gradient-to-br from-primary-500 via-primary-600 to-primary-700 p-12 text-white lg:flex lg:w-1/2">
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute -left-20 -top-20 h-80 w-80 rounded-full bg-white/10 blur-3xl" />
          <div className="absolute -right-16 bottom-0 h-80 w-80 rounded-full bg-white/10 blur-3xl" />
        </div>

        <div className="relative">
          <Link to="/" className="flex items-center gap-3">
            {siteLogo ? (
              <img src={siteLogo} alt={siteName} style={{ height: `${Math.round(logoHeight * 1.25)}px` }} className="object-contain" />
            ) : (
              <HeartIcon className="h-10 w-10" />
            )}
            <span className="font-serif text-2xl font-bold">{siteName}</span>
          </Link>
        </div>

        <div className="relative max-w-md space-y-8">
          <h1 className="font-serif text-4xl font-bold leading-tight">
            Donnez vie à vos événements
          </h1>
          <p className="text-lg text-white/80">
            Mariage, anniversaire, cérémonie… Créez des invitations digitales élégantes,
            envoyez-les et suivez les confirmations en temps réel.
          </p>

          <ul className="space-y-3">
            {PERKS.map((p, i) => (
              <li key={i} className="flex items-center gap-3">
                <span className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl bg-white/15 backdrop-blur">
                  <p.icon className="h-5 w-5" />
                </span>
                <span className="text-white/90">{p.text}</span>
              </li>
            ))}
          </ul>

          <div className="grid grid-cols-2 gap-4 pt-2">
            <div className="rounded-2xl border border-white/10 bg-white/10 p-5 backdrop-blur">
              <p className="text-3xl font-bold">500+</p>
              <p className="text-sm text-white/70">Événements célébrés</p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/10 p-5 backdrop-blur">
              <p className="text-3xl font-bold">50k+</p>
              <p className="text-sm text-white/70">Invitations envoyées</p>
            </div>
          </div>
        </div>

        <p className="relative text-sm text-white/70">
          © {new Date().getFullYear()} {siteName}. Tous droits réservés.
        </p>
      </div>

      {/* Right panel — Form */}
      <div className="relative flex flex-1 items-center justify-center p-6 sm:p-8">
        <div className="pointer-events-none absolute inset-0 -z-0 lg:hidden">
          <div className="absolute -right-16 -top-16 h-64 w-64 rounded-full bg-primary-500/15 blur-3xl" />
          <div className="absolute -left-10 bottom-0 h-56 w-56 rounded-full bg-primary-500/10 blur-3xl" />
        </div>

        <div className="relative w-full max-w-md">
          {/* Mobile logo */}
          <div className="mb-8 text-center lg:hidden">
            <Link to="/" className="inline-flex items-center gap-2">
              {siteLogo ? (
                <img src={siteLogo} alt={siteName} style={{ height: `${logoHeight}px` }} className="object-contain" />
              ) : (
                <HeartIcon className="h-8 w-8 text-primary-500" />
              )}
              <span className="font-serif text-xl font-bold text-content">{siteName}</span>
            </Link>
          </div>

          <div className="rounded-3xl border border-border bg-surface p-8 shadow-xl">
            <Outlet />
          </div>

          {/* Footer links */}
          <div className="mt-6 text-center text-sm text-muted">
            <Link to="/" className="transition-colors hover:text-content">Accueil</Link>
            <span className="mx-2">•</span>
            <a href="mailto:support@weddinginvite.pro" className="transition-colors hover:text-content">Support</a>
          </div>
        </div>
      </div>
    </div>
  )
}
