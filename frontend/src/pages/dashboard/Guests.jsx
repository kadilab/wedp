import { useState, useRef } from 'react'
import { useParams, Link } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from 'react-query'
import { guestAPI, weddingAPI, invitationOrderAPI } from '../../services/api'
import BuyQuotaModal from '../../components/invitations/BuyQuotaModal'
import { confirmDialog } from '../../components/common/confirm'
import { getGuestCategoryOptions, eventUsesTables, eventUsesPlusOnes } from '../../utils/eventTypes'
import { tableName } from '../../utils/tables'
import toast from 'react-hot-toast'
import {
  PlusIcon,
  MagnifyingGlassIcon,
  ArrowUpTrayIcon,
  ArrowDownTrayIcon,
  TrashIcon,
  PencilIcon,
  ArrowLeftIcon,
  UserGroupIcon,
  ShoppingCartIcon
} from '@heroicons/react/24/outline'

// WhatsApp brand glyph (heroicons has no brand icons).
function WhatsAppIcon({ className }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M.057 24l1.687-6.163a11.867 11.867 0 01-1.587-5.945C.16 5.335 5.495 0 12.05 0a11.817 11.817 0 018.413 3.488 11.824 11.824 0 013.48 8.414c-.003 6.557-5.338 11.892-11.893 11.892a11.9 11.9 0 01-5.688-1.448L.057 24zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884a9.86 9.86 0 001.51 5.26l-.999 3.648 3.978-1.044zm11.387-5.464c-.074-.124-.272-.198-.57-.347-.297-.149-1.758-.868-2.031-.967-.272-.099-.47-.149-.669.149-.198.297-.768.967-.941 1.165-.173.198-.347.223-.644.074-.297-.149-1.255-.462-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.297-.347.446-.521.151-.172.2-.296.3-.495.099-.198.05-.372-.025-.521-.075-.148-.669-1.611-.916-2.206-.242-.579-.487-.501-.669-.51l-.57-.01c-.198 0-.52.074-.792.372s-1.04 1.016-1.04 2.479 1.065 2.876 1.213 3.074c.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.626.712.226 1.36.194 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.695.248-1.29.173-1.414z"/>
    </svg>
  )
}

// Guest avatar helpers (stable pastel colour per name, like the seating plan).
const AVATAR_COLORS = ['bg-rose-100 text-rose-700', 'bg-amber-100 text-amber-700', 'bg-emerald-100 text-emerald-700', 'bg-sky-100 text-sky-700', 'bg-violet-100 text-violet-700', 'bg-pink-100 text-pink-700', 'bg-teal-100 text-teal-700', 'bg-indigo-100 text-indigo-700']
const guestInitials = (g) => `${(g.firstName?.[0] || '')}${(g.lastName?.[0] || '')}`.toUpperCase() || '?'
const guestColor = (g) => {
  const s = `${g.firstName || ''} ${g.lastName || ''}`
  let h = 0
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0
  return AVATAR_COLORS[h % AVATAR_COLORS.length]
}

