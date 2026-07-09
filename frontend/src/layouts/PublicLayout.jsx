import { useEffect, useState } from 'react'
import { Outlet, Link, useLocation } from 'react-router-dom'
import {
  QrCodeIcon, Bars3Icon, XMarkIcon, ArrowRightIcon, SunIcon, MoonIcon,
  EnvelopeIcon, PhoneIcon,
} from '@heroicons/react/24/outline'
import api from '../services/api'
import { useAuthStore } from '../stores/authStore'
import useSiteSettingsStore from '../stores/siteSettingsStore'
import { useTheme } from '../utils/theme'

const NAV = [
  { label: 'Accueil', to: '/', hash: false },
  { label: 'Fonctionnalités', to: '/#fonctionnalites', hash: true },
  { label: 'Modèles', to: '/marketplace', hash: false },
  { label: 'Contact', to: '/#contact', hash: true },
]

export default function PublicLayout() {
  const { isAuthenticated, user } = useAuthStore()
  const { siteName, siteLogo, logoHeight, contactEmail, supportPhone } = useSiteSettingsStore()
  const [menuOpen, setMenuOpen] = useState(false)
  const [scrolled, setScrolled] = useState(false)
  const { isDark, toggle: toggleTheme } = useTheme()
  const location = useLocation()

  useEffect(() => {
    if (sessionStorage.getItem('visit-tracked')) return
    sessionStorage.setItem('visit-tracked', '1')
    api.post('/public/track-visit').catch(() => {})
  }, [])

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  useEffect(() => { setMenuOpen(false) }, [location.pathname])

  const dashboardLink = user?.role === 'ADMIN' || user?.role === 'SUPER_ADMIN' ? '/admin' : '/dashboard'
  const initial = (siteName || 'W').trim().charAt(0).toUpperCase()

  const Brand = () => (
    <Link to="/" className="flex items-center gap-2.5" aria-label={siteName}>
      {siteLogo ? (
        <img src={siteLogo} alt={siteName} style={{ height: `${logoHeight}px` }} className="object-contain" />
      ) : (
        <span className="brand-serif inline-flex h-9 w-9 items-center justify-center rounded-xl bg-primary-500 text-lg font-bold text-white shadow-sm">
          {initial}
        </span>
      )}
      <span className="brand-serif text-lg font-bold tracking-tight text-content">{siteName}</span>
    </Link>
  )

  const ThemeToggle = ({ className = '' }) => (
    <button
      type="button"
      onClick={toggleTheme}
      aria-label={isDark ? 'Passer en clair' : 'Passer en sombre'}
      title={isDark ? 'Passer en clair' : 'Passer en sombre'}
      className={`inline-flex h-10 w-10 items-center justify-center rounded-full border border-border bg-surface text-content transition-colors hover:bg-surface-2 ${className}`}
    >
      {isDark ? <SunIcon className="h-5 w-5" /> : <MoonIcon className="h-5 w-5" />}
    </button>
  )

  return (
    <div className="pub-shell flex min-h-screen flex-col bg-bg text-content">
      <style>{`
        .pub-shell { font-family: 'Montserrat', system-ui, sans-serif; }
        .pub-shell .brand-serif { font-family: 'Playfair Display', Georgia, serif; }
      `}</style>

      {/* ============ FLOATING NAV (style winvitepro) ============ */}
      <div className="pointer-events-none fixed inset-x-0 top-4 z-50 px-4">
        <div className="pointer-events-auto mx-auto max-w-6xl">
          <nav
            className={`flex items-center justify-between gap-3 rounded-full border py-2 pl-4 pr-2 transition-all duration-300 ${
              scrolled
                ? 'border-border bg-surface/80 shadow-lg shadow-black/5 backdrop-blur-xl'
                : 'border-border/60 bg-surface/50 backdrop-blur-md'
            }`}
          >
            <Brand />

            {/* Center links */}
            <ul className="mx-auto hidden items-center gap-1 lg:flex">
              {NAV.map((n) => (
                <li key={n.label}>
                  <Link
                    to={n.to}
                    className="rounded-full px-4 py-2 text-sm font-medium text-muted transition-colors hover:bg-surface-2 hover:text-content"
                  >
                    {n.label}
                  </Link>
                </li>
              ))}
              <li>
                <a
                  href="/checkin/"
                  className="inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-sm font-medium text-muted transition-colors hover:bg-surface-2 hover:text-content"
                >
                  <QrCodeIcon className="h-4 w-4" /> Check-in
                </a>
              </li>
            </ul>

            {/* Right actions (desktop) */}
            <div className="hidden items-center gap-2 lg:flex">
              <ThemeToggle />
              {isAuthenticated ? (
                <Link
                  to={dashboardLink}
                  className="inline-flex items-center gap-2 rounded-full bg-primary-500 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-primary-600"
                >
                  Tableau de bord <ArrowRightIcon className="h-4 w-4" />
                </Link>
              ) : (
                <>
                  <Link to="/login" className="rounded-full px-4 py-2 text-sm font-semibold text-content transition-colors hover:bg-surface-2">
                    Connexion
                  </Link>
                  <Link
                    to="/register"
                    className="inline-flex items-center rounded-full bg-primary-500 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-primary-600"
                  >
                    Commencer
                  </Link>
                </>
              )}
            </div>

            {/* Mobile */}
            <div className="flex items-center gap-2 lg:hidden">
              <ThemeToggle />
              <button
                type="button"
                onClick={() => setMenuOpen((v) => !v)}
                aria-label="Menu"
                aria-expanded={menuOpen}
                className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-border bg-surface text-content"
              >
                {menuOpen ? <XMarkIcon className="h-5 w-5" /> : <Bars3Icon className="h-5 w-5" />}
              </button>
            </div>
          </nav>

          {/* Mobile drawer */}
          {menuOpen && (
            <div className="pointer-events-auto mt-2 rounded-3xl border border-border bg-surface/95 p-3 shadow-xl backdrop-blur-xl lg:hidden">
              {NAV.map((n) => (
                <Link
                  key={n.label}
                  to={n.to}
                  onClick={() => setMenuOpen(false)}
                  className="block rounded-2xl px-4 py-3 text-base font-medium text-content hover:bg-surface-2"
                >
                  {n.label}
                </Link>
              ))}
              <a
                href="/checkin/"
                onClick={() => setMenuOpen(false)}
                className="flex items-center gap-2 rounded-2xl px-4 py-3 text-base font-medium text-content hover:bg-surface-2"
              >
                <QrCodeIcon className="h-5 w-5" /> Check-in
              </a>
              <div className="mt-2 space-y-2 border-t border-border pt-3">
                {isAuthenticated ? (
                  <Link to={dashboardLink} onClick={() => setMenuOpen(false)} className="block w-full rounded-full bg-primary-500 px-4 py-3 text-center text-sm font-semibold text-white">
                    Tableau de bord
                  </Link>
                ) : (
                  <>
                    <Link to="/login" onClick={() => setMenuOpen(false)} className="block w-full rounded-full border border-border px-4 py-3 text-center text-sm font-semibold text-content hover:bg-surface-2">
                      Connexion
                    </Link>
                    <Link to="/register" onClick={() => setMenuOpen(false)} className="block w-full rounded-full bg-primary-500 px-4 py-3 text-center text-sm font-semibold text-white">
                      Commencer
                    </Link>
                  </>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Main — top padding clears the floating nav on every public page */}
      <main className="flex-1 pt-24">
        <Outlet />
      </main>

      {/* ================= FOOTER ================= */}
      <footer id="contact" className="scroll-mt-24 border-t border-border bg-surface">
        <div className="mx-auto max-w-7xl px-5 py-16 sm:px-8">
          <div className="grid grid-cols-1 gap-10 md:grid-cols-12">
            <div className="md:col-span-5">
              <Brand />
              <p className="mt-4 max-w-sm text-sm leading-relaxed text-muted">
                La solution complète pour créer et gérer vos invitations digitales —
                QR par invité, suivi RSVP en temps réel et paiement Mobile Money.
              </p>
              <Link to="/register" className="mt-6 inline-flex items-center gap-2 rounded-full bg-primary-500 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-primary-600">
                Commencer gratuitement <ArrowRightIcon className="h-4 w-4" />
              </Link>
            </div>

            <div className="md:col-span-3">
              <h3 className="mb-4 text-xs font-semibold uppercase tracking-[.18em] text-muted">Produit</h3>
              <ul className="space-y-2.5 text-sm">
                <li><Link to="/#fonctionnalites" className="inline-block py-1 text-muted transition-colors hover:text-content">Fonctionnalités</Link></li>
                <li><Link to="/marketplace" className="inline-block py-1 text-muted transition-colors hover:text-content">Modèles</Link></li>
                <li><a href="/checkin/" className="inline-block py-1 text-muted transition-colors hover:text-content">App Check-in</a></li>
              </ul>
            </div>

            <div className="md:col-span-4">
              <h3 className="mb-4 text-xs font-semibold uppercase tracking-[.18em] text-muted">Contact</h3>
              <ul className="space-y-3 text-sm">
                {contactEmail && (
                  <li>
                    <a href={`mailto:${contactEmail}`} className="group inline-flex items-center gap-3 text-muted transition-colors hover:text-content">
                      <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-primary-500/10 text-primary-600 dark:text-primary-400">
                        <EnvelopeIcon className="h-4 w-4" />
                      </span>
                      {contactEmail}
                    </a>
                  </li>
                )}
                {supportPhone && (
                  <li>
                    <a href={`tel:${supportPhone}`} className="group inline-flex items-center gap-3 text-muted transition-colors hover:text-content">
                      <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-primary-500/10 text-primary-600 dark:text-primary-400">
                        <PhoneIcon className="h-4 w-4" />
                      </span>
                      {supportPhone}
                    </a>
                  </li>
                )}
                {!contactEmail && !supportPhone && (
                  <li className="text-muted">Coordonnées en cours de configuration.</li>
                )}
              </ul>
            </div>
          </div>

          <div className="mt-12 flex flex-col items-center justify-between gap-3 border-t border-border pt-8 text-xs text-muted sm:flex-row">
            <p>© {new Date().getFullYear()} {siteName}. Tous droits réservés.</p>
            <p>Conçu avec soin pour vos plus beaux événements.</p>
          </div>
        </div>
      </footer>
    </div>
  )
}
