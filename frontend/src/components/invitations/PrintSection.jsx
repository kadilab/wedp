import { useState } from 'react'
import { useQuery } from 'react-query'
import { Link } from 'react-router-dom'
import toast from 'react-hot-toast'
import { invitationAPI } from '../../services/api'
import useSiteSettingsStore from '../../stores/siteSettingsStore'
import PrintOrderModal from './PrintOrderModal'
import {
  PrinterIcon, ArrowDownTrayIcon, TruckIcon, MagnifyingGlassIcon
} from '@heroicons/react/24/outline'

const apiBase = import.meta.env.VITE_API_URL?.replace('/api', '') || ''

// Event-dashboard section: produce a print-ready file ("BàT" / bon à tirer) for
// a chosen subset of invitations — an A4 imposition PDF with crop marks — so the
// client only prints the ones they want. Optional "order our printing" flow,
// gated by the admin setting.
export default function PrintSection({ weddingId }) {
  const printServiceEnabled = useSiteSettingsStore((s) => s.printServiceEnabled)
  const [size, setSize] = useState('A6') // print card size for the imposition
  const [sheetSize, setSheetSize] = useState('A4') // paper sheet: A4 | A3
  const [orientation, setOrientation] = useState('portrait') // portrait | landscape
  const [search, setSearch] = useState('')
  const [selected, setSelected] = useState(null) // Set<guestId> | null (=> all)
  const [busy, setBusy] = useState('') // '' | 'bat' | 'zip'
  const [showOrder, setShowOrder] = useState(false)

  const { data, isLoading } = useQuery(
    ['print-invitations', weddingId],
    () => invitationAPI.getAll(weddingId)
  )
  const guests = (data?.data?.invitations || []).map((inv) => inv.guest).filter(Boolean)

  const sel = selected ?? new Set(guests.map((g) => g.id))
  const q = search.trim().toLowerCase()
  const filtered = q
    ? guests.filter((g) => `${g.firstName} ${g.lastName}`.toLowerCase().includes(q))
    : guests
  const allVisibleSelected = filtered.length > 0 && filtered.every((g) => sel.has(g.id))
  const toggle = (id) => { const n = new Set(sel); n.has(id) ? n.delete(id) : n.add(id); setSelected(n) }
  const toggleAll = () => {
    const n = new Set(sel)
    if (allVisibleSelected) filtered.forEach((g) => n.delete(g.id))
    else filtered.forEach((g) => n.add(g.id))
    setSelected(n)
  }

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
      const res = await invitationAPI.printLayout(weddingId, { guestIds: ids, printSize: size, sheetSize, orientation })
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
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4">
            {/* Card format */}
            <div>
              <p className="text-xs font-medium text-gray-700 mb-1.5">Format de l'invitation</p>
              <div className="inline-flex rounded-lg bg-gray-100 p-1">
                {['A6', 'A5'].map((s) => (
                  <button key={s} onClick={() => setSize(s)} className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${size === s ? 'bg-white shadow-sm text-primary-700' : 'text-gray-500'}`}>{s}</button>
                ))}
              </div>
            </div>
            {/* Sheet size */}
            <div>
              <p className="text-xs font-medium text-gray-700 mb-1.5">Papier</p>
              <div className="inline-flex rounded-lg bg-gray-100 p-1">
                {['A4', 'A3'].map((s) => (
                  <button key={s} onClick={() => setSheetSize(s)} className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${sheetSize === s ? 'bg-white shadow-sm text-primary-700' : 'text-gray-500'}`}>{s}</button>
                ))}
              </div>
            </div>
            {/* Orientation */}
            <div>
              <p className="text-xs font-medium text-gray-700 mb-1.5">Orientation</p>
              <div className="inline-flex rounded-lg bg-gray-100 p-1">
                <button onClick={() => setOrientation('portrait')} className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${orientation === 'portrait' ? 'bg-white shadow-sm text-primary-700' : 'text-gray-500'}`}>Portrait</button>
                <button onClick={() => setOrientation('landscape')} className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${orientation === 'landscape' ? 'bg-white shadow-sm text-primary-700' : 'text-gray-500'}`}>Paysage</button>
              </div>
            </div>
          </div>
          <p className="text-[11px] text-gray-400 -mt-2 mb-4">
            Les invitations {size} sont disposées sur une planche {sheetSize} {orientation === 'landscape' ? 'paysage' : 'portrait'}, avec traits de coupe — pour optimiser le papier.
          </p>

          {/* Selection + search */}
          <div className="mb-4">
            <div className="flex items-center justify-between mb-1.5">
              <p className="text-xs font-medium text-gray-700">Invitations à imprimer ({sel.size}/{guests.length})</p>
              <button onClick={toggleAll} className="text-xs font-medium text-primary-600 hover:text-primary-700">
                {allVisibleSelected ? 'Tout désélectionner' : 'Tout sélectionner'}
              </button>
            </div>
            <div className="relative mb-2">
              <MagnifyingGlassIcon className="h-4 w-4 text-gray-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Rechercher un invité…"
                className="w-full pl-8 pr-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary-500"
              />
            </div>
            <div className="max-h-56 overflow-auto rounded-lg border border-gray-200 divide-y divide-gray-100">
              {filtered.length === 0 ? (
                <p className="text-xs text-gray-400 text-center py-4">Aucun invité trouvé</p>
              ) : filtered.map((g) => (
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