export default function Guests() {
  const { id: weddingId } = useParams()
  const [search, setSearch] = useState('')
  const [rsvpFilter, setRsvpFilter] = useState('')
  const [showAddModal, setShowAddModal] = useState(false)
  const [editingGuest, setEditingGuest] = useState(null)
  const [showBuyModal, setShowBuyModal] = useState(false)
  const [waSendingId, setWaSendingId] = useState(null)
  const [showWaBulk, setShowWaBulk] = useState(false)
  const queryClient = useQueryClient()

  const { data: weddingData } = useQuery(['wedding', weddingId], () => weddingAPI.getOne(weddingId))
  const wedding = weddingData?.data?.wedding
  const eventType = wedding?.eventType || 'WEDDING'
  const usesTables = eventUsesTables(wedding?.eventType)
  const usesPlusOnes = eventUsesPlusOnes(wedding?.eventType)

  const { data: quotaData } = useQuery(
    ['quota', weddingId],
    () => invitationOrderAPI.getQuota(weddingId),
    { enabled: !!weddingId }
  )
  const quota = quotaData?.data?.quota

  const { data: guestsData, isLoading } = useQuery(
    ['guests', weddingId, { search, rsvpStatus: rsvpFilter }],
    () => guestAPI.getAll(weddingId, { search, rsvpStatus: rsvpFilter })
  )
  const guests = guestsData?.data?.guests || []

  const deleteMutation = useMutation(
    (guestId) => guestAPI.delete(weddingId, guestId),
    {
      onSuccess: () => {
        toast.success('Invité supprimé')
        queryClient.invalidateQueries(['guests', weddingId]); queryClient.invalidateQueries(['seating', weddingId])
      }
    }
  )

  // Send a single guest their personalized invitation via WhatsApp (1 click).
  const handleWhatsApp = async (guest) => {
    setWaSendingId(guest.id)
    // Open the tab synchronously so popup blockers don't kill it after the await.
    const win = window.open('', '_blank')
    try {
      const res = await guestAPI.whatsappLink(weddingId, guest.id)
      const share = res.data
      if (!share.hasPhone) {
        try { await navigator.clipboard.writeText(share.invitationUrl) } catch {}
        toast('Pas de numéro pour cet invité — lien copié. Choisissez le contact dans WhatsApp.', { icon: '📋' })
      }
      if (win) win.location.href = share.waUrl
      else window.location.href = share.waUrl
      await guestAPI.markSent(weddingId, guest.id)
      queryClient.invalidateQueries(['guests', weddingId]); queryClient.invalidateQueries(['seating', weddingId])
    } catch (error) {
      if (win) win.close()
      toast.error('Échec de la génération du lien WhatsApp')
    } finally {
      setWaSendingId(null)
    }
  }

  const exportGuests = async (format = 'csv') => {
    try {
      const response = await guestAPI.export(weddingId, format)
      const url = window.URL.createObjectURL(new Blob([response.data]))
      const link = document.createElement('a')
      link.href = url
      link.setAttribute('download', `invites-${weddingId}.${format}`)
      document.body.appendChild(link)
      link.click()
      link.remove()
      toast.success('Export réussi')
    } catch (error) {
      toast.error('Erreur lors de l\'export')
    }
  }

  const fileInputRef = useRef(null)
  const [importing, setImporting] = useState(false)

  const handleImportFile = async (e) => {
    const file = e.target.files?.[0]
    e.target.value = '' // allow re-selecting the same file
    if (!file) return
    setImporting(true)
    try {
      const res = await guestAPI.import(weddingId, file)
      const r = res.data?.results || {}
      queryClient.invalidateQueries(['guests', weddingId]); queryClient.invalidateQueries(['seating', weddingId])
      toast.success(`Import terminé : ${r.created || 0} ajouté(s)${r.skipped ? `, ${r.skipped} ignoré(s)` : ''}`)
    } catch (error) {
      toast.error(error.response?.data?.error || "Erreur lors de l'import")
    } finally {
      setImporting(false)
    }
  }

  // Downloadable Excel (.xlsx) template, generated by the backend with columns
  // adapted to the event type + an "Instructions" sheet (easy to fill in).
  const downloadTemplate = async () => {
    try {
      const response = await guestAPI.downloadTemplate(weddingId)
      const url = window.URL.createObjectURL(new Blob([response.data]))
      const link = document.createElement('a')
      link.href = url
      link.setAttribute('download', `modele-invites-${(eventType || 'evenement').toLowerCase()}.xlsx`)
      document.body.appendChild(link)
      link.click()
      link.remove()
      window.URL.revokeObjectURL(url)
    } catch (error) {
      toast.error('Erreur lors du téléchargement du modèle')
    }
  }

  const getRsvpBadge = (status) => {
    switch (status) {
      case 'CONFIRMED': return <span className="badge-success">Confirmé</span>
      case 'DECLINED': return <span className="badge-danger">Décliné</span>
      case 'PENDING': return <span className="badge-warning">En attente</span>
      default: return <span className="badge">{status}</span>
    }
  }

  const askDelete = async (guest) => {
    const ok = await confirmDialog({
      title: 'Supprimer cet invité',
      message: `Voulez-vous vraiment supprimer ${guest.firstName} ${guest.lastName} ? Cette action est irréversible.`,
      confirmText: 'Supprimer'
    })
    if (ok) deleteMutation.mutate(guest.id)
  }

  // Shared action buttons (WhatsApp send / edit / delete) for both the desktop
  // table and the mobile cards.
  const GuestActions = ({ guest }) => (
    <div className="flex items-center gap-1.5">
      {guest.invitation ? (
        <button
          onClick={() => handleWhatsApp(guest)}
          disabled={waSendingId === guest.id}
          title={guest.invitationSent ? 'Renvoyer via WhatsApp' : 'Envoyer via WhatsApp'}
          className={`inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors disabled:opacity-50 ${
            guest.invitationSent
              ? 'bg-green-50 text-green-700 hover:bg-green-100'
              : 'bg-[#25D366]/10 text-[#128C7E] hover:bg-[#25D366]/20'
          }`}
        >
          <WhatsAppIcon className="h-4 w-4" />
          {waSendingId === guest.id ? '…' : guest.invitationSent ? 'Renvoyer' : 'Envoyer'}
          {guest.invitationSent && <span className="text-green-600">✓</span>}
        </button>
      ) : (
        <Link
          to={`/weddings/${weddingId}/invitations`}
          title="Générez d'abord l'invitation pour pouvoir l'envoyer"
          className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium text-gray-400 bg-gray-100 hover:bg-gray-200 whitespace-nowrap"
        >
          Invitation non générée
        </Link>
      )}
      <button onClick={() => setEditingGuest(guest)} title="Modifier" className="p-1.5 text-gray-500 hover:text-primary-600 hover:bg-gray-100 rounded-lg">
        <PencilIcon className="h-4 w-4" />
      </button>
      <button onClick={() => askDelete(guest)} title="Supprimer" className="p-1.5 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-lg">
        <TrashIcon className="h-4 w-4" />
      </button>
    </div>
  )

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center space-x-4">
          <Link to={`/weddings/${weddingId}`} className="p-2 text-gray-600 hover:text-gray-900 rounded-lg hover:bg-gray-100">
            <ArrowLeftIcon className="h-5 w-5" />
          </Link>
          <div>
            <h1 className="text-3xl font-serif font-bold text-gray-900">Invités</h1>
            {wedding && (
              <p className="text-gray-600">
                {(!wedding.eventType || wedding.eventType === 'WEDDING')
                  ? `${wedding.brideName} & ${wedding.groomName}`
                  : (wedding.eventTitle || 'Événement')}
              </p>
            )}
          </div>
        </div>
        <div className="flex items-center flex-wrap gap-2">
          <input
            ref={fileInputRef}
            type="file"
            accept=".xlsx,.xls"
            onChange={handleImportFile}
            className="hidden"
          />
          <button onClick={downloadTemplate} className="btn-secondary btn-sm" title="Télécharger le modèle Excel adapté à votre événement">
            <ArrowDownTrayIcon className="h-4 w-4 mr-1" />
            Modèle Excel
          </button>
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={importing}
            className="btn-secondary btn-sm disabled:opacity-50"
            title="Importer des invités depuis un fichier Excel (.xlsx)"
          >
            <ArrowUpTrayIcon className="h-4 w-4 mr-1" />
            {importing ? 'Import...' : 'Importer Excel'}
          </button>
          <button onClick={() => exportGuests('csv')} className="btn-secondary btn-sm">
            <ArrowDownTrayIcon className="h-4 w-4 mr-1" />
            CSV
          </button>
          <button onClick={() => exportGuests('xlsx')} className="btn-secondary btn-sm">
            <ArrowDownTrayIcon className="h-4 w-4 mr-1" />
            Excel
          </button>
          <button
            onClick={() => setShowWaBulk(true)}
            className="btn-sm inline-flex items-center text-white"
            style={{ backgroundColor: '#25D366' }}
            title="Envoyer les invitations par WhatsApp (1 clic par invité)"
          >
            <WhatsAppIcon className="h-4 w-4 mr-1" />
            WhatsApp
          </button>
          <button onClick={() => setShowAddModal(true)} className="btn-primary">
            <PlusIcon className="h-5 w-5 mr-2" />
            Ajouter
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
          <input
            type="text"
            placeholder="Rechercher un invité..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="input pl-10"
          />
        </div>
        <select
          value={rsvpFilter}
          onChange={(e) => setRsvpFilter(e.target.value)}
          className="input w-full sm:w-48"
        >
          <option value="">Tous les statuts</option>
          <option value="PENDING">En attente</option>
          <option value="CONFIRMED">Confirmés</option>
          <option value="DECLINED">Déclinés</option>
        </select>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg p-4 shadow-sm border">
          <p className="text-2xl font-bold text-gray-900">{guests.length}</p>
          <p className="text-sm text-gray-500">Total invités</p>
        </div>
        <div className="bg-white rounded-lg p-4 shadow-sm border">
          <p className="text-2xl font-bold text-green-600">
            {guests.filter(g => g.rsvpStatus === 'CONFIRMED').length}
          </p>
          <p className="text-sm text-gray-500">Confirmés</p>
        </div>
        <div className="bg-white rounded-lg p-4 shadow-sm border">
          <p className="text-2xl font-bold text-yellow-600">
            {guests.filter(g => g.rsvpStatus === 'PENDING').length}
          </p>
          <p className="text-sm text-gray-500">En attente</p>
        </div>
        <div className="bg-white rounded-lg p-4 shadow-sm border">
          <p className="text-2xl font-bold text-red-600">
            {guests.filter(g => g.rsvpStatus === 'DECLINED').length}
          </p>
          <p className="text-sm text-gray-500">Déclinés</p>
        </div>
      </div>

      {/* Quota Banner */}
      {quota && (
        <div className={`flex items-center justify-between rounded-xl p-4 border ${
          quota.remaining > 0 ? 'bg-blue-50 border-blue-200' : 'bg-amber-50 border-amber-200'
        }`}>
          <div>
            <p className="text-sm font-medium text-gray-900">
              {quota.remaining} invitation{quota.remaining > 1 ? 's' : ''} restante{quota.remaining > 1 ? 's' : ''} sur {quota.totalAllowed}
            </p>
            <p className="text-xs text-gray-500">
              {quota.freeQuota} gratuite{quota.freeQuota > 1 ? 's' : ''} + {quota.purchased} achetée{quota.purchased > 1 ? 's' : ''} — générez vos invitations depuis la page Invitations
            </p>
          </div>
          <button onClick={() => setShowBuyModal(true)} className="btn-secondary btn-sm">
            <ShoppingCartIcon className="h-4 w-4 mr-1" />
            Acheter plus
          </button>
        </div>
      )}

      {/* Table */}
      {isLoading ? (
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto"></div>
        </div>
      ) : guests.length === 0 ? (
        <div className="bg-white rounded-xl shadow-lg p-12 text-center">
          <UserGroupIcon className="h-16 w-16 text-gray-300 mx-auto mb-4" />
          <h2 className="text-xl font-medium text-gray-900 mb-2">Aucun invité</h2>
          <p className="text-gray-500 mb-6">Commencez par ajouter vos premiers invités</p>
          <button onClick={() => setShowAddModal(true)} className="btn-primary">
            <PlusIcon className="h-5 w-5 mr-2" />
            Ajouter un invité
          </button>
        </div>
      ) : (
        <>
          {/* Desktop / tablet: table */}
          <div className="hidden lg:block bg-white rounded-xl shadow-lg overflow-hidden ring-1 ring-gray-100">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 text-left text-[11px] font-semibold uppercase tracking-wide text-gray-500">
                  <th className="px-5 py-3">Invité</th>
                  <th className="px-5 py-3">Téléphone</th>
                  <th className="px-5 py-3">Catégorie</th>
                  {usesTables && <th className="px-5 py-3">Table</th>}
                  <th className="px-5 py-3">RSVP</th>
                  {usesPlusOnes && <th className="px-5 py-3">Type</th>}
                  <th className="px-5 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {guests.map((guest) => (
                  <tr key={guest.id} className="hover:bg-gray-50/70 transition-colors">
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-3">
                        <span className={`flex items-center justify-center h-9 w-9 rounded-full text-xs font-bold shrink-0 ${guestColor(guest)}`}>{guestInitials(guest)}</span>
                        <span className="font-medium text-gray-900">{guest.firstName} {guest.lastName}</span>
                      </div>
                    </td>
                    <td className="px-5 py-3 text-gray-500 tabular-nums whitespace-nowrap">{guest.phone || '—'}</td>
                    <td className="px-5 py-3"><span className="badge-info">{guest.category || 'Autre'}</span></td>
                    {usesTables && <td className="px-5 py-3 text-gray-600">{guest.tableNumber || <span className="text-gray-300">—</span>}</td>}
                    <td className="px-5 py-3">{getRsvpBadge(guest.rsvpStatus)}</td>
                    {usesPlusOnes && (
                      <td className="px-5 py-3">
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${guest.plusOnes > 0 ? 'bg-rose-100 text-rose-700' : 'bg-gray-100 text-gray-600'}`}>
                          {guest.plusOnes > 0 ? '👫 Couple' : '🧍 Singleton'}
                        </span>
                      </td>
                    )}
                    <td className="px-5 py-3">
                      <div className="flex justify-end"><GuestActions guest={guest} /></div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile: cards (no horizontal scroll) */}
          <div className="lg:hidden space-y-3">
            {guests.map((guest) => (
              <div key={guest.id} className="bg-white rounded-xl shadow-sm ring-1 ring-gray-100 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <span className={`flex items-center justify-center h-10 w-10 rounded-full text-sm font-bold shrink-0 ${guestColor(guest)}`}>{guestInitials(guest)}</span>
                    <div className="min-w-0">
                      <p className="font-semibold text-gray-900 truncate">{guest.firstName} {guest.lastName}</p>
                      {guest.phone && <p className="text-xs text-gray-500 tabular-nums">{guest.phone}</p>}
                    </div>
                  </div>
                  {getRsvpBadge(guest.rsvpStatus)}
                </div>

                <div className="mt-3 flex flex-wrap items-center gap-1.5">
                  <span className="badge-info">{guest.category || 'Autre'}</span>
                  {usesTables && guest.tableNumber && (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-600">🪑 {guest.tableNumber}</span>
                  )}
                  {usesPlusOnes && (
                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${guest.plusOnes > 0 ? 'bg-rose-100 text-rose-700' : 'bg-gray-100 text-gray-600'}`}>
                      {guest.plusOnes > 0 ? '👫 Couple' : '🧍 Singleton'}
                    </span>
                  )}
                </div>

                <div className="mt-3 pt-3 border-t border-gray-100 flex justify-end">
                  <GuestActions guest={guest} />
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {/* Add/Edit Modal */}
      {(showAddModal || editingGuest) && (
        <GuestModal
          guest={editingGuest}
          weddingId={weddingId}
          eventType={wedding?.eventType}
          usesTables={usesTables}
          usesPlusOnes={usesPlusOnes}
          onClose={() => {
            setShowAddModal(false)
            setEditingGuest(null)
          }}
        />
      )}

      <BuyQuotaModal
        weddingId={weddingId}
        isOpen={showBuyModal}
        onClose={() => setShowBuyModal(false)}
      />

      {showWaBulk && (
        <WhatsAppBulkModal
          weddingId={weddingId}
          onClose={() => { setShowWaBulk(false); queryClient.invalidateQueries(['guests', weddingId]); queryClient.invalidateQueries(['seating', weddingId]) }}
        />
      )}
    </div>
  )
}

