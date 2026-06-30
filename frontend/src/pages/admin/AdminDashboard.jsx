import { useQuery } from 'react-query'
import { adminAPI } from '../../services/api'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  ResponsiveContainer, XAxis, YAxis, Tooltip, CartesianGrid
} from 'recharts'
import {
  UsersIcon,
  HeartIcon,
  CurrencyDollarIcon,
  ArrowTrendingUpIcon,
  ClockIcon,
  EnvelopeIcon,
  UserGroupIcon,
  QrCodeIcon,
  PrinterIcon,
  CalendarDaysIcon,
  SparklesIcon
} from '@heroicons/react/24/outline'

const RSVP_COLORS = { CONFIRMED: '#10b981', PENDING: '#f59e0b', DECLINED: '#ef4444' }
const RSVP_LABELS = { CONFIRMED: 'Confirmé', PENDING: 'En attente', DECLINED: 'Décliné' }
const ORDER_LABELS = { APPROVED: 'Approuvée', PENDING: 'En attente', REJECTED: 'Rejetée' }
const ORDER_COLORS = { APPROVED: '#10b981', PENDING: '#f59e0b', REJECTED: '#ef4444' }

function StatCard({ label, value, icon: Icon, gradient, subtitle, badge }) {
  return (
    <div className={`relative overflow-hidden rounded-2xl p-6 text-white shadow-lg ${gradient}`}>
      <div className="absolute top-0 right-0 -mt-4 -mr-4 h-24 w-24 rounded-full bg-white/10" />
      <div className="absolute bottom-0 right-0 -mb-8 -mr-8 h-32 w-32 rounded-full bg-white/5" />
      <div className="relative">
        <div className="flex items-center justify-between mb-4">
          <div className="rounded-xl bg-white/20 p-2.5 backdrop-blur-sm">
            <Icon className="h-6 w-6 text-white" />
          </div>
          {badge && (
            <span className="flex items-center gap-1 rounded-full bg-white/20 px-2.5 py-1 text-xs font-medium backdrop-blur-sm">
              {badge}
            </span>
          )}
        </div>
        <p className="text-3xl font-bold tracking-tight">{value}</p>
        <p className="mt-1 text-sm font-medium text-white/80">{label}</p>
        {subtitle && <p className="mt-0.5 text-xs text-white/60">{subtitle}</p>}
      </div>
    </div>
  )
}

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null
  return (
    <div className="rounded-xl border border-gray-100 bg-white p-3 shadow-xl">
      <p className="mb-1.5 text-xs font-semibold text-gray-500">{label}</p>
      {payload.map((p, i) => (
        <p key={i} className="text-sm" style={{ color: p.color }}>
          <span className="font-medium">{p.name}: </span>
          <span className="font-bold">
            {p.name === 'Revenus' ? `${Number(p.value).toLocaleString('fr-FR')} FC` : p.value}
          </span>
        </p>
      ))}
    </div>
  )
}

