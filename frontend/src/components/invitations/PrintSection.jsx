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

  const segBtn = (active) =>
    `px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${active ? 'bg-surface shadow-sm text-primary-600 dark:text-primary-400' : 'text-muted hover:text-content'}`

  return (
    <div className="rounded-2xl border border-border bg-surface p-6">
      <div className="mb-1 flex items-center gap-2">
        <PrinterIcon className="h-5 w-5 text-primary-500" />
        <h3 className="font-serif text-lg font-bold text-content">Impression</h3>
      </div>
      <p className="mb-4 text-sm text-muted">
        Générez un fichier prêt à imprimer (BàT) pour les invitations de votre choix.
      </p>

      {isLoading ? (
        <div className="flex justify-center py-8"><div className="h-8 w-8 animate-spin rounded-full border-2 border-primary-500 border-t-transparent" /></div>
      ) : guests.length === 0 ? (
        <div className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-4 text-sm text-amber-700 dark:text-amber-400">
          Aucune invitation générée pour l'instant.{' '}
          <Link to={`/weddings/${weddingId}/invitations`} className="font-semibold underline">Générez vos invitations</Link> d'abord.
        </div>
      ) : (
        <>
          <div className="mb-4 grid grid-cols-1 gap-4 sm:grid-cols-3">
            {/* Card format */}
            <div>
              <p className="mb-1.5 text-xs font-medium text-content">Format de l'invitation</p>
              <div className="inline-flex rounded-lg bg-surface-2 p-1">
                {['A6', 'A5'].map((s) => (
                  <button key={s} onClick={() => setSize(s)} className={segBtn(size === s)}>{s}</button>
                ))}
              </div>
            </div>
            {/* Sheet size */}
            <div>
              <p className="mb-1.5 text-xs font-medium text-content">Papier</p>
              <div className="inline-flex rounded-lg bg-surface-2 p-1">
                {['A4', 'A3'].map((s) => (
                  <button key={s} onClick={() => setSheetSize(s)} className={segBtn(sheetSize === s)}>{s}</button>
                ))}
              </div>
            </div>
            {/* Orientation */}
            <div>
              <p className="mb-1.5 text-xs font-medium text-content">Orientation</p>
              <div className="inline-flex rounded-lg bg-surface-2 p-1">
                <button onClick={() => setOrientation('portrait')} className={segBtn(orientation === 'portrait')}>Portrait</button>
                <button onClick={() => setOrientation('landscape')} className={segBtn(orientation === 'landscape')}>Paysage</button>
              </div>
            </div>
          </div>
          <p className="-mt-2 mb-4 text-[11px] text-muted">
            Les invitations {size} sont disposées sur une planche {sheetSize} {orientation === 'landscape' ? 'paysage' : 'portrait'}, avec traits de coupe — pour optimiser le papier.
          </p>

          {/* Selection + search */}
          <div className="mb-4">
            <div className="mb-1.5 flex items-center justify-between">
              <p className="text-xs font-medium text-content">Invitations à imprimer ({sel.size}/{guests.length})</p>
              <button onClick={toggleAll} className="text-xs font-medium text-primary-600 hover:text-primary-700 dark:text-primary-400">
                {allVisibleSelected ? 'Tout désélectionner' : 'Tout sélectionner'}
              </button>
            </div>
            <div className="relative mb-2">
              <MagnifyingGlassIcon className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Rechercher un invité…"
                className="w-full rounded-lg border border-border bg-bg py-2 pl-8 pr-3 text-sm text-content placeholder:text-muted focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
            </div>
            <div className="max-h-56 divide-y divide-border overflow-auto rounded-lg border border-border">
              {filtered.length === 0 ? (
                <p className="py-4 text-center text-xs text-muted">Aucun invité trouvé</p>
              ) : filtered.map((g) => (
                <label key={g.id} className="flex cursor-pointer items-center gap-3 px-3 py-2 hover:bg-surface-2">
                  <input type="checkbox" checked={sel.has(g.id)} onChange={() => toggle(g.id)} className="h-4 w-4 rounded border-border text-primary-500 focus:ring-primary-500" />
                  <span className="truncate text-sm text-content">{g.firstName} {g.lastName}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Actions */}
          <div className="flex flex-wrap items-center gap-2">
            <button onClick={generateBat} disabled={!!busy || sel.size === 0} className="inline-flex items-center gap-1.5 rounded-xl bg-primary-500 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-primary-600 disabled:opacity-50">
              <PrinterIcon className="h-4 w-4" />
              {busy === 'bat' ? 'Génération…' : `Générer le BàT (${sel.size})`}
            </button>
            <button onClick={downloadZip} disabled={!!busy || sel.size === 0} className="inline-flex items-center gap-1.5 rounded-xl border border-border bg-surface px-4 py-2 text-sm font-semibold text-content transition-colors hover:bg-surface-2 disabled:opacity-50">
              <ArrowDownTrayIcon className="h-4 w-4" />
              {busy === 'zip' ? 'Préparation…' : 'Fichiers individuels (ZIP)'}
            </button>
            {printServiceEnabled && (
              <button onClick={() => setShowOrder(true)} className="inline-flex items-center gap-1.5 rounded-xl border border-border bg-surface px-4 py-2 text-sm font-semibold text-content transition-colors hover:bg-surface-2">
                <TruckIcon className="h-4 w-4" />
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