// Modal that lists guests (filterable) each with a 1-click WhatsApp send.
// wa.me can't bulk-send, so this gives a fast "go down the list" workflow.
function WhatsAppBulkModal({ weddingId, onClose }) {
  const queryClient = useQueryClient()
  const [filter, setFilter] = useState('PENDING') // '', 'PENDING', 'unsent'
  const params = filter === 'unsent' ? { onlyUnsent: 'true' } : (filter ? { status: filter } : {})

  const { data, isLoading, refetch } = useQuery(
    ['wa-bulk', weddingId, filter],
    () => guestAPI.whatsappBulk(weddingId, params),
    { keepPreviousData: true }
  )
  const shares = data?.data?.shares || []
  const [sentIds, setSentIds] = useState(() => new Set())
  const [sendingId, setSendingId] = useState(null)

  const sendOne = async (share) => {
    setSendingId(share.guestId)
    const win = window.open('', '_blank')
    try {
      if (win) win.location.href = share.waUrl
      else window.location.href = share.waUrl
      await guestAPI.markSent(weddingId, share.guestId)
      setSentIds(prev => new Set(prev).add(share.guestId))
      queryClient.invalidateQueries(['guests', weddingId]); queryClient.invalidateQueries(['seating', weddingId])
    } catch {
      if (win) win.close()
      toast.error('Échec de l\'envoi')
    } finally {
      setSendingId(null)
    }
  }

  const copyLink = async (share) => {
    try { await navigator.clipboard.writeText(share.invitationUrl); toast.success('Lien copié') }
    catch { toast.error('Copie impossible') }
  }

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-xl shadow-xl w-full max-w-lg max-h-[85vh] flex flex-col" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between p-4 border-b">
          <div className="flex items-center gap-2">
            <WhatsAppIcon className="h-5 w-5 text-[#25D366]" />
            <h3 className="font-semibold text-gray-800">Envoi WhatsApp</h3>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl leading-none">✕</button>
        </div>

        <div className="p-4 border-b flex items-center gap-2">
          {[
            { v: 'PENDING', label: 'En attente' },
            { v: 'unsent', label: 'Non envoyés' },
            { v: '', label: 'Tous' }
          ].map(opt => (
            <button
              key={opt.v}
              onClick={() => setFilter(opt.v)}
              className={`px-3 py-1.5 text-xs rounded-full font-medium transition-colors ${
                filter === opt.v ? 'bg-primary-100 text-primary-700' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
              }`}
            >
              {opt.label}
            </button>
          ))}
          <button onClick={() => refetch()} className="ml-auto text-xs text-primary-600 hover:underline">Actualiser</button>
        </div>

        <div className="flex-1 overflow-y-auto p-2">
          {isLoading ? (
            <p className="text-center text-sm text-gray-400 py-8">Chargement…</p>
          ) : shares.length === 0 ? (
            <p className="text-center text-sm text-gray-400 py-8">Aucun invité dans cette liste.</p>
          ) : (
            <ul className="divide-y divide-gray-100">
              {shares.map(share => {
                const done = sentIds.has(share.guestId)
                return (
                  <li key={share.guestId} className="flex items-center gap-2 p-2">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-800 truncate">{share.guestName}</p>
                      <p className="text-xs text-gray-400 truncate">
                        {share.hasPhone ? `+${share.phone}` : 'Pas de numéro'}
                      </p>
                    </div>
                    <button
                      onClick={() => copyLink(share)}
                      className="px-2 py-1 text-xs rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50"
                      title="Copier le lien personnalisé"
                    >
                      Lien
                    </button>
                    <button
                      onClick={() => sendOne(share)}
                      disabled={sendingId === share.guestId}
                      className={`inline-flex items-center gap-1 px-3 py-1 text-xs rounded-lg font-medium text-white disabled:opacity-50 ${done ? 'bg-green-600' : ''}`}
                      style={done ? {} : { backgroundColor: '#25D366' }}
                    >
                      <WhatsAppIcon className="h-3.5 w-3.5" />
                      {sendingId === share.guestId ? '…' : done ? 'Envoyé ✓' : 'Envoyer'}
                    </button>
                  </li>
                )
              })}
            </ul>
          )}
        </div>

        <div className="p-3 border-t bg-gray-50 text-[11px] text-gray-500 rounded-b-xl">
          Astuce : chaque envoi ouvre WhatsApp avec le message + le lien personnalisé pré-remplis. Cliquez « Envoyer » dans WhatsApp puis revenez ici pour le suivant.
        </div>
      </div>
    </div>
  )
}

