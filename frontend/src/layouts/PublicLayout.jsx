import { useEffect, useState } from 'react'
import { Outlet, Link } from 'react-router-dom'
import { HeartIcon } from '@heroicons/react/24/solid'
import { QrCodeIcon, Bars3Icon, XMarkIcon } from '@heroicons/react/24/outline'
import api from '../services/api'
import { useAuthStore } from '../stores/authStore'
import useSiteSettingsStore from '../stores/siteSettingsStore'

export default function PublicLayout() {
  const { isAuthenticated, user } = useAuthStore()
  const { siteName, siteLogo, logoHeight, contactEmail, supportPhone } = useSiteSettingsStore()
  const [menuOpen, setMenuOpen] = useState(false)

  // Count a visit once per browser session (non-blocking).
  useEffect(() => {
    if (sessionStorage.getItem('visit-tracked')) return
    sessionStorage.setItem('visit-tracked', '1')
    api.post('/public/track-visit').catch(() => {})
  }, [])

  const dashboardLink = user?.role === 'ADMIN' || user?.role === 'SUPER_ADMIN' ? '/admin' : '/dashboard'

  return (
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <header className="bg-white shadow-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Logo */}
            <Link to="/" className="flex items-center space-x-2">
              {siteLogo ? (
                <img src={siteLogo} alt={siteName} style={{ height: `${logoHeight}px` }} className="object-contain" />
              ) : (
                <HeartIcon className="h-8 w-8 text-primary-600" />
              )}
              <span className="text-xl font-serif font-bold text-gray-900">
                {siteName}
              </span>
            </Link>

            {/* Navigation */}
            <nav className="hidden md:flex items-center space-x-8">
              <Link to="/" className="text-gray-600 hover:text-primary-600 transition-colors">
                Accueil
              </Link>
              <a href="#features" className="text-gray-600 hover:text-primary-600 transition-colors">
                Fonctionnalités
              </a>
              <a href="#contact" className="text-gray-600 hover:text-primary-600 transition-colors">
                Contact
              </a>
              <a href="/checkin/" className="inline-flex items-center gap-1 text-gray-600 hover:text-primary-600 transition-colors">
                <QrCodeIcon className="h-4 w-4" /> Check-in
              </a>
            </nav>

            {/* Auth buttons (desktop) */}
            <div className="hidden md:flex items-center space-x-4">
              {isAuthenticated ? (
                <Link to={dashboardLink} className="btn-primary">
                  Tableau de bord
                </Link>
              ) : (
                <>
                  <Link
                    to="/login"
                    className="text-gray-600 hover:text-primary-600 font-medium"
                  >
                    Connexion
                  </Link>
                  <Link to="/register" className="btn-primary">
                    Commencer
                  </Link>
                </>
              )}
            </div>

            {/* Mobile menu toggle */}
            <button
              type="button"
              onClick={() => setMenuOpen((v) => !v)}
              className="md:hidden inline-flex items-center justify-center p-2 -mr-2 text-gray-600 hover:text-primary-600"
              aria-label="Menu"
              aria-expanded={menuOpen}
            >
              {menuOpen ? <XMarkIcon className="h-7 w-7" /> : <Bars3Icon className="h-7 w-7" />}
            </button>
          </div>
        </div>

        {/* Mobile menu panel */}
        {menuOpen && (
          <div className="md:hidden border-t border-gray-100 bg-white">
            <nav className="px-4 py-3 space-y-1">
              <Link to="/" onClick={() => setMenuOpen(false)} className="block px-3 py-2.5 rounded-lg text-gray-700 hover:bg-gray-50">
                Accueil
              </Link>
              <a href="#features" onClick={() => setMenuOpen(false)} className="block px-3 py-2.5 rounded-lg text-gray-700 hover:bg-gray-50">
                Fonctionnalités
              </a>
              <a href="#contact" onClick={() => setMenuOpen(false)} className="block px-3 py-2.5 rounded-lg text-gray-700 hover:bg-gray-50">
                Contact
              </a>
              <a href="/checkin/" onClick={() => setMenuOpen(false)} className="flex items-center gap-2 px-3 py-2.5 rounded-lg text-gray-700 hover:bg-gray-50">
                <QrCodeIcon className="h-5 w-5" /> Check-in
              </a>

              <div className="pt-3 mt-2 border-t border-gray-100 space-y-2">
                {isAuthenticated ? (
                  <Link to={dashboardLink} onClick={() => setMenuOpen(false)} className="btn-primary w-full justify-center">
                    Tableau de bord
                  </Link>
                ) : (
                  <>
                    <Link to="/login" onClick={() => setMenuOpen(false)} className="block w-full text-center px-3 py-2.5 rounded-lg border border-gray-200 text-gray-700 font-medium hover:bg-gray-50">
                      Connexion
                    </Link>
                    <Link to="/register" onClick={() => setMenuOpen(false)} className="btn-primary w-full justify-center">
                      Commencer
                    </Link>
                  </>
                )}
              </div>
            </nav>
          </div>
        )}
      </header>

      {/* Main content */}
      <main className="flex-1">
        <Outlet />
      </main>

      {/* Footer */}
      <footer className="bg-gray-900 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            {/* Brand */}
            <div className="col-span-1 md:col-span-2">
              <div className="flex items-center space-x-2 mb-4">
                {siteLogo ? (
                  <img src={siteLogo} alt={siteName} style={{ height: `${logoHeight}px` }} className="object-contain" />
                ) : (
                  <HeartIcon className="h-8 w-8 text-primary-400" />
                )}
                <span className="text-xl font-serif font-bold">{siteName}</span>
              </div>
              <p className="text-gray-400 max-w-md">
                La solution complète pour créer et gérer vos invitations de mariage numériques.
                QR codes uniques, suivi en temps réel, et bien plus encore.
              </p>
            </div>

            {/* Links */}
            <div>
              <h3 className="font-semibold mb-4">Produit</h3>
              <ul className="space-y-2 text-gray-400">
                <li><a href="#features" className="hover:text-white transition-colors">Fonctionnalités</a></li>
                <li><a href="#templates" className="hover:text-white transition-colors">Templates</a></li>
                <li><a href="/checkin/" className="hover:text-white transition-colors">App Check-in</a></li>
              </ul>
            </div>

            <div>
              <h3 className="font-semibold mb-4">Support</h3>
              <ul className="space-y-2 text-gray-400">
                {contactEmail && (
                  <li><a href={`mailto:${contactEmail}`} className="hover:text-white transition-colors">{contactEmail}</a></li>
                )}
                {supportPhone && (
                  <li><a href={`tel:${supportPhone}`} className="hover:text-white transition-colors">{supportPhone}</a></li>
                )}
                <li><a href="#contact" className="hover:text-white transition-colors">Contact</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Conditions d'utilisation</a></li>
              </ul>
            </div>
          </div>

          <div className="border-t border-gray-800 mt-12 pt-8 text-center text-gray-400 text-sm">
            <p>© {new Date().getFullYear()} {siteName}. Tous droits réservés.</p>
          </div>
        </div>
      </footer>
    </div>
  )
}