export default function AdminDashboard() {
  const { data: statsData, isLoading } = useQuery('admin-stats', () => adminAPI.getStats())
  const { data: marketplaceData } = useQuery('marketplace-pending', () =>
    adminAPI.getMarketplaceSubmissions({ status: 'PENDING_REVIEW', limit: 1 })
  )
  const dashData = statsData?.data || {}
  const stats = dashData.stats || {}
  const monthlyData = dashData.monthlyData || []
  const rsvpStats = dashData.rsvpStats || []
  const invitationOrderStatusStats = dashData.invitationOrderStatusStats || []
  const pendingMarketplaceCount = marketplaceData?.pagination?.total || 0

  const rsvpPieData = rsvpStats.map(r => ({
    name: RSVP_LABELS[r.status] || r.status,
    value: r.count,
    color: RSVP_COLORS[r.status] || '#94a3b8'
  }))
  const totalRsvp = rsvpPieData.reduce((s, d) => s + d.value, 0)

  const orderPieData = invitationOrderStatusStats.map(r => ({
    name: ORDER_LABELS[r.status] || r.status,
    value: r.count,
    amount: r.amount,
    color: ORDER_COLORS[r.status] || '#94a3b8'
  }))

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <div className="relative mx-auto h-16 w-16">
            <div className="absolute inset-0 rounded-full border-4 border-primary-100" />
            <div className="absolute inset-0 animate-spin rounded-full border-4 border-transparent border-t-primary-600" />
          </div>
          <p className="mt-4 text-sm font-medium text-gray-500">Chargement du tableau de bord...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-8 pb-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-serif font-bold text-gray-900 flex items-center gap-3">
            <SparklesIcon className="h-8 w-8 text-primary-500" />
            Tableau de bord
          </h1>
          <p className="text-gray-500 mt-1">
            Bienvenue ! Voici un aperçu de votre plateforme.
          </p>
        </div>
        <div className="flex items-center gap-2 rounded-xl bg-primary-50 px-4 py-2 text-sm">
          <CalendarDaysIcon className="h-5 w-5 text-primary-500" />
          <span className="font-medium text-primary-700">
            Aujourd'hui: {stats.todayUsers || 0} inscr. · {stats.todayWeddings || 0} mariages · {stats.todayOrders || 0} commandes
          </span>
        </div>
      </div>

      {/* Main Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-5">
        <StatCard
          label="Utilisateurs"
          value={(stats.totalUsers || 0).toLocaleString()}
          icon={UsersIcon}
          gradient="bg-gradient-to-br from-blue-500 to-blue-700"
          subtitle={`+${stats.todayUsers || 0} aujourd'hui`}
          badge={<><ArrowTrendingUpIcon className="h-3.5 w-3.5" /> Actif</>}
        />
        <StatCard
          label="Mariages"
          value={(stats.totalWeddings || 0).toLocaleString()}
          icon={HeartIcon}
          gradient="bg-gradient-to-br from-rose-500 to-pink-700"
          subtitle={`${stats.activeWeddings || 0} actifs`}
        />
        <StatCard
          label="Revenus invitations"
          value={`${(stats.totalRevenue || 0).toLocaleString('fr-FR')} FC`}
          icon={CurrencyDollarIcon}
          gradient="bg-gradient-to-br from-emerald-500 to-green-700"
          subtitle={`${stats.approvedOrders || 0} commandes approuvées`}
        />
        <StatCard
          label="Commandes en attente"
          value={stats.pendingInvitationOrders || 0}
          icon={ClockIcon}
          gradient="bg-gradient-to-br from-amber-500 to-orange-600"
          subtitle="À valider"
          badge={stats.pendingInvitationOrders > 0 ? (
            <span className="animate-pulse">Action requise</span>
          ) : null}
        />
      </div>

      {/* Secondary Stat Row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: 'Invités', value: stats.totalGuests || 0, icon: UserGroupIcon, color: 'text-violet-600' },
          { label: 'Invitations', value: stats.totalInvitations || 0, icon: EnvelopeIcon, color: 'text-cyan-600' },
          { label: 'Check-ins', value: stats.totalCheckIns || 0, icon: QrCodeIcon, color: 'text-teal-600' },
          { label: 'Impressions', value: stats.totalPrintOrders || 0, icon: PrinterIcon, color: 'text-fuchsia-600' }
        ].map((s, i) => (
          <div key={i} className="flex items-center gap-3 rounded-xl border border-gray-100 bg-white p-4 shadow-sm hover:shadow-md transition-shadow">
            <div className={`rounded-lg p-2 ${s.color.replace('text-', 'bg-').replace('600', '50')}`}>
              <s.icon className={`h-5 w-5 ${s.color}`} />
            </div>
            <div>
              <p className="text-xl font-bold text-gray-900">{s.value.toLocaleString()}</p>
              <p className="text-xs text-gray-500">{s.label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Revenue Trend - Area Chart */}
        <div className="xl:col-span-2 rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
          <div className="mb-6 flex items-center justify-between">
            <div>
              <h3 className="text-lg font-bold text-gray-900">Tendances mensuelles</h3>
              <p className="text-sm text-gray-500">Revenus et inscriptions des 6 derniers mois</p>
            </div>
            <div className="flex items-center gap-4 text-xs">
              <span className="flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-full bg-indigo-500" /> Revenus
              </span>
              <span className="flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-full bg-rose-400" /> Mariages
              </span>
              <span className="flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-full bg-cyan-400" /> Utilisateurs
              </span>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={monthlyData}>
              <defs>
                <linearGradient id="gradRevenue" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#6366f1" stopOpacity={0.3} />
                  <stop offset="100%" stopColor="#6366f1" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="gradWeddings" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#f43f5e" stopOpacity={0.2} />
                  <stop offset="100%" stopColor="#f43f5e" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="month" tick={{ fontSize: 12, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
              <YAxis yAxisId="revenue" orientation="left" tick={{ fontSize: 12, fill: '#94a3b8' }} axisLine={false} tickLine={false} tickFormatter={v => v >= 1000 ? `${(v/1000).toFixed(0)}k` : v} />
              <YAxis yAxisId="count" orientation="right" tick={{ fontSize: 12, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
              <Tooltip content={<CustomTooltip />} />
              <Area yAxisId="revenue" type="monotone" dataKey="revenue" name="Revenus" stroke="#6366f1" strokeWidth={2.5} fill="url(#gradRevenue)" />
              <Area yAxisId="count" type="monotone" dataKey="weddings" name="Mariages" stroke="#f43f5e" strokeWidth={2} fill="url(#gradWeddings)" />
              <Area yAxisId="count" type="monotone" dataKey="users" name="Utilisateurs" stroke="#06b6d4" strokeWidth={2} fill="none" strokeDasharray="5 5" />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* RSVP Donut */}
        <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
          <h3 className="text-lg font-bold text-gray-900 mb-1">Réponses RSVP</h3>
          <p className="text-sm text-gray-500 mb-4">{totalRsvp.toLocaleString()} invités au total</p>
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
                      <span className="text-xs text-gray-400">({totalRsvp > 0 ? Math.round(d.value / totalRsvp * 100) : 0}%)</span>
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
      </div>

      {/* Payments + Monthly Bar Chart Row */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Monthly Bar Chart */}
        <div className="xl:col-span-2 rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
          <h3 className="text-lg font-bold text-gray-900 mb-1">Activité mensuelle</h3>
          <p className="text-sm text-gray-500 mb-6">Commandes d'invitations et mariages par mois</p>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={monthlyData} barGap={8}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="month" tick={{ fontSize: 12, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 12, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="weddings" name="Mariages" fill="#f43f5e" radius={[6, 6, 0, 0]} barSize={32} />
              <Bar dataKey="orders" name="Commandes" fill="#6366f1" radius={[6, 6, 0, 0]} barSize={32} />
              <Bar dataKey="users" name="Utilisateurs" fill="#06b6d4" radius={[6, 6, 0, 0]} barSize={32} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Payment Status + Quick Stats */}
        <div className="space-y-6">
          <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
            <h3 className="text-base font-bold text-gray-900 mb-4">Statut des commandes</h3>
            {orderPieData.length > 0 ? (
              <div className="space-y-3">
                {orderPieData.map((d, i) => {
                  const total = orderPieData.reduce((s, p) => s + p.value, 0)
                  const pct = total > 0 ? Math.round(d.value / total * 100) : 0
                  return (
                    <div key={i}>
                      <div className="flex items-center justify-between mb-1">
                        <div className="flex items-center gap-2">
                          <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: d.color }} />
                          <span className="text-sm text-gray-600">{d.name}</span>
                        </div>
                        <span className="text-sm font-bold text-gray-900">{d.value}</span>
                      </div>
                      <div className="h-2 rounded-full bg-gray-100 overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all duration-500"
                          style={{ width: `${pct}%`, backgroundColor: d.color }}
                        />
                      </div>
                    </div>
                  )
                })}
              </div>
            ) : (
              <p className="text-sm text-gray-400">Aucune commande</p>
            )}
          </div>

          <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
            <h3 className="text-base font-bold text-gray-900 mb-4">Actions rapides</h3>
            <div className="space-y-2">
              <a
                href="/admin/invitation-orders"
                className="flex items-center gap-3 rounded-xl bg-amber-50 p-3 text-sm font-medium text-amber-700 hover:bg-amber-100 transition-colors"
              >
                <ClockIcon className="h-5 w-5" />
                {stats.pendingInvitationOrders || 0} commandes à valider
              </a>
              <a
                href="/admin/users"
                className="flex items-center gap-3 rounded-xl bg-blue-50 p-3 text-sm font-medium text-blue-700 hover:bg-blue-100 transition-colors"
              >
                <UsersIcon className="h-5 w-5" />
                Gérer les utilisateurs
              </a>
              <a
                href="/admin/weddings"
                className="flex items-center gap-3 rounded-xl bg-rose-50 p-3 text-sm font-medium text-rose-700 hover:bg-rose-100 transition-colors"
              >
                <HeartIcon className="h-5 w-5" />
                Gérer les mariages
              </a>
              <a
                href="/admin/marketplace"
                className="flex items-center gap-3 rounded-xl bg-purple-50 p-3 text-sm font-medium text-purple-700 hover:bg-purple-100 transition-colors group relative"
              >
                <SparklesIcon className="h-5 w-5" />
                Marketplace - Approuver les templates
                {pendingMarketplaceCount > 0 && (
                  <span className="absolute top-1 right-2 inline-flex items-center justify-center h-6 w-6 rounded-full bg-red-500 text-white text-xs font-bold animate-pulse">
                    {pendingMarketplaceCount}
                  </span>
                )}
              </a>
            </div>
          </div>
        </div>

        {/* Marketplace Summary */}
        <div className="rounded-2xl border border-gray-100 bg-gradient-to-br from-purple-50 to-indigo-50 p-6 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-lg font-bold text-gray-900">Marketplace Creators</h3>
              <p className="text-sm text-gray-600 mt-1">Soumissions en attente d'approbation</p>
            </div>
            <SparklesIcon className="h-8 w-8 text-purple-600" />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="bg-white rounded-lg p-4 border border-purple-100">
              <p className="text-gray-600 text-xs font-medium mb-1">En Attente</p>
              <p className="text-2xl font-bold text-purple-600">{pendingMarketplaceCount}</p>
            </div>
            <a
              href="/admin/marketplace"
              className="bg-white rounded-lg p-4 border border-purple-100 hover:bg-purple-50 transition-colors flex flex-col justify-between cursor-pointer"
            >
              <p className="text-gray-600 text-xs font-medium">Action</p>
              <p className="text-sm font-semibold text-purple-600 mt-1">Approuver →</p>
            </a>
          </div>
        </div>
      </div>

      {/* Recent Activity */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {/* Recent Users */}
        <div className="rounded-2xl border border-gray-100 bg-white shadow-sm overflow-hidden">
          <div className="flex items-center justify-between border-b border-gray-50 px-6 py-4">
            <div className="flex items-center gap-2">
              <UsersIcon className="h-5 w-5 text-blue-500" />
              <h3 className="font-bold text-gray-900">Derniers utilisateurs</h3>
            </div>
            <a href="/admin/users" className="text-xs font-medium text-primary-600 hover:text-primary-700">
              Voir tout →
            </a>
          </div>
          <div className="divide-y divide-gray-50">
            {dashData.recentUsers?.length > 0 ? dashData.recentUsers.map((user) => (
              <div key={user.id} className="flex items-center justify-between px-6 py-3.5 hover:bg-gray-50/50 transition-colors">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-full bg-gradient-to-br from-blue-400 to-indigo-500 flex items-center justify-center shadow-sm">
                    <span className="text-sm font-bold text-white">
                      {user.firstName?.charAt(0)}{user.lastName?.charAt(0)}
                    </span>
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-gray-900">
                      {user.firstName} {user.lastName}
                    </p>
                    <p className="text-xs text-gray-400">{user.email}</p>
                  </div>
                </div>
                <span className="rounded-full bg-gray-100 px-2.5 py-1 text-xs font-medium text-gray-500">
                  {format(new Date(user.createdAt), 'd MMM yyyy', { locale: fr })}
                </span>
              </div>
            )) : (
              <p className="px-6 py-8 text-center text-sm text-gray-400">Aucun utilisateur récent</p>
            )}
          </div>
        </div>

        {/* Recent Invitation Orders */}
        <div className="rounded-2xl border border-gray-100 bg-white shadow-sm overflow-hidden">
          <div className="flex items-center justify-between border-b border-gray-50 px-6 py-4">
            <div className="flex items-center gap-2">
              <CurrencyDollarIcon className="h-5 w-5 text-emerald-500" />
              <h3 className="font-bold text-gray-900">Dernières commandes</h3>
            </div>
            <a href="/admin/invitation-orders" className="text-xs font-medium text-primary-600 hover:text-primary-700">
              Voir tout →
            </a>
          </div>
          <div className="divide-y divide-gray-50">
            {dashData.recentInvitationOrders?.length > 0 ? dashData.recentInvitationOrders.map((order) => (
              <div key={order.id} className="flex items-center justify-between px-6 py-3.5 hover:bg-gray-50/50 transition-colors">
                <div className="flex items-center gap-3">
                  <div className={`h-10 w-10 rounded-full flex items-center justify-center shadow-sm ${
                    order.status === 'APPROVED'
                      ? 'bg-gradient-to-br from-emerald-400 to-green-500'
                      : order.status === 'PENDING'
                      ? 'bg-gradient-to-br from-amber-400 to-orange-500'
                      : 'bg-gradient-to-br from-red-400 to-rose-500'
                  }`}>
                    <CurrencyDollarIcon className="h-5 w-5 text-white" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-gray-900">
                      {order.user?.firstName} {order.user?.lastName}
                    </p>
                    <p className="text-xs text-gray-400">
                      {order.wedding ? `${order.wedding.brideName} & ${order.wedding.groomName}` : '—'} · {order.quantity} invitation{order.quantity > 1 ? 's' : ''}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm font-bold text-gray-900">
                    {Number(order.totalAmount).toLocaleString('fr-FR')} FC
                  </p>
                  <span className={`inline-block mt-0.5 rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider ${
                    order.status === 'APPROVED'
                      ? 'bg-green-100 text-green-700'
                      : order.status === 'PENDING'
                      ? 'bg-amber-100 text-amber-700'
                      : 'bg-red-100 text-red-700'
                  }`}>
                    {ORDER_LABELS[order.status] || order.status}
                  </span>
                </div>
              </div>
            )) : (
              <p className="px-6 py-8 text-center text-sm text-gray-400">Aucune commande récente</p>
            )}
          </div>
        </div>
      </div>

      {/* Recent Weddings */}
      {dashData.recentWeddings?.length > 0 && (
        <div className="rounded-2xl border border-gray-100 bg-white shadow-sm overflow-hidden">
          <div className="flex items-center justify-between border-b border-gray-50 px-6 py-4">
            <div className="flex items-center gap-2">
              <HeartIcon className="h-5 w-5 text-rose-500" />
              <h3 className="font-bold text-gray-900">Derniers mariages</h3>
            </div>
            <a href="/admin/weddings" className="text-xs font-medium text-primary-600 hover:text-primary-700">
              Voir tout →
            </a>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50/50 text-left text-xs font-semibold uppercase tracking-wider text-gray-400">
                  <th className="px-6 py-3">Couple</th>
                  <th className="px-6 py-3">Date</th>
                  <th className="px-6 py-3">Invités</th>
                  <th className="px-6 py-3">Invitations</th>
                  <th className="px-6 py-3">Statut</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {dashData.recentWeddings.map((w) => (
                  <tr key={w.id} className="hover:bg-gray-50/50 transition-colors">
                    <td className="px-6 py-3.5">
                      <div className="flex items-center gap-2">
                        <HeartIcon className="h-4 w-4 text-rose-400" />
                        <span className="font-semibold text-gray-900">{w.brideName} & {w.groomName}</span>
                      </div>
                    </td>
                    <td className="px-6 py-3.5 text-gray-500">
                      {w.weddingDate ? format(new Date(w.weddingDate), 'd MMM yyyy', { locale: fr }) : '—'}
                    </td>
                    <td className="px-6 py-3.5">
                      <span className="rounded-full bg-violet-50 px-2.5 py-1 text-xs font-semibold text-violet-600">
                        {w._count?.guests || 0}
                      </span>
                    </td>
                    <td className="px-6 py-3.5">
                      <span className="rounded-full bg-cyan-50 px-2.5 py-1 text-xs font-semibold text-cyan-600">
                        {w._count?.invitations || 0}
                      </span>
                    </td>
                    <td className="px-6 py-3.5">
                      <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
                        w.status === 'ACTIVE'
                          ? 'bg-green-50 text-green-600'
                          : w.status === 'COMPLETED'
                          ? 'bg-blue-50 text-blue-600'
                          : 'bg-gray-100 text-gray-500'
                      }`}>
                        {w.status === 'ACTIVE' ? 'Actif' : w.status === 'COMPLETED' ? 'Terminé' : w.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