function GuestModal({ guest, weddingId, eventType, usesTables = true, usesPlusOnes = true, onClose }) {
  const queryClient = useQueryClient()
  const categoryOptions = getGuestCategoryOptions(eventType)
  const [formData, setFormData] = useState({
    firstName: guest?.firstName || '',
    lastName: guest?.lastName || '',
    phone: guest?.phone || '',
    category: guest?.category || '',
    tableNumber: guest?.tableNumber || '',
    plusOnes: guest?.plusOnes || 0,
    notes: guest?.notes || ''
  })

  // Load wedding tables
  const { data: tablesData } = useQuery(
    ['weddingTables', weddingId],
    () => weddingAPI.getTables(weddingId),
    { staleTime: 30000 }
  )
  const tables = tablesData?.data?.tables || []

  const createMutation = useMutation(
    (data) => guestAPI.create(weddingId, data),
    {
      onSuccess: () => {
        toast.success('Invité ajouté')
        queryClient.invalidateQueries(['guests', weddingId]); queryClient.invalidateQueries(['seating', weddingId])
        onClose()
      }
    }
  )

  const updateMutation = useMutation(
    (data) => guestAPI.update(weddingId, guest.id, data),
    {
      onSuccess: () => {
        toast.success('Invité mis à jour')
        queryClient.invalidateQueries(['guests', weddingId]); queryClient.invalidateQueries(['seating', weddingId])
        onClose()
      }
    }
  )

  const handleSubmit = (e) => {
    e.preventDefault()
    if (guest) {
      updateMutation.mutate(formData)
    } else {
      createMutation.mutate(formData)
    }
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="p-6 border-b">
          <h2 className="text-xl font-serif font-bold">
            {guest ? 'Modifier l\'invité' : 'Ajouter un invité'}
          </h2>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Prénom</label>
              <input
                type="text"
                className="input"
                value={formData.firstName}
                onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                required
              />
            </div>
            <div>
              <label className="label">Nom</label>
              <input
                type="text"
                className="input"
                value={formData.lastName}
                onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                required
              />
            </div>
          </div>
          <div>
            <label className="label">Téléphone (WhatsApp) <span className="text-gray-400 font-normal">— optionnel</span></label>
            <input
              type="tel"
              className="input"
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
            />
          </div>
          <div className={usesTables ? 'grid grid-cols-2 gap-4' : ''}>
            <div>
              <label className="label">Catégorie</label>
              <select
                className="input"
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
              >
                <option value="">Sélectionner</option>
                {categoryOptions.map((opt) => (
                  <option key={opt} value={opt}>{opt}</option>
                ))}
              </select>
            </div>
            {usesTables && (
              <div>
                <label className="label">Table</label>
                {tables.length > 0 ? (
                  <select
                    className="input"
                    value={formData.tableNumber}
                    onChange={(e) => setFormData({ ...formData, tableNumber: e.target.value })}
                  >
                    <option value="">-- Sélectionner une table --</option>
                    {tables.map((t) => {
                      const name = tableName(t)
                      return <option key={name} value={name}>{name}</option>
                    })}
                  </select>
                ) : (
                  <div>
                    <input
                      type="text"
                      className="input"
                      value={formData.tableNumber}
                      onChange={(e) => setFormData({ ...formData, tableNumber: e.target.value })}
                      placeholder="Nom de la table"
                    />
                    <p className="text-xs text-gray-400 mt-1">
                      💡 Ajoutez des tables dans les détails de l'événement pour les retrouver ici en liste
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>
          {usesPlusOnes && (
            <div>
              <label className="label">Type d'invitation</label>
              <div className="grid grid-cols-2 gap-3 mt-1">
                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, plusOnes: 0 })}
                  className={`flex items-center justify-center gap-2 px-4 py-3 rounded-xl border-2 font-medium transition-all ${
                    formData.plusOnes === 0
                      ? 'border-primary-600 bg-primary-50 text-primary-700'
                      : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300'
                  }`}
                >
                  <span className="text-xl">🧍</span>
                  <div className="text-left">
                    <p className="text-sm font-semibold">Singleton</p>
                    <p className="text-xs opacity-70">1 personne</p>
                  </div>
                </button>
                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, plusOnes: 1 })}
                  className={`flex items-center justify-center gap-2 px-4 py-3 rounded-xl border-2 font-medium transition-all ${
                    formData.plusOnes > 0
                      ? 'border-primary-600 bg-primary-50 text-primary-700'
                      : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300'
                  }`}
                >
                  <span className="text-xl">👫</span>
                  <div className="text-left">
                    <p className="text-sm font-semibold">Couple</p>
                    <p className="text-xs opacity-70">2 personnes</p>
                  </div>
                </button>
              </div>
            </div>
          )}
          <div>
            <label className="label">Notes</label>
            <textarea
              className="input"
              rows={2}
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
            />
          </div>
          <div className="flex justify-end gap-4 pt-4">
            <button type="button" onClick={onClose} className="btn-secondary">
              Annuler
            </button>
            <button
              type="submit"
              disabled={createMutation.isLoading || updateMutation.isLoading}
              className="btn-primary"
            >
              {guest ? 'Enregistrer' : 'Ajouter'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
