import { useState, useEffect } from 'react'
import { useMutation } from 'react-query'
import { Link } from 'react-router-dom'
import toast from 'react-hot-toast'
import { printOrderAPI } from '../../services/api'
import { XMarkIcon, TruckIcon } from '@heroicons/react/24/outline'

const PAPERS = [
  { id: 'standard', name: 'Standard', desc: 'Couché 250g' },
  { id: 'premium', name: 'Premium', desc: 'Texturé 300g' },
  { id: 'luxury', name: 'Luxe', desc: 'Coton 350g' }
]
const FINISHES = [
  { id: 'mat', name: 'Mat' },
  { id: 'glossy', name: 'Brillant' },
  { id: 'satin', name: 'Satiné' }
]
const SIZES = [
  { id: 'A6', name: 'A6' },
  { id: 'A5', name: 'A5' }
]

// Order our printing service for an event. Collects quantity/paper/finish/size +
// shipping, shows a live price estimate, and creates the order.
export default function PrintOrderModal({ weddingId, defaultQuantity = 50, onClose }) {
  const [form, setForm] = useState({
    quantity: Math.max(10, defaultQuantity || 50),
    paperType: 'premium', finish: 'mat', size: 'A5',
    shippingAddress: '', shippingCity: '', shippingPhone: '', notes: ''
  })
  const [estimate, setEstimate] = useState(null)
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }))

  // Live price estimate whenever the pricing-relevant fields change.
  useEffect(() => {
    let cancel = false
    if (!form.quantity || form.quantity < 10) { setEstimate(null); return }
    printOrderAPI.calculate({ quantity: Number(form.quantity), paperType: form.paperType, finish: form.finish, size: form.size })
      .then((r) => { if (!cancel) setEstimate(r.data) })
      .catch(() => { if (!cancel) setEstimate(null) })
    return () => { cancel = true }
  }, [form.quantity, form.paperType, form.finish, form.size])

  const createMutation = useMutation((data) => printOrderAPI.create(data), {
    onSuccess: () => {
      toast.success('Demande d\'impression envoyée ! Suivez-la dans « Commandes d\'impression ».')
      onClose(true)
    },
    onError: (err) => toast.error(err.response?.data?.error || 'Erreur lors de la commande')
  })

  const submit = (e) => {
    e.preventDefault()
    if (Number(form.quantity) < 10) return toast.error('Minimum 10 exemplaires')
    if (!form.shippingAddress.trim() || !form.shippingCity.trim() || !form.shippingPhone.trim()) {
      return toast.error('Renseignez l\'adresse de livraison (adresse, ville, téléphone)')
    }
    createMutation.mutate({ weddingId, ...form, quantity: Number(form.quantity) })
  }

  const fmt = (n) => new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(n || 0)

  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4" onClick={() => onClose(false)}>
      <form onClick={(e) => e.stopPropagation()} onSubmit={submit} className="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[92vh] overflow-auto">
        <div className="sticky top-0 bg-white px-6 py-4 border-b flex items-center justify-between">
          <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2"><TruckIcon className="h-5 w-5 text-primary-500" /> Commander l'impression</h3>
          <button type="button" onClick={() => onClose(false)} className="text-gray-400 hover:text-gray-600"><XMarkIcon className="h-5 w-5" /></button>
        </div>

        <div className="p-6 space-y-5">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label text-sm">Nombre d'exemplaires (min. 10)</label>
              <input type="number" min="10" max="2000" className="input" value={form.quantity} onChange={(e) => set('quantity', e.target.value)} />
            </div>
            <div>
              <label className="label text-sm">Format</label>
              <div className="flex gap-2">
                {SIZES.map((s) => (
                  <button type="button" key={s.id} onClick={() => set('size', s.id)} className={`flex-1 py-2 rounded-lg border text-sm font-medium ${form.size === s.id ? 'border-primary-500 bg-primary-50 text-primary-700' : 'border-gray-200 text-gray-600'}`}>{s.name}</button>
                ))}
              </div>
            </div>
          </div>

          <div>
            <label className="label text-sm">Type de papier</label>
            <div className="grid grid-cols-3 gap-2">
              {PAPERS.map((p) => (
                <button type="button" key={p.id} onClick={() => set('paperType', p.id)} className={`p-2.5 rounded-lg border text-center ${form.paperType === p.id ? 'border-primary-500 bg-primary-50' : 'border-gray-200'}`}>
                  <p className="text-sm font-medium text-gray-900">{p.name}</p>
                  <p className="text-[11px] text-gray-500">{p.desc}</p>
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="label text-sm">Finition</label>
            <div className="grid grid-cols-3 gap-2">
              {FINISHES.map((f) => (
                <button type="button" key={f.id} onClick={() => set('finish', f.id)} className={`py-2 rounded-lg border text-sm font-medium ${form.finish === f.id ? 'border-primary-500 bg-primary-50 text-primary-700' : 'border-gray-200 text-gray-600'}`}>{f.name}</button>
              ))}
            </div>
          </div>

          <div className="border-t pt-4 space-y-3">
            <p className="text-sm font-semibold text-gray-800">Livraison</p>
            <input className="input" placeholder="Adresse *" value={form.shippingAddress} onChange={(e) => set('shippingAddress', e.target.value)} />
            <div className="grid grid-cols-2 gap-3">
              <input className="input" placeholder="Ville *" value={form.shippingCity} onChange={(e) => set('shippingCity', e.target.value)} />
              <input className="input" placeholder="Téléphone *" value={form.shippingPhone} onChange={(e) => set('shippingPhone', e.target.value)} />
            </div>
            <textarea className="input" rows={2} placeholder="Instructions (facultatif)" value={form.notes} onChange={(e) => set('notes', e.target.value)} />
          </div>

          <div className="rounded-lg bg-gray-50 border border-gray-200 p-3 flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Estimation</p>
              {estimate && <p className="text-xs text-gray-400">{fmt(estimate.unitPrice)}/unité × {estimate.quantity}</p>}
            </div>
            <p className="text-xl font-bold text-gray-900">{estimate ? fmt(estimate.totalPrice) : '—'}</p>
          </div>
        </div>

        <div className="sticky bottom-0 bg-white px-6 py-4 border-t flex items-center justify-between gap-2">
          <Link to="/print-orders" className="text-xs text-gray-500 hover:text-gray-700">Voir mes commandes</Link>
          <div className="flex gap-2">
            <button type="button" onClick={() => onClose(false)} className="btn-secondary btn-sm">Annuler</button>
            <button type="submit" disabled={createMutation.isLoading} className="btn-primary btn-sm disabled:opacity-50">
              {createMutation.isLoading ? 'Envoi…' : 'Envoyer la demande'}
            </button>
          </div>
        </div>
      </form>
    </div>
  )
}
