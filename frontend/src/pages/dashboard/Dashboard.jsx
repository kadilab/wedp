import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useQuery, useQueryClient } from 'react-query'
import { userAPI, weddingAPI } from '../../services/api'
import { useAuthStore } from '../../stores/authStore'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'
import CreatorOnboarding from '../../components/CreatorOnboarding'
import {
  HeartIcon,
  UserGroupIcon,
  CheckCircleIcon,
  TicketIcon,
  PlusIcon,
  ArrowRightIcon,
  SparklesIcon
} from '@heroicons/react/24/outline'

export default function Dashboard() {
  const { user, updateUser } = useAuthStore()
  const [showCreatorModal, setShowCreatorModal] = useState(false)
  const queryClient = useQueryClient()

  const handleCreatorSuccess = () => {
    // Update user state
    updateUser({ isCreator: true })
    // Invalidate queries to force refresh
    queryClient.invalidateQueries('userStats')
    setShowCreatorModal(false)
  }

  const { data: statsData, isLoading: statsLoading } = useQuery(
    'userStats',
    userAPI.getStats
  )

  const { data: weddingsData, isLoading: weddingsLoading } = useQuery(
    ['weddings', { limit: 3 }],
    () => weddingAPI.getAll({ limit: 3 })
  )

  const stats = statsData?.data?.stats
  const weddings = weddingsData?.data?.weddings || []

  const statCards = [
    {
      name: 'Événements',
      value: stats?.weddings || 0,
      limit: stats?.limits?.weddingsMax,
      icon: HeartIcon,
      color: 'primary',
      href: '/weddings'
    },
    {
      name: 'Invités totaux',
      value: stats?.totalGuests || 0,
      limit: stats?.limits?.guestsMax,
      icon: UserGroupIcon,
      color: 'blue',
      href: '/weddings'
    },
    {
      name: 'Confirmés',
      value: stats?.confirmedGuests || 0,
      icon: CheckCircleIcon,
      color: 'green',
      href: '/weddings'
    },
    {
      name: 'Check-ins',
      value: stats?.checkedIn || 0,
      icon: TicketIcon,
      color: 'gold',
      href: '/weddings'
    }
  ]

  const colorClasses = {
    primary: 'bg-primary-100 text-primary-600',
    blue: 'bg-blue-100 text-blue-600',
    green: 'bg-green-100 text-green-600',
    gold: 'bg-gold-100 text-gold-600'
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-serif font-bold text-gray-900">
            Bonjour, {user?.firstName} !
          </h1>
          <p className="text-gray-600 mt-1">
            Bienvenue sur votre tableau de bord
          </p>
        </div>
        <Link to="/weddings/new" className="btn-primary mt-4 sm:mt-0">
          <PlusIcon className="h-5 w-5 mr-2" />
          Nouvel événement
        </Link>
      </div>

      {/* Creator CTA - Show if user is not a creator */}
      {!user?.isCreator && (
        <div className="bg-gradient-to-r from-primary-500 to-primary-600 rounded-xl shadow-lg p-6 text-white">
          <div className="flex items-start justify-between">
            <div className="flex items-start space-x-4">
              <SparklesIcon className="h-8 w-8 flex-shrink-0 mt-1" />
              <div>
                <h3 className="text-xl font-serif font-bold mb-2">
                  Devenez créateur
                </h3>
                <p className="text-primary-100 mb-4">
                  Partagez vos superbes modèles d'invitations et gagnez des commissions à chaque utilisation
                </p>
                <button
                  onClick={() => setShowCreatorModal(true)}
                  className="bg-white text-primary-600 px-6 py-2 rounded-lg font-medium hover:bg-primary-50 transition-colors"
                >
                  Commencer maintenant
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Creator Dashboard Link - Show if user is a creator */}
      {user?.isCreator && (
        <div className="flex justify-between items-center bg-primary-50 rounded-xl p-4 border border-primary-200">
          <div>
            <h3 className="font-medium text-primary-900">Vous êtes créateur ✨</h3>
            <p className="text-sm text-primary-700">Gérez vos modèles et vos gains</p>
          </div>
          <Link to="/creator-dashboard" className="btn-primary">
            Tableau de bord créateur
          </Link>
        </div>
      )}

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {statCards.map((stat) => (
          <Link
            key={stat.name}
            to={stat.href}
            className="stat-card hover:shadow-lg transition-shadow"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="stat-value">{stat.value}</p>
                <p className="stat-label">
                  {stat.name}
                  {stat.limit && (
                    <span className="text-gray-400"> / {stat.limit}</span>
                  )}
                </p>
              </div>
              <div className={`p-3 rounded-xl ${colorClasses[stat.color]}`}>
                <stat.icon className="h-6 w-6" />
              </div>
            </div>
          </Link>
        ))}
      </div>

      {/* Recent Weddings */}
      <div className="bg-white rounded-xl shadow-lg overflow-hidden">
        <div className="p-6 border-b flex items-center justify-between">
          <h2 className="text-xl font-serif font-bold text-gray-900">
            Événements récents
          </h2>
          <Link to="/weddings" className="link flex items-center text-sm">
            Voir tout <ArrowRightIcon className="h-4 w-4 ml-1" />
          </Link>
        </div>

        {weddingsLoading ? (
          <div className="p-12 text-center text-gray-500">
            Chargement...
          </div>
        ) : weddings.length === 0 ? (
          <div className="p-12 text-center">
            <HeartIcon className="h-12 w-12 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              Aucun événement pour le moment
            </h3>
            <p className="text-gray-500 mb-4">
              Créez votre premier événement pour commencer
            </p>
            <Link to="/weddings/new" className="btn-primary">
              <PlusIcon className="h-5 w-5 mr-2" />
              Créer un événement
            </Link>
          </div>
        ) : (
          <div className="divide-y">
            {weddings.map((wedding) => (
              <Link
                key={wedding.id}
                to={`/weddings/${wedding.id}`}
                className="flex items-center justify-between p-6 hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-center space-x-4">
                  <div className="w-12 h-12 rounded-full bg-primary-100 flex items-center justify-center">
                    <HeartIcon className="h-6 w-6 text-primary-600" />
                  </div>
                  <div>
                    <h3 className="font-medium text-gray-900">
                      {(!wedding.eventType || wedding.eventType === 'WEDDING')
                        ? `${wedding.brideName} & ${wedding.groomName}`
                        : (wedding.eventTitle || 'Événement')}
                    </h3>
                    <p className="text-sm text-gray-500">
                      {format(new Date(wedding.weddingDate), 'd MMMM yyyy', { locale: fr })}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <span className={`badge ${
                    wedding.status === 'ACTIVE' ? 'badge-success' :
                    wedding.status === 'DRAFT' ? 'badge-warning' :
                    'badge-info'
                  }`}>
                    {wedding.status === 'ACTIVE' ? 'Actif' :
                     wedding.status === 'DRAFT' ? 'Brouillon' :
                     wedding.status}
                  </span>
                  <p className="text-sm text-gray-500 mt-1">
                    {wedding._count?.guests || 0} invités
                  </p>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Link
          to="/weddings/new"
          className="card-hover p-6 flex items-center space-x-4"
        >
          <div className="p-3 bg-primary-100 rounded-xl">
            <PlusIcon className="h-6 w-6 text-primary-600" />
          </div>
          <div>
            <h3 className="font-medium text-gray-900">Créer un événement</h3>
            <p className="text-sm text-gray-500">Nouveau projet d'invitation</p>
          </div>
        </Link>

        <Link
          to="/templates"
          className="card-hover p-6 flex items-center space-x-4"
        >
          <div className="p-3 bg-gold-100 rounded-xl">
            <svg className="h-6 w-6 text-gold-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 5a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM4 13a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H5a1 1 0 01-1-1v-6zM16 13a1 1 0 011-1h2a1 1 0 011 1v6a1 1 0 01-1 1h-2a1 1 0 01-1-1v-6z" />
            </svg>
          </div>
          <div>
            <h3 className="font-medium text-gray-900">Explorer les templates</h3>
            <p className="text-sm text-gray-500">Designs élégants disponibles</p>
          </div>
        </Link>

        <Link
          to="/payments"
          className="card-hover p-6 flex items-center space-x-4"
        >
          <div className="p-3 bg-green-100 rounded-xl">
            <svg className="h-6 w-6 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
            </svg>
          </div>
          <div>
            <h3 className="font-medium text-gray-900">Gérer mon plan</h3>
            <p className="text-sm text-gray-500">Paiements et abonnement</p>
          </div>
        </Link>
      </div>

      {/* Creator Onboarding Modal */}
      <CreatorOnboarding
        isOpen={showCreatorModal}
        onClose={() => setShowCreatorModal(false)}
        onSuccess={handleCreatorSuccess}
      />
    </div>
  )
}
