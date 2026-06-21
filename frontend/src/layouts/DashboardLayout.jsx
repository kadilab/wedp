import { useState, useEffect, useRef } from 'react'
import { Outlet, NavLink, useNavigate, useLocation } from 'react-router-dom'
import { useQuery } from 'react-query'
import { useAuthStore } from '../stores/authStore'
import useSiteSettingsStore from '../stores/siteSettingsStore'
import { adminAPI } from '../services/api'
import NotificationDropdown from '../components/notifications/NotificationDropdown'
import {
  HomeIcon,
  HeartIcon,
  UserGroupIcon,
  TicketIcon,
  SwatchIcon,
  CreditCardIcon,
  UserCircleIcon,
  ArrowRightOnRectangleIcon,
  Bars3Icon,
  XMarkIcon,
  ChartBarIcon,
  UsersIcon,
  CogIcon,
  TagIcon,
  PrinterIcon,
  ShieldCheckIcon,
  ArrowsRightLeftIcon,
  ChevronDownIcon
} from '@heroicons/react/24/outline'

const clientNavSections = [
  {
    label: 'Général',
    items: [
      { name: 'Tableau de bord', href: '/dashboard', icon: HomeIcon },
      { name: 'Mes événements', href: '/weddings', icon: HeartIcon },
    ]
  },
  {
    label: 'Outils',
    items: [
      { name: 'Templates', href: '/templates', icon: SwatchIcon },
      { name: 'Paiements', href: '/payments', icon: CreditCardIcon },
      { name: 'Impressions', href: '/print-orders', icon: PrinterIcon },
    ]
  }
]

const adminNavSections = [
  {
    label: 'Vue d\'ensemble',
    items: [
      { name: 'Dashboard', href: '/admin', icon: ChartBarIcon },
    ]
  },
  {
    label: 'Gestion',
    items: [
      { name: 'Utilisateurs', href: '/admin/users', icon: UsersIcon },
      { name: 'Mariages', href: '/admin/weddings', icon: HeartIcon },
      { name: 'Achats invitations', href: '/admin/invitation-orders', icon: TicketIcon, badgeKey: 'pendingInvitationOrders' },
      { name: 'Impressions', href: '/admin/print-orders', icon: PrinterIcon },
    ]
  },
  {
    label: 'Catalogue',
    items: [
      { name: 'Templates', href: '/admin/templates', icon: SwatchIcon },
      { name: 'Coupons', href: '/admin/coupons', icon: TagIcon },
    ]
  },
  {
    label: 'Configuration',
    items: [
      { name: 'Paramètres', href: '/admin/settings', icon: CogIcon },
    ]
  }
]

