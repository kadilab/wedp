import { useState } from 'react'
import { useQuery } from 'react-query'
import { Link } from 'react-router-dom'
import toast from 'react-hot-toast'
import { invitationAPI } from '../../services/api'
import useSiteSettingsStore from '../../stores/siteSettingsStore'
import PrintOrderModal from './PrintOrderModal'
import {
  PrinterIcon, ArrowDownTrayIcon, DocumentIcon, TruckIcon
} from '@heroicons/react/24/outline'

const apiBase = import.meta.env.VITE_API_URL?.replace('/api', '') || ''

// Event-dashboard section: produce a print-ready file ("BàT" / bon à tirer) for
// a chosen subset of invitations — an A4 imposition PDF with crop marks — so the
// client only prints the ones they want. Optional "order our printing" flow,
// gated by the admin setting.
export default function PrintSection({ weddingId }) {
  const printServiceEnabled = useSiteSettingsStore((s) => s.printServiceEnabled)
  const [size, setSize] = useState('A6') // print card size for the imposition
  const [selected, setSelected] = useState(null) // Set<guestId> | null (=> all)
  const [busy, setBusy] = useState('') // '' | 'bat' | 'zip'
  const [showOrder, setShowOrder] = useState(false)

  const { data, isLoading } = useQuery(
    ['print-invitations', weddingId],
    () => invitationAPI.getAll(weddingId)
  )
  const guests = (data?.data?.invitations || []).map((inv) => inv.guest).filter(Boolean)

  const sel = selected ?? new Set(guests.map((g) => g.id))
  const allSelected = guests.length > 0 && guests.every((g) => sel.has(g.id))
  const toggle = (id) => { const n = new Set(sel); n.has(id) ? n.delete(id) : n.add(id); setSelected(n) }
  const toggleAll = () => setSelected(allSelected ? new Set() : new Set(guests.map((g) => g.id)))

  const readErr = async (e, fallback) => {
    try { const txt = await e.response?.data?.text?.(); if (txt) return JSON.parse(txt).error || fallback } catch { /* noop */ }
    return e.response?.data?.error || fallback
  }

  // Generate the print-ready imposition PDF (BàT) for the selected invitations.
  const generateBat = async () => {
    const ids = [...sel]
    if (ids.length === 0) return toast.error('Sélectionnez au moins une invitation')
    setBusy('bat')
    const t = toast.loading('Génération du fichier d\'impression (BàT)…')
    try {
      // Ensure the underlying invitation PDFs exist, then build the A4 layout.
      await invitationAPI.generatePDFs(weddingId, ids)
      const res = await invitationAPI.printLayout(weddingId, { guestIds: ids, printSize: size })
      const url = res.data?.pdfUrl
      if (!url) throw new Error('no url')
      const a = document.createElement('a')
      a.href = `${apiBase}${url}`
      a.download = `BAT_impression_${size}.pdf`
      a.target = '_blank'
      document.body.appendChild(a); a.click(); a.remove()
      toast.success(`BàT prêt (${res.data.count} invitation(s), ${size})`, { id: t })
    } catch (e) {
      toast.error(await readErr(e, 'Échec de la génération du BàT'), { id: t })
    } finally {
      setBusy('')
    }
  }

  // Secondary: individual PDF files zipped (one file per invitation).
  const downloadZip = async () => {
    const ids = [...sel]
    if (ids.length === 0) return toast.error('Sélectionnez au moins une invitation')
    setBusy('zip')
    const t = toast.loading('Préparation des fichiers…')
    try {
      await invitationAPI.generatePDFs(weddingId, ids)
      const res = await invitationAPI.downloadAll(weddingId, 'pdf', ids)
      const url = window.URL.createObjectURL(new Blob([res.data]))
      const a = document.createElement('a'); a.href = url; a.download = 'invitations_pdf.zip'
      document.body.appendChild(a); a.click(); a.remove(); window.URL.revokeObjectURL(url)
      toast.success('Fichiers téléchargés', { id: t })
    } catch (e) {
      toast.error(await readErr(e, 'Échec du téléchargement'), { id: t })
    } finally {
      setBusy('')
    }
  }

  return (
    <div className="bg-white rounded-xl shadow-lg p-6">
      <div className="flex items-center gap-2 mb-1">
        <PrinterIcon className="h-6 w-6 text-primary-500" />
        <h3 className="text-lg font-serif font-bold text-gray-900">Impression</h3>
      </div>
      <p className="text-sm text-gray-500 mb-4">
        Générez un fichier prêt à imprimer (BàT) pour les invitations de votre choix.
      </p>

      {isLoading ? (
        <div className="py-8 flex justify-center"><div className="animate-spin h-8 w-8 rounded-full border-b-2 border-primary-600" /></div>
      ) : guests.length === 0 ? (
        <div className="rounded-lg bg-amber-50 border border-amber-200 p-4 text-sm text-amber-800">
          Aucune invitation générée pour l'instant.{' '}
          <Link to={`/weddings/${weddingId}/invitations`} className="font-medium underline">Générez vos invitations</Link> d'abord.
        </div>
      ) : (
        <>
          {/* Print size */}
          <div className="mb-4">
            <p className="text-xs font-medium text-gray-700 mb-1.5">Format d'impression (par carte)</p>
            <div className="inline-flex rounded-lg bg-gray-100 p-1">
              {['A6', 'A5'].map((s) => (
                <button key={s} onClick={() => setSize(s)} className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${size === s ? 'bg-white shadow-sm text-primary-700' : 'text-gray-500'}`}>
                  {s} {s === 'A6' ? '(10,5×14,8)' : '(14,8×21)'}
                </button>
              ))}
            </div>
            <p className="text-[11px] text-gray-400 mt-1">Le BàT dispose plusieurs invitations par page A4 avec traits de coupe.</p>
          </div>

          {/* Selection */}
          <div className="mb-4">
            <div className="flex items-center justify-between mb-1.5">
              <p className="text-xs font-medium text-gray-700">Invitations à imprimer ({sel.size}/{guests.length})</p>
              <button onClick={toggleAll} className="text-xs font-medium text-primary-600 hover:text-primary-700">
                {allSelected ? 'Tout désélectionner' : 'Tout sélectionner'}
              </button>
            </div>
            <div className="max-h-56 overflow-auto rounded-lg border border-gray-200 divide-y divide-gray-100">
              {guests.map((g) => (
                <label key={g.id} className="flex items-center gap-3 px-3 py-2 hover:bg-gray-50 cursor-pointer">
                  <input type="checkbox" checked={sel.has(g.id)} onChange={() => toggle(g.id)} className="w-4 h-4 rounded border-gray-300 text-primary-600" />
                  <span className="text-sm text-gray-800 truncate">{g.firstName} {g.lastName}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Actions */}
          <div className="flex flex-wrap items-center gap-2">
            <button onClick={generateBat} disabled={!!busy || sel.size === 0} className="btn-primary btn-sm disabled:opacity-50">
              <PrinterIcon className="h-4 w-4 mr-1.5" />
              {busy === 'bat' ? 'Génération…' : `Générer le BàT (${sel.size})`}
            </button>
            <button onClick={downloadZip} disabled={!!busy || sel.size === 0} className="btn-secondary btn-sm disabled:opacity-50">
              <ArrowDownTrayIcon className="h-4 w-4 mr-1.5" />
              {busy === 'zip' ? 'Préparation…' : 'Fichiers individuels (ZIP)'}
            </button>
            {printServiceEnabled && (
              <button onClick={() => setShowOrder(true)} className="btn-secondary btn-sm">
                <TruckIcon className="h-4 w-4 mr-1.5" />
                Commander l'impression chez nous
              </button>
            )}
          </div>
        </>
      )}

      {showOrder && (
        <PrintOrderModal
          weddingId={weddingId}
          defaultQuantity={sel.size || 50}
          onClose={() => setShowOrder(false)}
        />
      )}
    </div>
  )
}
