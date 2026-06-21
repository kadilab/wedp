import { useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from 'react-query'
import { guestAPI, weddingAPI, invitationOrderAPI } from '../../services/api'
import BuyQuotaModal from '../../components/invitations/BuyQuotaModal'
import { getGuestCategoryOptions } from '../../utils/eventTypes'
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

export default function Guests() {
  const { id: weddingId } = useParams()
  const [search, setSearch] = useState('')
  const [rsvpFilter, setRsvpFilter] = useState('')
  const [showAddModal, setShowAddModal] = useState(false)
  const [editingGuest, setEditingGuest] = useState(null)
  const [showBuyModal, setShowBuyModal] = useState(false)
  const queryClient = useQueryClient()

  const { data: weddingData } = useQuery(['wedding', weddingId], () => weddingAPI.getOne(weddingId))
  const wedding = weddingData?.data?.wedding

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
        queryClient.invalidateQueries(['guests', weddingId])
      }
    }
  )

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

  const getRsvpBadge = (status) => {
    switch (status) {
      case 'CONFIRMED': return <span className="badge-success">Confirmé</span>
      case 'DECLINED': return <span className="badge-danger">Décliné</span>
      case 'PENDING': return <span className="badge-warning">En attente</span>
      default: return <span className="badge">{status}</span>
    }
  }

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
        <div className="flex items-center gap-2">
          <button onClick={() => exportGuests('csv')} className="btn-secondary btn-sm">
            <ArrowDownTrayIcon className="h-4 w-4 mr-1" />
            CSV
          </button>
          <button onClick={() => exportGuests('xlsx')} className="btn-secondary btn-sm">
            <ArrowDownTrayIcon className="h-4 w-4 mr-1" />
            Excel
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
        <div className="bg-white rounded-xl shadow-lg overflow-hidden">
          <div className="table-container">
            <table className="table">
              <thead>
                <tr>
                  <th>Nom</th>
                  <th>Téléphone</th>
                  <th>Catégorie</th>
                  <th>Table</th>
                  <th>RSVP</th>
                  <th>Type</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {guests.map((guest) => (
                  <tr key={guest.id}>
                    <td className="font-medium">
                      {guest.firstName} {guest.lastName}
                    </td>
                    <td className="text-gray-500">{guest.phone || '-'}</td>
                    <td>
                      <span className="badge-info">{guest.category || 'Autre'}</span>
                    </td>
                    <td>{guest.tableNumber || '-'}</td>
                    <td>{getRsvpBadge(guest.rsvpStatus)}</td>
                    <td>
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${guest.plusOnes > 0 ? 'bg-rose-100 text-rose-700' : 'bg-gray-100 text-gray-600'}`}>
                        {guest.plusOnes > 0 ? '👫 Couple' : '🧍 Singleton'}
                      </span>
                    </td>
                    <td>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => setEditingGuest(guest)}
                          className="p-1 text-gray-500 hover:text-primary-600"
                        >
                          <PencilIcon className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => {
                            if (window.confirm('Supprimer cet invité ?')) {
                              deleteMutation.mutate(guest.id)
                            }
                          }}
                          className="p-1 text-gray-500 hover:text-red-600"
                        >
                          <TrashIcon className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Add/Edit Modal */}
      {(showAddModal || editingGuest) && (
        <GuestModal
          guest={editingGuest}
          weddingId={weddingId}
          eventType={wedding?.eventType}
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
    </div>
  )
}

function GuestModal({ guest, weddingId, eventType, onClose }) {
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
        queryClient.invalidateQueries(['guests', weddingId])
        onClose()
      }
    }
  )

  const updateMutation = useMutation(
    (data) => guestAPI.update(weddingId, guest.id, data),
    {
      onSuccess: () => {
        toast.success('Invité mis à jour')
        queryClient.invalidateQueries(['guests', weddingId])
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
            <label className="label">Téléphone (WhatsApp)</label>
            <input
              type="tel"
              className="input"
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
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
            <div>
              <label className="label">Table</label>
              {tables.length > 0 ? (
                <select
                  className="input"
                  value={formData.tableNumber}
                  onChange={(e) => setFormData({ ...formData, tableNumber: e.target.value })}
                >
                  <option value="">-- Sélectionner une table --</option>
                  {tables.map((t) => (
                    <option key={t} value={t}>{t}</option>
                  ))}
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
                    💡 Ajoutez des tables dans les détails du mariage pour les retrouver ici en liste
                  </p>
                </div>
              )}
            </div>
          </div>
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
