import { useQuery } from 'react-query'
import { adminAPI } from '../../services/api'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'
import {
  SignalIcon,
  EyeIcon,
  ShieldExclamationIcon,
  UsersIcon,
  ArrowPathIcon,
  CalendarDaysIcon,
  TicketIcon,
  SparklesIcon
} from '@heroicons/react/24/outline'

const roleBadge = (role, isCreator) => {
  if (role === 'ADMIN' || role === 'SUPER_ADMIN') return <span className="px-2 py-0.5 rounded-full text-xs bg-purple-100 text-purple-700">Admin</span>
  if (isCreator) return <span className="px-2 py-0.5 rounded-full text-xs bg-amber-100 text-amber-700">Créateur</span>
  return <span className="px-2 py-0.5 rounded-full text-xs bg-gray-100 text-gray-600">Client</span>
}

export default function AdminSupervision() {
  const { data, isLoading, refetch, isFetching } = useQuery(
    'admin-supervision',
    () => adminAPI.getSupervision(),
    { refetchInterval: 15000 } // live refresh every 15s
  )
  const d = data?.data || {}
  const online = d.online || { count: 0, users: [] }
  const visits = d.visits || { total: 0, today: 0, last7: [] }
  const security = d.security || { last24h: 0, total: 0, recent: [] }
  const totals = d.totals || {}

  const maxDay = Math.max(1, ...(visits.last7 || []).map(v => v.count))

  const stat = (icon, label, value, sub, color) => (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-gray-500">{label}</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">{value}</p>
          {sub && <p className="text-xs text-gray-400 mt-0.5">{sub}</p>}
        </div>
        <div className={`h-11 w-11 rounded-xl flex items-center justify-center ${color}`}>{icon}</div>
      </div>
    </div>
  )

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-serif font-bold text-gray-900">Supervision</h1>
          <p className="text-gray-500 text-sm">Activité en direct, visites et sécurité</p>
        </div>
        <button onClick={() => refetch()} className="btn-secondary btn-sm inline-flex items-center gap-1">
          <ArrowPathIcon className={`h-4 w-4 ${isFetching ? 'animate-spin' : ''}`} /> Actualiser
        </button>
      </div>

      {isLoading ? (
        <div className="text-center py-16 text-gray-400">Chargement…</div>
      ) : (
        <>
          {/* Top stats */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {stat(<SignalIcon className="h-6 w-6 text-green-600" />, 'En ligne maintenant', online.count, 'utilisateurs connectés', 'bg-green-50')}
            {stat(<EyeIcon className="h-6 w-6 text-sky-600" />, "Visites aujourd'hui", visits.today, `${visits.total} au total`, 'bg-sky-50')}
            {stat(<ShieldExclamationIcon className="h-6 w-6 text-red-600" />, 'Tentatives (24h)', security.last24h, `${security.total} enregistrées`, 'bg-red-50')}
            {stat(<UsersIcon className="h-6 w-6 text-primary-600" />, 'Utilisateurs', totals.users ?? '—', `${totals.creators ?? 0} créateurs`, 'bg-primary-50')}
          </div>

          {/* Secondary totals */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {stat(<CalendarDaysIcon className="h-6 w-6 text-rose-600" />, 'Événements', totals.weddings ?? '—', null, 'bg-rose-50')}
            {stat(<TicketIcon className="h-6 w-6 text-amber-600" />, 'Invitations', totals.invitations ?? '—', null, 'bg-amber-50')}
            {stat(<SparklesIcon className="h-6 w-6 text-fuchsia-600" />, 'Créateurs', totals.creators ?? '—', null, 'bg-fuchsia-50')}
            {stat(<EyeIcon className="h-6 w-6 text-gray-600" />, 'Visites totales', visits.total, null, 'bg-gray-50')}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Visits chart (7 days) */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
              <h2 className="font-semibold text-gray-800 mb-4">Visites — 7 derniers jours</h2>
              <div className="flex items-end gap-2 h-40">
                {(visits.last7 || []).map((v) => (
                  <div key={v.date} className="flex-1 flex flex-col items-center justify-end">
                    <div className="w-full rounded-t-lg bg-gradient-to-t from-primary-500 to-primary-300" style={{ height: `${Math.round((v.count / maxDay) * 100)}%`, minHeight: v.count ? 6 : 2 }} title={`${v.count} visites`} />
                    <span className="text-[10px] text-gray-400 mt-1">{format(new Date(v.date), 'EEE', { locale: fr })}</span>
                    <span className="text-[10px] font-semibold text-gray-600">{v.count}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Online users list */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
              <h2 className="font-semibold text-gray-800 mb-4 flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-green-500 animate-pulse" /> Connectés ({online.count})
              </h2>
              {online.users.length === 0 ? (
                <p className="text-sm text-gray-400 py-6 text-center">Personne en ligne pour le moment.</p>
              ) : (
                <ul className="divide-y divide-gray-100 max-h-64 overflow-y-auto">
                  {online.users.map((u) => (
                    <li key={u.id} className="flex items-center gap-3 py-2">
                      <div className="h-9 w-9 rounded-full bg-primary-100 text-primary-700 flex items-center justify-center font-medium text-sm">
                        {(u.firstName?.[0] || '') + (u.lastName?.[0] || '')}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate">{u.firstName} {u.lastName}</p>
                        <p className="text-xs text-gray-400 truncate">{u.email}</p>
                      </div>
                      {roleBadge(u.role, u.isCreator)}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>

          {/* Security events */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
            <h2 className="font-semibold text-gray-800 mb-4 flex items-center gap-2">
              <ShieldExclamationIcon className="h-5 w-5 text-red-500" /> Journal de sécurité — tentatives de connexion échouées
            </h2>
            {security.recent.length === 0 ? (
              <p className="text-sm text-gray-400 py-6 text-center">Aucune tentative suspecte enregistrée.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-gray-400 border-b">
                      <th className="py-2 pr-4 font-medium">Quand</th>
                      <th className="py-2 pr-4 font-medium">Email tenté</th>
                      <th className="py-2 pr-4 font-medium">Raison</th>
                      <th className="py-2 pr-4 font-medium">IP</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {security.recent.map((e, i) => (
                      <tr key={i} className="text-gray-700">
                        <td className="py-2 pr-4 whitespace-nowrap text-gray-500">{e.at ? format(new Date(e.at), 'd MMM HH:mm', { locale: fr }) : '—'}</td>
                        <td className="py-2 pr-4 font-mono text-xs">{e.email || '—'}</td>
                        <td className="py-2 pr-4">
                          <span className="px-2 py-0.5 rounded-full text-xs bg-red-50 text-red-600">
                            {e.reason === 'unknown_email' ? 'Email inconnu' : e.reason === 'bad_password' ? 'Mot de passe' : (e.type || 'Échec')}
                          </span>
                        </td>
                        <td className="py-2 pr-4 font-mono text-xs text-gray-500">{e.ip || '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  )
}
