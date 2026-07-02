import { Link, useParams, useNavigate } from 'react-router-dom'
import { useQuery } from 'react-query'
import { weddingAPI } from '../../services/api'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'
import {
  PieChart, Pie, Cell, ResponsiveContainer, Tooltip,
  AreaChart, Area, XAxis, YAxis, CartesianGrid
} from 'recharts'
import {
  ArrowLeftIcon,
  UserGroupIcon,
  EnvelopeIcon,
  QrCodeIcon,
  CheckCircleIcon,
  ClockIcon,
  XCircleIcon,
  EyeIcon,
  PaperAirplaneIcon
} from '@heroicons/react/24/outline'

const RSVP_COLORS = { confirmed: '#10b981', pending: '#f59e0b', declined: '#ef4444' }
const RSVP_LABELS = { confirmed: 'Confirmés', pending: 'En attente', declined: 'Déclinés' }

// Axis/tooltip date formatters for the activity timeline (input: 'YYYY-MM-DD').
const fmtDay = (d) => { try { return format(new Date(d), 'd MMM', { locale: fr }) } catch { return d } }
const fmtDayLong = (d) => { try { return format(new Date(d), 'EEEE d MMMM', { locale: fr }) } catch { return d } }

function StatCard({ label, value, icon: Icon, gradient, subtitle }) {
  return (
    <div className={`relative overflow-hidden rounded-2xl p-6 text-white shadow-lg ${gradient}`}>
      <div className="absolute top-0 right-0 -mt-4 -mr-4 h-24 w-24 rounded-full bg-white/10" />
      <div className="relative">
        <div className="mb-4 inline-flex rounded-xl bg-white/20 p-2.5 backdrop-blur-sm">
          <Icon className="h-6 w-6 text-white" />
        </div>
        <p className="text-3xl font-bold tracking-tight">{value}</p>
        <p className="mt-1 text-sm font-medium text-white/80">{label}</p>
        {subtitle && <p className="mt-0.5 text-xs text-white/60">{subtitle}</p>}
      </div>
    </div>
  )
}

function FunnelBar({ label, value, total, color, icon: Icon }) {
  const pct = total > 0 ? Math.round((value / total) * 100) : 0
  return (
    <div>
      <div className="flex items-center justify-between mb-1.5">
        <span className="flex items-center gap-2 text-sm text-gray-600">
          <Icon className="h-4 w-4 text-gray-400" />
          {label}
        </span>
        <span className="text-sm font-bold text-gray-900">{value} <span className="text-gray-400 font-normal">({pct}%)</span></span>
      </div>
      <div className="h-2.5 rounded-full bg-gray-100 overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{ width: `${pct}%`, backgroundColor: color }}
        />
      </div>
    </div>
  )
}

