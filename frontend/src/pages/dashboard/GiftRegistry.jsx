import { Link, useParams } from 'react-router-dom'
import { useQuery } from 'react-query'
import { giftAPI } from '../../services/api'
import { formatMoney } from '../../utils/currency'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'
import {
  ArrowLeftIcon,
  GiftIcon,
  CheckCircleIcon,
  ClockIcon,
  XCircleIcon
} from '@heroicons/react/24/outline'

function statusBadge(status) {
  switch (status) {
    case 'APPROVED':
      return <span className="badge-success flex items-center w-fit"><CheckCircleIcon className="h-4 w-4 mr-1" />Reçu</span>
    case 'PENDING':
      return <span className="badge-warning flex items-center w-fit"><ClockIcon className="h-4 w-4 mr-1" />En attente</span>
    default:
      return <span className="badge-danger flex items-center w-fit"><XCircleIcon className="h-4 w-4 mr-1" />Échoué</span>
  }
}

export default function GiftRegistry() {
  const { id: weddingId } = useParams()

  const { data, isLoading } = useQuery(['gifts', weddingId], () => giftAPI.getContributions(weddingId))
  const contributions = data?.data?.contributions || []
  const summary = data?.data?.summary || { totalRaised: 0, contributorsCount: 0, goal: null }
  const goal = parseFloat(summary.goal) || 0
  const raised = parseFloat(summary.totalRaised) || 0
  const progressPct = goal > 0 ? Math.min(100, Math.round((raised / goal) * 100)) : null

  return (
    <div className="space-y-6">
      <Link
        to={`/weddings/${weddingId}`}
        className="inline-flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-sm font-medium text-muted transition-colors hover:bg-surface-2 hover:text-content"
      >
        <ArrowLeftIcon className="h-4 w-4" />
        Retour à l'événement
      </Link>

      <div>
        <h1 className="text-3xl font-serif font-bold text-content flex items-center gap-2">
          <GiftIcon className="h-7 w-7 text-primary-500" /> Cagnotte
        </h1>
        <p className="text-muted mt-1">Les cadeaux envoyés par vos invités via Mobile Money.</p>
      </div>

      {!summary.enabled && (
        <div className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-4 text-sm text-amber-700 dark:text-amber-400">
          La cagnotte n'est pas activée. Activez-la depuis « Modifier l'événement ».
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="rounded-2xl border border-border bg-surface p-6">
          <p className="text-sm text-muted">Total reçu</p>
          <p className="text-2xl font-bold text-content mt-1">{formatMoney(raised)}</p>
        </div>
        <div className="rounded-2xl border border-border bg-surface p-6">
          <p className="text-sm text-muted">Contributeurs</p>
          <p className="text-2xl font-bold text-content mt-1">{summary.contributorsCount}</p>
        </div>
        <div className="rounded-2xl border border-border bg-surface p-6">
          <p className="text-sm text-muted">Objectif</p>
          {goal > 0 ? (
            <>
              <p className="text-2xl font-bold text-content mt-1">{formatMoney(goal)}</p>
              <div className="h-1.5 w-full rounded-full bg-surface-2 overflow-hidden mt-2">
                <div className="h-full rounded-full bg-primary-500" style={{ width: `${progressPct}%` }} />
              </div>
            </>
          ) : (
            <p className="text-sm text-muted mt-1">Aucun objectif défini</p>
          )}
        </div>
      </div>

      <div className="rounded-2xl border border-border bg-surface overflow-hidden">
        {isLoading ? (
          <div className="p-8 text-center text-muted">Chargement...</div>
        ) : contributions.length === 0 ? (
          <div className="p-8 text-center text-muted">Aucun cadeau reçu pour le moment.</div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-surface-2 text-left text-[11px] font-semibold uppercase tracking-wide text-muted">
                <th className="px-5 py-3">Donateur</th>
                <th className="px-5 py-3">Montant</th>
                <th className="px-5 py-3">Message</th>
                <th className="px-5 py-3">Date</th>
                <th className="px-5 py-3">Statut</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {contributions.map((c) => (
                <tr key={c.id}>
                  <td className="px-5 py-3 font-medium text-content">{c.donorName}</td>
                  <td className="px-5 py-3 text-content">{formatMoney(c.amount)}</td>
                  <td className="px-5 py-3 text-muted max-w-xs truncate">{c.message || '—'}</td>
                  <td className="px-5 py-3 text-muted whitespace-nowrap">{format(new Date(c.createdAt), 'd MMM yyyy HH:mm', { locale: fr })}</td>
                  <td className="px-5 py-3">{statusBadge(c.status)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
