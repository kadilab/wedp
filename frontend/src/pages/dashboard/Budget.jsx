import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from 'react-query'
import { budgetAPI } from '../../services/api'
import { formatMoney } from '../../utils/currency'
import { confirmDialog } from '../../components/common/confirm'
import toast from 'react-hot-toast'
import {
  ArrowLeftIcon,
  BanknotesIcon,
  PlusIcon,
  PencilIcon,
  TrashIcon,
  XMarkIcon
} from '@heroicons/react/24/outline'

const CATEGORY_SUGGESTIONS = [
  'Salle', 'Traiteur', 'Photographe', 'Vidéaste', 'Décoration/Fleurs', 'Musique/DJ',
  'Robe/Costume', 'Alliances', 'Transport', 'Gâteau/Pâtisserie', 'Invitations', 'Autre'
]

const STATUS_LABELS = {
  PLANNED: 'Prévu',
  DEPOSIT_PAID: 'Acompte versé',
  PAID: 'Payé'
}
const STATUS_STYLES = {
  PLANNED: 'bg-gray-100 text-gray-600',
  DEPOSIT_PAID: 'bg-amber-100 text-amber-700',
  PAID: 'bg-green-100 text-green-700'
}

const emptyForm = { category: '', vendorName: '', plannedAmount: '', paidAmount: '', status: 'PLANNED', notes: '' }

