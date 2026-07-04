import { useEffect, useState } from 'react'
import { Outlet, Link, useLocation } from 'react-router-dom'
import { QrCodeIcon, Bars3Icon, XMarkIcon, ArrowRightIcon } from '@heroicons/react/24/outline'
import api from '../services/api'
import { useAuthStore } from '../stores/authStore'
import useSiteSettingsStore from '../stores/siteSettingsStore'

const NAV = [
  { label: 'Accueil', to: '/', hash: false },
  { label: 'Fonctionnalités', to: '/#fonctionnalites', hash: true },
  { label: 'Modèles', to: '/marketplace', hash: false },
  { label: 'Contact', to: '/#contact', hash: true }
]

export default function PublicLayout() {
  const { isAuthenticated, user } = useAuthStore()
  const { siteName, siteLogo, logoHeight, contactEmail, supportPhone } = useSiteSettingsStore()
  const [menuOpen, setMenuOpen] = useState(false)
  const [scrolled, setScrolled] = useState(false)
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

  const Brand = ({ dark = false }) => (
    <Link to="/" className="flex items-center gap-2.5">
      {siteLogo ? (
        <img src={siteLogo} alt={siteName} style={{ height: `${logoHeight}px` }} className="object-contain" />
      ) : (
        <span className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-primary-600 text-white shadow-sm brand-serif text-lg font-bold">
          {initial}
        </span>
      )}
      <span className={`brand-serif text-xl font-bold tracking-tight ${dark ? 'text-white' : 'text-stone-900'}`}>{siteName}</span>
    </Link>
  )

  return (
    <div className="pub-shell min-h-screen flex flex-col bg-white">
      <style>{`
        .pub-shell { font-family: 'Montserrat', system-ui, sans-serif; }
        .pub-shell .brand-serif { font-family: 'Playfair Display', Georgia, serif; }
        .pub-nav-link { position: relative; }
        .pub-nav-link::after { content:''; position:absolute; left:0; bottom:-6px; height:2px; width:0; background:#cc5038; border-radius:2px; transition:width .3s cubic-bezier(.22,1,.36,1); }
        .pub-nav-link:hover::after { width:100%; }
      `}</style>

      {/* ================= HEADER ================= */}
      <header className={`sticky top-0 z-50 transition-all duration-300 ${scrolled ? 'bg-white/90 backdrop-blur-md border-b border-stone-200 shadow-sm' : 'bg-white/70 backdrop-blur-sm border-b border-transparent'}`}>
        <div className="max-w-7xl mx-auto px-5 sm:px-8">
          <div className="flex items-center justify-between h-[4.5rem]">
            <Brand />

            <nav className="hidden md:flex items-center gap-9 text-[14.5px] font-medium text-stone-600">
              {NAV.map((n) => (
                <Link key={n.label} to={n.to} className="pub-nav-link hover:text-stone-900 transition-colors">{n.label}</Link>
              ))}
              <a href="/checkin/" className="pub-nav-link inline-flex items-center gap-1.5 hover:text-stone-900 transition-colors">
                <QrCodeIcon className="h-4 w-4" /> Check-in
              </a>
            </nav>

            <div className="hidden md:flex items-center gap-3">
              {isAuthenticated ? (
                <Link to={dashboardLink} className="inline-flex items-center gap-2 rounded-xl bg-primary-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-primary-700 transition-colors">
                  Tableau de bord <ArrowRightIcon className="h-4 w-4" />
                </Link>
              ) : (
                <>
                  <Link to="/login" className="text-sm font-medium text-stone-600 hover:text-stone-900 transition-colors">Connexion</Link>
                  <Link to="/register" className="inline-flex items-center gap-2 rounded-xl bg-primary-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-primary-700 hover:-translate-y-0.5 transition-all">
                    Commencer
                  </Link>
                </>
              )}
            </div>

            <button
              type="button"
              onClick={() => setMenuOpen((v) => !v)}
              className="md:hidden inline-flex items-center justify-center p-2 -mr-2 text-stone-700 hover:text-primary-600"
              aria-label="Menu" aria-expanded={menuOpen}
            >
              {menuOpen ? <XMarkIcon className="h-7 w-7" /> : <Bars3Icon className="h-7 w-7" />}
            </button>
          </div>
        </div>

        {/* Mobile menu */}
        {menuOpen && (
          <div className="md:hidden border-t border-stone-100 bg-white">
            <nav className="px-4 py-3 space-y-1 text-[15px]">
              {NAV.map((n) => (
                <Link key={n.label} to={n.to} onClick={() => setMenuOpen(false)} className="block px-3 py-2.5 rounded-lg text-stone-700 hover:bg-stone-50">{n.label}</Link>
              ))}
              <a href="/checkin/" onClick={() => setMenuOpen(false)} className="flex items-center gap-2 px-3 py-2.5 rounded-lg text-stone-700 hover:bg-stone-50">
                <QrCodeIcon className="h-5 w-5" /> Check-in
              </a>
              <div className="pt-3 mt-2 border-t border-stone-100 space-y-2">
                {isAuthenticated ? (
                  <Link to={dashboardLink} onClick={() => setMenuOpen(false)} className="block w-full text-center rounded-xl bg-primary-600 px-4 py-3 text-sm font-semibold text-white">Tableau de bord</Link>
                ) : (
                  <>
                    <Link to="/login" onClick={() => setMenuOpen(false)} className="block w-full text-center rounded-xl border border-stone-200 px-4 py-3 text-sm font-medium text-stone-700 hover:bg-stone-50">Connexion</Link>
                    <Link to="/register" onClick={() => setMenuOpen(false)} className="block w-full text-center rounded-xl bg-primary-600 px-4 py-3 text-sm font-semibold text-white">Commencer</Link>
                  </>
                )}
              </div>
            </nav>
          </div>
        )}
      </header>

      {/* Main */}
      <main className="flex-1">
        <Outlet />
      </main>

      {/* ================= FOOTER ================= */}
      <footer className="bg-stone-900 text-stone-300">
        <div className="max-w-7xl mx-auto px-5 sm:px-8 py-16">
          <div className="grid grid-cols-1 md:grid-cols-12 gap-10">
            {/* Brand */}
            <div className="md:col-span-5">
              <Brand dark />
              <p className="mt-4 text-sm leading-relaxed text-stone-400 max-w-sm">
                La solution complète pour créer et gérer vos invitations digitales —
                QR par invité, suivi RSVP en temps réel et paiement Mobile Money.
              </p>
              <Link to="/register" className="mt-6 inline-flex items-center gap-2 rounded-xl bg-primary-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-primary-500 transition-colors">
                Commencer gratuitement <ArrowRightIcon className="h-4 w-4" />
              </Link>
            </div>

            <div className="md:col-span-3">
              <h3 className="text-xs font-semibold uppercase tracking-[.18em] text-stone-500 mb-4">Produit</h3>
              <ul className="space-y-2.5 text-sm">
                <li><Link to="/#fonctionnalites" className="text-stone-400 hover:text-white transition-colors">Fonctionnalités</Link></li>
                <li><Link to="/marketplace" className="text-stone-400 hover:text-white transition-colors">Modèles</Link></li>
                <li><a href="/checkin/" className="text-stone-400 hover:text-white transition-colors">App Check-in</a></li>
              </ul>
            </div>

            <div className="md:col-span-4">
              <h3 className="text-xs font-semibold uppercase tracking-[.18em] text-stone-500 mb-4">Support</h3>
              <ul className="space-y-2.5 text-sm">
                {contactEmail && <li><a href={`mailto:${contactEmail}`} className="text-stone-400 hover:text-white transition-colors">{contactEmail}</a></li>}
                {supportPhone && <li><a href={`tel:${supportPhone}`} className="text-stone-400 hover:text-white transition-colors">{supportPhone}</a></li>}
                <li><Link to="/#contact" className="text-stone-400 hover:text-white transition-colors">Nous contacter</Link></li>
              </ul>
            </div>
          </div>

          <div className="border-t border-stone-800 mt-12 pt-8 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-stone-500">
            <p>© {new Date().getFullYear()} {siteName}. Tous droits réservés.</p>
            <p>Conçu avec soin pour vos plus beaux événements.</p>
          </div>
        </div>
      </footer>
    </div>
  )
}