export default function DashboardLayout({ isAdmin = false }) {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [userMenuOpen, setUserMenuOpen] = useState(false)
  const userMenuRef = useRef(null)
  const { user, logout } = useAuthStore()
  const { siteName, siteLogo, logoHeight } = useSiteSettingsStore()
  const navigate = useNavigate()
  const location = useLocation()

  const navSections = isAdmin ? adminNavSections : clientNavSections

  const { data: dashStatsData } = useQuery(
    'admin-stats',
    () => adminAPI.getStats(),
    { enabled: isAdmin, refetchInterval: 60000 }
  )
  const navBadges = {
    pendingInvitationOrders: dashStatsData?.data?.stats?.pendingInvitationOrders || 0
  }

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  // Close sidebar/user menu on route change
  useEffect(() => {
    setSidebarOpen(false)
    setUserMenuOpen(false)
  }, [location.pathname])

  // Close user menu on outside click
  useEffect(() => {
    function handleClickOutside(event) {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target)) {
        setUserMenuOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Mobile sidebar backdrop */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 w-64 bg-white shadow-xl transform transition-transform duration-300 lg:translate-x-0 ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex flex-col h-full">
          {/* Logo */}
          <div className="flex items-center justify-between h-16 px-6 border-b">
            <a href="/" className="flex items-center space-x-2">
              {siteLogo ? (
                <img src={siteLogo} alt={siteName} style={{ height: `${logoHeight}px` }} className="object-contain" />
              ) : (
                <HeartIcon className="h-8 w-8 text-primary-600" />
              )}
              <span className="text-xl font-serif font-bold text-gray-900">
                {siteName?.replace(' Pro', '') || 'WeddingInvite'}
              </span>
            </a>
            <button
              onClick={() => setSidebarOpen(false)}
              className="lg:hidden text-gray-500 hover:text-gray-700"
            >
              <XMarkIcon className="h-6 w-6" />
            </button>
          </div>

          {/* User info */}
          <button
            onClick={() => navigate('/profile')}
            className="px-6 py-4 border-b bg-gradient-wedding text-left hover:brightness-95 transition-all"
          >
            <div className="flex items-center space-x-3">
              {user?.avatar ? (
                <img
                  src={user.avatar}
                  alt="Avatar"
                  className="w-10 h-10 rounded-full object-cover ring-2 ring-primary-200"
                />
              ) : (
                <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                  (user?.role === 'ADMIN' || user?.role === 'SUPER_ADMIN') 
                    ? 'bg-red-100' 
                    : 'bg-primary-100'
                }`}>
                  {(user?.role === 'ADMIN' || user?.role === 'SUPER_ADMIN') ? (
                    <ShieldCheckIcon className="h-6 w-6 text-red-600" />
                  ) : (
                    <span className="text-primary-600 font-semibold">
                      {user?.firstName?.[0]}{user?.lastName?.[0]}
                    </span>
                  )}
                </div>
              )}
              <div>
                <p className="font-medium text-gray-900">
                  {user?.firstName} {user?.lastName}
                </p>
                <p className="text-sm text-gray-500">{user?.email}</p>
              </div>
            </div>
            <div className="mt-3 flex items-center gap-2">
              {(user?.role === 'ADMIN' || user?.role === 'SUPER_ADMIN') && (
                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold bg-red-100 text-red-700 border border-red-200">
                  <ShieldCheckIcon className="h-3 w-3 mr-1" />
                  {user?.role === 'SUPER_ADMIN' ? 'Super Admin' : 'Admin'}
                </span>
              )}
            </div>
          </button>

          {/* Navigation */}
          <nav className="flex-1 px-3 py-2 overflow-y-auto">
            {navSections.map((section) => (
              <div key={section.label} className="mb-2">
                <p className="sidebar-section-label">{section.label}</p>
                <div className="space-y-1">
                  {section.items.map((item) => {
                    const badgeCount = item.badgeKey ? navBadges[item.badgeKey] : 0
                    return (
                      <NavLink
                        key={item.name}
                        to={item.href}
                        className={({ isActive }) =>
                          `sidebar-link justify-between ${isActive ? 'sidebar-link-active' : ''}`
                        }
                      >
                        <span className="flex items-center">
                          <item.icon className="h-5 w-5 mr-3" />
                          {item.name}
                        </span>
                        {badgeCount > 0 && (
                          <span className="ml-2 inline-flex items-center justify-center min-w-[1.25rem] h-5 px-1.5 rounded-full bg-red-500 text-white text-xs font-bold animate-pulse">
                            {badgeCount}
                          </span>
                        )}
                      </NavLink>
                    )
                  })}
                </div>
              </div>
            ))}
          </nav>

          {/* Admin/Client Switch + Logout */}
          <div className="p-4 border-t space-y-1">
            {(user?.role === 'ADMIN' || user?.role === 'SUPER_ADMIN') && (
              <NavLink
                to={isAdmin ? '/weddings' : '/admin'}
                className="sidebar-link w-full text-indigo-600 hover:bg-indigo-50 hover:text-indigo-700 font-medium"
              >
                <ArrowsRightLeftIcon className="h-5 w-5 mr-3" />
                {isAdmin ? 'Espace Client' : 'Espace Admin'}
              </NavLink>
            )}
            <button
              onClick={handleLogout}
              className="sidebar-link w-full text-red-600 hover:bg-red-50 hover:text-red-700"
            >
              <ArrowRightOnRectangleIcon className="h-5 w-5 mr-3" />
              Déconnexion
            </button>
          </div>
        </div>
      </aside>

      {/* Main content */}
      <div className="lg:pl-64">
        {/* Top bar */}
        <header className="sticky top-0 z-30 h-16 bg-white shadow-sm flex items-center justify-between px-4 lg:px-8">
          <button
            onClick={() => setSidebarOpen(true)}
            className="lg:hidden text-gray-500 hover:text-gray-700"
          >
            <Bars3Icon className="h-6 w-6" />
          </button>

          <div className="flex-1 lg:flex-none">
            {/* Search could go here */}
          </div>

          <div className="flex items-center space-x-4">
            {/* Notifications */}
            <NotificationDropdown />

            {/* User menu */}
            <div className="relative" ref={userMenuRef}>
              <button
                onClick={() => setUserMenuOpen((open) => !open)}
                className="flex items-center space-x-2 px-2 py-1.5 rounded-lg hover:bg-gray-100 transition-colors"
              >
                {user?.avatar ? (
                  <img
                    src={user.avatar}
                    alt="Avatar"
                    className="w-8 h-8 rounded-full object-cover ring-2 ring-primary-200"
                  />
                ) : (
                  <div className="w-8 h-8 rounded-full bg-primary-100 flex items-center justify-center">
                    <span className="text-primary-600 text-sm font-medium">
                      {user?.firstName?.[0]}{user?.lastName?.[0]}
                    </span>
                  </div>
                )}
                <span className="hidden lg:block text-sm text-gray-700 font-medium">
                  {user?.firstName} {user?.lastName}
                </span>
                <ChevronDownIcon
                  className={`hidden lg:block h-4 w-4 text-gray-400 transition-transform ${
                    userMenuOpen ? 'rotate-180' : ''
                  }`}
                />
              </button>

              {userMenuOpen && (
                <div className="absolute right-0 mt-2 w-56 bg-white rounded-xl shadow-2xl border border-gray-100 z-50 overflow-hidden">
                  <div className="px-4 py-3 border-b bg-gray-50">
                    <p className="text-sm font-medium text-gray-900 truncate">
                      {user?.firstName} {user?.lastName}
                    </p>
                    <p className="text-xs text-gray-500 truncate">{user?.email}</p>
                  </div>
                  <nav className="py-1">
                    <button
                      onClick={() => {
                        navigate('/profile')
                        setUserMenuOpen(false)
                      }}
                      className="w-full flex items-center px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                    >
                      <UserCircleIcon className="h-5 w-5 mr-3 text-gray-400" />
                      Mon profil
                    </button>
                    <button
                      onClick={handleLogout}
                      className="w-full flex items-center px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 transition-colors"
                    >
                      <ArrowRightOnRectangleIcon className="h-5 w-5 mr-3" />
                      Déconnexion
                    </button>
                  </nav>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className="p-4 lg:p-8">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