function ItemModal({ item, onClose, onSubmit, isLoading }) {
  const [form, setForm] = useState(item ? {
    category: item.category, vendorName: item.vendorName || '', plannedAmount: item.plannedAmount,
    paidAmount: item.paidAmount, status: item.status, notes: item.notes || ''
  } : emptyForm)

  const handleSubmit = (e) => {
    e.preventDefault()
    if (!form.category.trim()) return toast.error('La catégorie est requise')
    if (!(parseFloat(form.plannedAmount) >= 0)) return toast.error('Montant prévu invalide')
    onSubmit(form)
  }

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full max-h-[92vh] overflow-y-auto">
        <div className="flex items-center justify-between px-6 py-4 border-b">
          <h3 className="font-serif font-bold text-lg text-gray-900">{item ? 'Modifier la dépense' : 'Ajouter une dépense'}</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-700"><XMarkIcon className="h-5 w-5" /></button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="label text-sm">Catégorie *</label>
            <input type="text" list="budget-categories" className="input" value={form.category}
              onChange={(e) => setForm({ ...form, category: e.target.value })} placeholder="Ex : Traiteur" />
            <datalist id="budget-categories">
              {CATEGORY_SUGGESTIONS.map((c) => <option key={c} value={c} />)}
            </datalist>
          </div>
          <div>
            <label className="label text-sm">Prestataire (optionnel)</label>
            <input type="text" className="input" value={form.vendorName}
              onChange={(e) => setForm({ ...form, vendorName: e.target.value })} placeholder="Ex : Chez Mama Traiteur" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label text-sm">Montant prévu *</label>
              <input type="number" min="0" step="0.01" className="input" value={form.plannedAmount}
                onChange={(e) => setForm({ ...form, plannedAmount: e.target.value })} placeholder="0" />
            </div>
            <div>
              <label className="label text-sm">Montant payé</label>
              <input type="number" min="0" step="0.01" className="input" value={form.paidAmount}
                onChange={(e) => setForm({ ...form, paidAmount: e.target.value })} placeholder="0" />
            </div>
          </div>
          <div>
            <label className="label text-sm">Statut</label>
            <select className="input" value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
              {Object.entries(STATUS_LABELS).map(([k, label]) => <option key={k} value={k}>{label}</option>)}
            </select>
          </div>
          <div>
            <label className="label text-sm">Notes (optionnel)</label>
            <textarea className="input" rows={2} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
          </div>
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="flex-1 btn-secondary">Annuler</button>
            <button type="submit" disabled={isLoading} className="flex-1 btn-primary">{isLoading ? 'Enregistrement...' : 'Enregistrer'}</button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default function Budget() {
  const { id: weddingId } = useParams()
  const queryClient = useQueryClient()
  const [modalItem, setModalItem] = useState(null) // null = closed, {} = new, item = editing
  const invalidate = () => queryClient.invalidateQueries(['budget', weddingId])

  const { data, isLoading } = useQuery(['budget', weddingId], () => budgetAPI.getItems(weddingId))
  const items = data?.data?.items || []
  const summary = data?.data?.summary || { totalPlanned: 0, totalPaid: 0, remaining: 0, byCategory: [] }

  const createMutation = useMutation((d) => budgetAPI.createItem(weddingId, d), {
    onSuccess: () => { toast.success('Dépense ajoutée'); invalidate(); setModalItem(null) },
    onError: (e) => toast.error(e.response?.data?.error || 'Erreur')
  })
  const updateMutation = useMutation(({ itemId, d }) => budgetAPI.updateItem(weddingId, itemId, d), {
    onSuccess: () => { toast.success('Dépense mise à jour'); invalidate(); setModalItem(null) },
    onError: (e) => toast.error(e.response?.data?.error || 'Erreur')
  })
  const deleteMutation = useMutation((itemId) => budgetAPI.deleteItem(weddingId, itemId), {
    onSuccess: () => { toast.success('Dépense supprimée'); invalidate() },
    onError: (e) => toast.error(e.response?.data?.error || 'Erreur')
  })

  const handleDelete = async (item) => {
    const ok = await confirmDialog({
      title: 'Supprimer cette dépense ?',
      message: `« ${item.category} »${item.vendorName ? ` — ${item.vendorName}` : ''} sera définitivement supprimée.`,
      confirmText: 'Supprimer'
    })
    if (ok) deleteMutation.mutate(item.id)
  }

  const maxCategoryPlanned = Math.max(1, ...summary.byCategory.map((c) => c.planned))

  return (
    <div className="space-y-6">
      <Link
        to={`/weddings/${weddingId}`}
        className="inline-flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-sm font-medium text-muted transition-colors hover:bg-surface-2 hover:text-content"
      >
        <ArrowLeftIcon className="h-4 w-4" />
        Retour à l'événement
      </Link>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-3xl font-serif font-bold text-content flex items-center gap-2">
            <BanknotesIcon className="h-7 w-7 text-primary-500" /> Suivi de budget
          </h1>
          <p className="text-muted mt-1">Vos dépenses et prestataires, prévu vs payé.</p>
        </div>
        <button onClick={() => setModalItem({})} className="btn-primary flex items-center gap-2">
          <PlusIcon className="h-5 w-5" /> Ajouter une dépense
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="rounded-2xl border border-border bg-surface p-6">
          <p className="text-sm text-muted">Budget prévu</p>
          <p className="text-2xl font-bold text-content mt-1">{formatMoney(summary.totalPlanned)}</p>
        </div>
        <div className="rounded-2xl border border-border bg-surface p-6">
          <p className="text-sm text-muted">Déjà payé</p>
          <p className="text-2xl font-bold text-green-600 mt-1">{formatMoney(summary.totalPaid)}</p>
        </div>
        <div className="rounded-2xl border border-border bg-surface p-6">
          <p className="text-sm text-muted">Reste à payer</p>
          <p className={`text-2xl font-bold mt-1 ${summary.remaining < 0 ? 'text-red-600' : 'text-content'}`}>{formatMoney(summary.remaining)}</p>
        </div>
      </div>

      {summary.byCategory.length > 0 && (
        <div className="rounded-2xl border border-border bg-surface p-6 space-y-3">
          <h2 className="font-semibold text-content mb-2">Répartition par catégorie</h2>
          {summary.byCategory.map((c) => (
            <div key={c.category}>
              <div className="flex justify-between text-sm mb-1">
                <span className="text-content font-medium">{c.category}</span>
                <span className="text-muted">{formatMoney(c.paid)} / {formatMoney(c.planned)}</span>
              </div>
              <div className="h-2 w-full rounded-full bg-surface-2 overflow-hidden">
                <div className="h-full rounded-full bg-primary-300" style={{ width: `${(c.planned / maxCategoryPlanned) * 100}%` }} />
                <div className="h-2 -mt-2 rounded-full bg-primary-500" style={{ width: `${(c.paid / maxCategoryPlanned) * 100}%` }} />
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="rounded-2xl border border-border bg-surface overflow-hidden">
        {isLoading ? (
          <div className="p-8 text-center text-muted">Chargement...</div>
        ) : items.length === 0 ? (
          <div className="p-8 text-center text-muted">Aucune dépense enregistrée. Ajoutez votre premier prestataire.</div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-surface-2 text-left text-[11px] font-semibold uppercase tracking-wide text-muted">
                <th className="px-5 py-3">Catégorie</th>
                <th className="px-5 py-3">Prestataire</th>
                <th className="px-5 py-3">Prévu</th>
                <th className="px-5 py-3">Payé</th>
                <th className="px-5 py-3">Statut</th>
                <th className="px-5 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {items.map((item) => (
                <tr key={item.id}>
                  <td className="px-5 py-3 font-medium text-content">{item.category}</td>
                  <td className="px-5 py-3 text-muted">{item.vendorName || '—'}</td>
                  <td className="px-5 py-3 text-content">{formatMoney(item.plannedAmount)}</td>
                  <td className="px-5 py-3 text-content">{formatMoney(item.paidAmount)}</td>
                  <td className="px-5 py-3">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_STYLES[item.status]}`}>
                      {STATUS_LABELS[item.status]}
                    </span>
                  </td>
                  <td className="px-5 py-3">
                    <div className="flex justify-end gap-2">
                      <button onClick={() => setModalItem(item)} className="text-gray-400 hover:text-primary-600" title="Modifier">
                        <PencilIcon className="h-4 w-4" />
                      </button>
                      <button onClick={() => handleDelete(item)} className="text-gray-400 hover:text-red-600" title="Supprimer">
                        <TrashIcon className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {modalItem !== null && (
        <ItemModal
          item={modalItem.id ? modalItem : null}
          onClose={() => setModalItem(null)}
          isLoading={createMutation.isLoading || updateMutation.isLoading}
          onSubmit={(form) => {
            if (modalItem.id) updateMutation.mutate({ itemId: modalItem.id, d: form })
            else createMutation.mutate(form)
          }}
        />
      )}
    </div>
  )
}
