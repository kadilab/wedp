import { useEffect, useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import toast from 'react-hot-toast'
import { HeartIcon, ArrowRightOnRectangleIcon, WifiIcon, SignalSlashIcon, ChevronRightIcon } from '@heroicons/react/24/outline'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'
import { weddingAPI } from '../services/api'
import { useAuthStore } from '../stores/authStore'
import { getMeta } from '../services/db'
import useOnlineStatus from '../hooks/useOnlineStatus'

export default function Dashboard() {
  const { user, logout } = useAuthStore()
  const navigate = useNavigate()
  const isOnline = useOnlineStatus()
  const [weddings, setWeddings] = useState([])
  const [downloaded, setDownloaded] = useState({})
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cached = []
    try {
      cached = JSON.parse(localStorage.getItem('checkin-weddings-cache') || '[]')
    } catch {
      cached = []
    }
    setWeddings(cached)

    if (isOnline) {
      weddingAPI.getAll({ limit: 100 })
        .then(({ data }) => {
          const list = data.weddings || []
          setWeddings(list)
          localStorage.setItem('checkin-weddings-cache', JSON.stringify(list))
        })
        .catch(() => {
          if (cached.length === 0) toast.error('Impossible de charger vos mariages')
        })
        .finally(() => setLoading(false))
    } else {
      setLoading(false)
      if (cached.length === 0) toast.error('Hors-ligne et aucun mariage en cache')
    }
  }, [isOnline])

  // Check which weddings already have a downloaded guest manifest
  useEffect(() => {
    (async () => {
      const result = {}
      for (const w of weddings) {
        const meta = await getMeta(w.id)
        if (meta) result[w.id] = meta
      }
      setDownloaded(result)
    })()
  }, [weddings])

  return (
    <div className="min-h-screen bg-gray-50 safe-top safe-bottom">
      <header className="bg-white shadow-sm px-4 py-4 flex items-center justify-between sticky top-0 z-10">
        <div className="flex items-center gap-2">
          <HeartIcon className="h-7 w-7 text-primary-600" />
          <div>
            <h1 className="font-serif font-bold text-gray-900 leading-none">Check-in</h1>
            <p className="text-xs text-gray-400">{user?.firstName} {user?.lastName}</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {isOnline ? (
            <WifiIcon className="h-5 w-5 text-green-500" title="En ligne" />
          ) : (
            <SignalSlashIcon className="h-5 w-5 text-amber-500" title="Hors-ligne" />
          )}
          <button onClick={logout} className="p-2 text-gray-400 hover:text-red-600">
            <ArrowRightOnRectangleIcon className="h-5 w-5" />
          </button>
        </div>
      </header>

      <main className="p-4 space-y-3">
        {!isOnline && (
          <div className="rounded-lg bg-amber-50 border border-amber-200 px-4 py-2.5 text-sm text-amber-700">
            Mode hors-ligne — seuls les mariages déjà téléchargés sont utilisables pour le check-in.
          </div>
        )}

        {loading && <p className="text-center text-gray-400 py-12">Chargement...</p>}

        {!loading && weddings.length === 0 && (
          <div className="text-center py-16 text-gray-400">
            <HeartIcon className="h-12 w-12 mx-auto mb-3 opacity-30" />
            <p>Aucun mariage trouvé</p>
          </div>
        )}

        {weddings.map((w) => {
          const meta = downloaded[w.id]
          return (
            <Link
              key={w.id}
              to={`/weddings/${w.id}`}
              className="card p-4 flex items-center justify-between active:scale-[0.99] transition-transform"
            >
              <div>
                <p className="font-semibold text-gray-900">{w.brideName} & {w.groomName}</p>
                <p className="text-sm text-gray-500">
                  {w.weddingDate && format(new Date(w.weddingDate), 'd MMMM yyyy', { locale: fr })}
                </p>
                {meta ? (
                  <span className="badge-success mt-2">{meta.guestCount} invités téléchargés</span>
                ) : (
                  <span className="badge-warning mt-2">Pas encore téléchargé</span>
                )}
              </div>
              <ChevronRightIcon className="h-5 w-5 text-gray-300 flex-shrink-0" />
            </Link>
          )
        })}
      </main>
    </div>
  )
}
