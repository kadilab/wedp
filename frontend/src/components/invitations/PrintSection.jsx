import { useState } from 'react'
import { useQuery } from 'react-query'
import { Link } from 'react-router-dom'
import toast from 'react-hot-toast'
import { invitationAPI } from '../../services/api'
import useSiteSettingsStore from '../../stores/siteSettingsStore'
import {
  PrinterIcon, ArrowDownTrayIcon, DocumentIcon, PhotoIcon, TruckIcon
} from '@heroicons/react/24/outline'

// Event-dashboard section: download print-ready files for a chosen subset of
// invitations (so the client only produces print files for the ones they'll
// actually print, not the ones sent digitally), plus an optional "order our
// printing service" button gated by the admin setting.
export default function PrintSection({ weddingId }) {
  const printServiceEnabled = useSiteSettingsStore((s) => s.printServiceEnabled)
  const [fmt, setFmt] = useState('pdf') // 'pdf' | 'image'
  const [selected, setSelected] = useState(null) // Set<guestId> | null (=> all)
  const [downloading, setDownloading] = useState(false)

  const { data, isLoading } = useQuery(
    ['print-invitations', weddingId],
    () => invitationAPI.getAll(weddingId)
  )
  // Each generated invitation carries its guest — those are the printable ones.
  const guests = (data?.data?.invitations || []).map((inv) => inv.guest).filter(Boolean)

  const sel = selected ?? new Set(guests.map((g) => g.id))
  const allSelected = guests.length > 0 && guests.every((g) => sel.has(g.id))
  const toggle = (id) => {
    const n = new Set(sel)
    n.has(id) ? n.delete(id) : n.add(id)
    setSelected(n)
  }
  const toggleAll = () => setSelected(allSelected ? new Set() : new Set(guests.map((g) => g.id)))

  const download = async () => {
    const ids = [...sel]
    if (ids.length === 0) return toast.error('Sélectionnez au moins une invitation à imprimer')
    setDownloading(true)
    const t = toast.loading('Préparation des fichiers d\'impression…')
    try {
      // 1) Make sure the print files exist for the chosen format.
      if (fmt === 'image') await invitationAPI.generateImages(weddingId, ids)
      else await invitationAPI.generatePDFs(weddingId, ids)
      // 2) Download a ZIP of exactly the selected invitations.
      const res = await invitationAPI.downloadAll(weddingId, fmt, ids)
      const url = window.URL.createObjectURL(new Blob([res.data]))
      const a = document.createElement('a')
      a.href = url
      a.download = `invitations_${fmt === 'image' ? 'images' : 'pdf'}.zip`
      document.body.appendChild(a)
      a.click()
      a.remove()
      window.URL.revokeObjectURL(url)
      toast.success(`${ids.length} fichier(s) d'impression téléchargé(s)`, { id: t })
    } catch (e) {
      let msg = 'Échec du téléchargement'
      try { const txt = await e.response?.data?.text?.(); if (txt) msg = JSON.parse(txt).error || msg } catch { /* keep */ }
      toast.error(msg, { id: t })
    } finally {
      setDownloading(false)
    }
  }

  return (
    <div className="bg-white rounded-xl shadow-lg p-6">
      <div className="flex items-center gap-2 mb-1">
        <PrinterIcon className="h-6 w-6 text-primary-500" />
        <h3 className="text-lg font-serif font-bold text-gray-900">Impression</h3>
      </div>
      <p className="text-sm text-gray-500 mb-4">
        Téléchargez les fichiers prêts à imprimer pour les invitations de votre choix.
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
          {/* Format */}
          <div className="mb-4">
            <p className="text-xs font-medium text-gray-700 mb-1.5">Format du fichier</p>
            <div className="inline-flex rounded-lg bg-gray-100 p-1">
              <button onClick={() => setFmt('pdf')} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${fmt === 'pdf' ? 'bg-white shadow-sm text-primary-700' : 'text-gray-500'}`}>
                <DocumentIcon className="h-4 w-4" /> PDF
              </button>
              <button onClick={() => setFmt('image')} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${fmt === 'image' ? 'bg-white shadow-sm text-primary-700' : 'text-gray-500'}`}>
                <PhotoIcon className="h-4 w-4" /> Image (PNG)
              </button>
            </div>
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
                  {g.tableNumber && <span className="ml-auto text-[11px] text-gray-400 shrink-0">🪑 {g.tableNumber}</span>}
                </label>
              ))}
            </div>
          </div>

          {/* Actions */}
          <div className="flex flex-wrap items-center gap-2">
            <button onClick={download} disabled={downloading || sel.size === 0} className="btn-primary btn-sm disabled:opacity-50">
              <ArrowDownTrayIcon className="h-4 w-4 mr-1.5" />
              {downloading ? 'Préparation…' : `Télécharger (${sel.size})`}
            </button>
            {printServiceEnabled && (
              <Link to="/print-orders" className="btn-secondary btn-sm">
                <TruckIcon className="h-4 w-4 mr-1.5" />
                Commander l'impression chez nous
              </Link>
            )}
          </div>
        </>
      )}
    </div>
  )
}