export default function WeddingStats() {
  const { id } = useParams()
  const navigate = useNavigate()

  const { data: weddingData, isLoading: weddingLoading, error: weddingError } = useQuery(
    ['wedding', id],
    () => weddingAPI.getOne(id)
  )

  const { data: statsData, isLoading: statsLoading } = useQuery(
    ['weddingStats', id],
    () => weddingAPI.getStats(id),
    { enabled: !!id }
  )

  if (weddingLoading || statsLoading) {
    return (
      <div className="text-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto"></div>
        <p className="mt-4 text-gray-600">Chargement des statistiques...</p>
      </div>
    )
  }

  if (weddingError) {
    return (
      <div className="text-center py-12">
        <p className="text-red-600">Erreur lors du chargement du mariage</p>
        <button onClick={() => navigate('/weddings')} className="btn-primary mt-4">
          Retour à la liste
        </button>
      </div>
    )
  }

  const wedding = weddingData?.data?.wedding
  const stats = statsData?.data?.stats || {}
  const rsvp = stats.rsvp || { confirmed: 0, pending: 0, declined: 0 }
  const invitations = stats.invitations || { generated: 0, sent: 0, viewed: 0 }
  const checkIns = stats.checkIns || { total: 0, unique: 0 }
  const totalGuests = stats.totalGuests || 0
  const activity = stats.activity || []

  const rsvpPieData = Object.entries(rsvp)
    .filter(([, value]) => value > 0)
    .map(([key, value]) => ({
      name: RSVP_LABELS[key] || key,
      value,
      color: RSVP_COLORS[key] || '#94a3b8'
    }))
  const totalRsvp = rsvpPieData.reduce((sum, d) => sum + d.value, 0)

  const attendanceRate = rsvp.confirmed > 0
    ? Math.round((checkIns.unique / rsvp.confirmed) * 100)
    : 0

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center space-x-4">
          <button
            onClick={() => navigate(`/weddings/${id}`)}
            className="p-2 text-gray-600 hover:text-gray-900 rounded-lg hover:bg-gray-100"
          >
            <ArrowLeftIcon className="h-5 w-5" />
          </button>
          <div>
            <h1 className="text-3xl font-serif font-bold text-gray-900">
              Statistiques · {wedding?.brideName} & {wedding?.groomName}
            </h1>
            {wedding?.weddingDate && (
              <p className="text-gray-500 mt-1">
                {format(new Date(wedding.weddingDate), 'EEEE d MMMM yyyy', { locale: fr })}
                {typeof stats.daysUntil === 'number' && (
                  <span className="ml-2 badge-info">
                    {stats.daysUntil > 0 ? `J-${stats.daysUntil}` : stats.daysUntil === 0 ? "Aujourd'hui" : 'Passé'}
                  </span>
                )}
              </p>
            )}
          </div>
        </div>
        <Link to={`/weddings/${id}/guests`} className="btn-secondary">
          Voir les invités
        </Link>
      </div>

      {/* Main Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-5">
        <StatCard
          label="Invités"
          value={totalGuests}
          icon={UserGroupIcon}
          gradient="bg-gradient-to-br from-blue-500 to-blue-700"
          subtitle={`+${stats.totalPlusOnes || 0} accompagnants`}
        />
        <StatCard
          label="Confirmés"
          value={rsvp.confirmed}
          icon={CheckCircleIcon}
          gradient="bg-gradient-to-br from-emerald-500 to-green-700"
          subtitle={totalGuests > 0 ? `${Math.round((rsvp.confirmed / totalGuests) * 100)}% des invités` : null}
        />
        <StatCard
          label="En attente"
          value={rsvp.pending}
          icon={ClockIcon}
          gradient="bg-gradient-to-br from-amber-500 to-orange-600"
        />
        <StatCard
          label="Check-ins"
          value={checkIns.unique}
          icon={QrCodeIcon}
          gradient="bg-gradient-to-br from-violet-500 to-purple-700"
          subtitle={`${attendanceRate}% des confirmés présents`}
        />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* RSVP Donut */}
        <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
          <h3 className="text-lg font-bold text-gray-900 mb-1">Réponses RSVP</h3>
          <p className="text-sm text-gray-500 mb-4">{totalRsvp} invité{totalRsvp > 1 ? 's' : ''} au total</p>
          {totalRsvp > 0 ? (
            <>
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie
                    data={rsvpPieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={55}
                    outerRadius={85}
                    paddingAngle={4}
                    dataKey="value"
                    strokeWidth={0}
                  >
                    {rsvpPieData.map((entry, i) => (
                      <Cell key={i} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(val) => [val, '']} />
                </PieChart>
              </ResponsiveContainer>
              <div className="mt-4 space-y-2">
                {rsvpPieData.map((d, i) => (
                  <div key={i} className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2">
                      <span className="h-3 w-3 rounded-full" style={{ backgroundColor: d.color }} />
                      <span className="text-gray-600">{d.name}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-gray-900">{d.value}</span>
                      <span className="text-xs text-gray-400">({Math.round(d.value / totalRsvp * 100)}%)</span>
                    </div>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <div className="flex flex-col items-center justify-center h-48 text-gray-400">
              <UserGroupIcon className="h-12 w-12 mb-2" />
              <p className="text-sm">Aucune donnée RSVP</p>
            </div>
          )}
        </div>

        {/* Invitations Funnel */}
        <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
          <h3 className="text-lg font-bold text-gray-900 mb-1">Invitations</h3>
          <p className="text-sm text-gray-500 mb-6">Du partage à la consultation</p>
          <div className="space-y-5">
            <FunnelBar
              label="Générées"
              value={invitations.generated}
              total={Math.max(invitations.generated, 1)}
              color="#6366f1"
              icon={EnvelopeIcon}
            />
            <FunnelBar
              label="Envoyées"
              value={invitations.sent}
              total={Math.max(invitations.generated, 1)}
              color="#0ea5e9"
              icon={PaperAirplaneIcon}
            />
            <FunnelBar
              label="Consultées"
              value={invitations.viewed}
              total={Math.max(invitations.generated, 1)}
              color="#10b981"
              icon={EyeIcon}
            />
          </div>
        </div>

        {/* Check-ins detail */}
        <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
          <h3 className="text-lg font-bold text-gray-900 mb-1">Check-ins le jour J</h3>
          <p className="text-sm text-gray-500 mb-6">Présence réelle des invités</p>
          <div className="grid grid-cols-2 gap-4">
            <div className="rounded-xl bg-violet-50 p-4 text-center">
              <p className="text-2xl font-bold text-violet-700">{checkIns.unique}</p>
              <p className="text-xs text-violet-500 mt-1">Invités présents</p>
            </div>
            <div className="rounded-xl bg-gray-50 p-4 text-center">
              <p className="text-2xl font-bold text-gray-700">{checkIns.total}</p>
              <p className="text-xs text-gray-500 mt-1">Scans au total</p>
            </div>
          </div>
          <div className="mt-6">
            <FunnelBar
              label="Taux de présence (vs confirmés)"
              value={checkIns.unique}
              total={Math.max(rsvp.confirmed, 1)}
              color="#8b5cf6"
              icon={QrCodeIcon}
            />
          </div>
          {rsvp.declined > 0 && (
            <p className="mt-6 flex items-center gap-2 text-sm text-gray-400">
              <XCircleIcon className="h-4 w-4" />
              {rsvp.declined} invité{rsvp.declined > 1 ? 's' : ''} ont décliné l'invitation
            </p>
          )}
        </div>
      </div>

      {/* Activity timeline — RSVP confirmations & views over time */}
      {activity.length > 1 && (
        <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
          <h3 className="text-lg font-bold text-gray-900 mb-1">Activité dans le temps</h3>
          <p className="text-sm text-gray-500 mb-4">Confirmations cumulées et consultations par jour</p>
          <ResponsiveContainer width="100%" height={260}>
            <AreaChart data={activity} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="gConfirmed" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10b981" stopOpacity={0.35} />
                  <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="gViews" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
              <XAxis dataKey="date" tickFormatter={fmtDay} tick={{ fontSize: 11, fill: '#94a3b8' }} tickLine={false} axisLine={false} minTickGap={20} />
              <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: '#94a3b8' }} tickLine={false} axisLine={false} width={40} />
              <Tooltip
                labelFormatter={fmtDayLong}
                formatter={(val, name) => [val, name === 'cumulativeConfirmed' ? 'Confirmés (cumul)' : 'Consultations']}
                contentStyle={{ borderRadius: 12, border: '1px solid #e5e7eb', fontSize: 12 }}
              />
              <Area type="monotone" dataKey="views" stroke="#6366f1" strokeWidth={2} fill="url(#gViews)" />
              <Area type="monotone" dataKey="cumulativeConfirmed" stroke="#10b981" strokeWidth={2} fill="url(#gConfirmed)" />
            </AreaChart>
          </ResponsiveContainer>
          <div className="mt-3 flex items-center gap-5 text-xs text-gray-500">
            <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full bg-emerald-500" /> Confirmés (cumul)</span>
            <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full bg-indigo-500" /> Consultations / jour</span>
          </div>
        </div>
      )}
    </div>
  )
}
