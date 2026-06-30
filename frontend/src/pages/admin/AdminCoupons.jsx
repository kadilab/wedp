import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from 'react-query'
import { adminAPI } from '../../services/api'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'
import toast from 'react-hot-toast'
import {
  PlusIcon,
  PencilIcon,
  TrashIcon,
  XMarkIcon,
  TicketIcon,
  ExclamationTriangleIcon,
  ClipboardDocumentIcon
} from '@heroicons/react/24/outline'

export default function AdminCoupons() {
  const queryClient = useQueryClient()
  const [showModal, setShowModal] = useState(false)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [selectedCoupon, setSelectedCoupon] = useState(null)
  const [formData, setFormData] = useState({
    code: '',
    description: '',
    discountType: 'percentage',
    discountValue: 10,
    maxUses: 100,
    minPurchase: '',
    validUntil: '',
    isActive: true
  })

  const { data: couponsData, isLoading } = useQuery('admin-coupons', () =>
    adminAPI.getCoupons()
  )
  const coupons = couponsData?.data?.coupons || []

  const createMutation = useMutation((data) => adminAPI.createCoupon(data), {
    onSuccess: () => {
      queryClient.invalidateQueries('admin-coupons')
      toast.success('Coupon créé')
      resetForm()
    },
    onError: (err) => toast.error(err.response?.data?.message || 'Erreur')
  })

  const updateMutation = useMutation(
    ({ id, data }) => adminAPI.updateCoupon(id, data),
    {
      onSuccess: () => {
        queryClient.invalidateQueries('admin-coupons')
        toast.success('Coupon mis à jour')
        resetForm()
      },
      onError: (err) => toast.error(err.response?.data?.message || 'Erreur')
    }
  )

  const deleteMutation = useMutation((id) => adminAPI.deleteCoupon(id), {
    onSuccess: () => {
      queryClient.invalidateQueries('admin-coupons')
      toast.success('Coupon supprimé')
      setShowDeleteModal(false)
    },
    onError: (err) => toast.error(err.response?.data?.message || 'Erreur')
  })

  const resetForm = () => {
    setFormData({
      code: '',
      description: '',
      discountType: 'percentage',
      discountValue: 10,
      maxUses: 100,
      minPurchase: '',
      validUntil: '',
      isActive: true
    })
    setSelectedCoupon(null)
    setShowModal(false)
  }

  const handleEdit = (coupon) => {
    setSelectedCoupon(coupon)
    setFormData({
      code: coupon.code,
      description: coupon.description || '',
      discountType: coupon.discountType || 'percentage',
      discountValue: coupon.discountValue,
      maxUses: coupon.maxUses || '',
      minPurchase: coupon.minPurchase || '',
      validUntil: coupon.validUntil
        ? new Date(coupon.validUntil).toISOString().split('T')[0]
        : '',
      isActive: coupon.isActive !== false
    })
    setShowModal(true)
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    // Omit empty optional fields entirely rather than sending null - the
    // backend's express-validator .optional() only skips undefined values,
    // an explicit null would fail isInt()/isISO8601() and reject the request.
    const data = {
      code: formData.code,
      description: formData.description || undefined,
      discountType: formData.discountType,
      discountValue: parseFloat(formData.discountValue),
      isActive: formData.isActive,
      ...(formData.maxUses && { maxUses: parseInt(formData.maxUses) }),
      ...(formData.minPurchase && { minPurchase: parseFloat(formData.minPurchase) }),
      ...(formData.validUntil && { validUntil: new Date(formData.validUntil).toISOString() })
    }
    if (selectedCoupon) {
      updateMutation.mutate({ id: selectedCoupon.id, data })
    } else {
      createMutation.mutate(data)
    }
  }

  const generateCode = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
    let code = 'WED'
    for (let i = 0; i < 6; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length))
    }
    setFormData({ ...formData, code })
  }

  const copyCode = (code) => {
    navigator.clipboard.writeText(code)
    toast.success('Code copié !')
  }

  const isExpired = (date) => {
    if (!date) return false
    return new Date(date) < new Date()
  }

  const DISCOUNT_TYPE_LABELS = { percentage: '%', fixed: '$' }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-serif font-bold text-gray-900">Coupons</h1>
          <p className="text-gray-600 mt-1">Gérez les codes de réduction</p>
        </div>
        <button onClick={() => setShowModal(true)} className="btn-primary">
          <PlusIcon className="h-5 w-5 mr-2" />
          Nouveau coupon
        </button>
      </div>

      {/* Coupons Table */}
      <div className="bg-white rounded-xl shadow-lg overflow-hidden">
        {isLoading ? (
          <div className="p-12 text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto"></div>
          </div>
        ) : coupons.length === 0 ? (
          <div className="p-12 text-center">
            <TicketIcon className="h-16 w-16 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500">Aucun coupon créé</p>
          </div>
        ) : (
          <div className="table-container">
            <table className="table">
              <thead>
                <tr>
                  <th>Code</th>
                  <th>Réduction</th>
                  <th>Utilisations</th>
                  <th>Expiration</th>
                  <th>Statut</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {coupons.map((coupon) => (
                  <tr key={coupon.id}>
                    <td>
                      <div className="flex items-center">
                        <span className="font-mono font-bold text-primary-600 bg-primary-50 px-3 py-1 rounded">
                          {coupon.code}
                        </span>
                        <button
                          onClick={() => copyCode(coupon.code)}
                          className="ml-2 p-1 text-gray-400 hover:text-gray-600"
                        >
                          <ClipboardDocumentIcon className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                    <td>
                      <span className="font-semibold text-green-600">
                        -{coupon.discountValue}{DISCOUNT_TYPE_LABELS[coupon.discountType] || ''}
                      </span>
                      {coupon.minPurchase && (
                        <p className="text-xs text-gray-400">dès {coupon.minPurchase}$</p>
                      )}
                    </td>
                    <td>
                      <span className="text-gray-600">
                        {coupon._count?.usages || 0}{coupon.maxUses ? ` / ${coupon.maxUses}` : ''}
                      </span>
                    </td>
                    <td className="text-sm text-gray-500">
                      {coupon.validUntil
                        ? format(new Date(coupon.validUntil), 'd MMM yyyy', { locale: fr })
                        : 'Jamais'}
                    </td>
                    <td>
                      {!coupon.isActive ? (
                        <span className="badge">Désactivé</span>
                      ) : isExpired(coupon.validUntil) ? (
                        <span className="badge-danger">Expiré</span>
                      ) : coupon.maxUses && (coupon._count?.usages || 0) >= coupon.maxUses ? (
                        <span className="badge-warning">Épuisé</span>
                      ) : (
                        <span className="badge-success">Actif</span>
                      )}
                    </td>
                    <td>
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => handleEdit(coupon)}
                          className="p-2 text-gray-600 hover:text-primary-600 hover:bg-primary-50 rounded-lg transition-colors"
                        >
                          <PencilIcon className="h-5 w-5" />
                        </button>
                        <button
                          onClick={() => {
                            setSelectedCoupon(coupon)
                            setShowDeleteModal(true)
                          }}
                          className="p-2 text-gray-600 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        >
                          <TrashIcon className="h-5 w-5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Create/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full">
            <div className="flex items-center justify-between p-6 border-b">
              <h3 className="text-xl font-serif font-bold text-gray-900">
                {selectedCoupon ? 'Modifier le coupon' : 'Nouveau coupon'}
              </h3>
              <button onClick={resetForm} className="text-gray-500 hover:text-gray-700">
                <XMarkIcon className="h-6 w-6" />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Code du coupon
                </label>
                <div className="flex space-x-2">
                  <input
                    type="text"
                    className="input flex-1 font-mono uppercase"
                    value={formData.code}
                    onChange={(e) =>
                      setFormData({ ...formData, code: e.target.value.toUpperCase() })
                    }
                    required
                  />
                  <button
                    type="button"
                    onClick={generateCode}
                    className="btn-secondary whitespace-nowrap"
                  >
                    Générer
                  </button>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Description (optionnel)
                </label>
                <input
                  type="text"
                  className="input"
                  placeholder="Ex: Promo lancement"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Type de réduction
                  </label>
                  <select
                    className="input"
                    value={formData.discountType}
                    onChange={(e) => setFormData({ ...formData, discountType: e.target.value })}
                  >
                    <option value="percentage">Pourcentage (%)</option>
                    <option value="fixed">Montant fixe (FC)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Valeur {formData.discountType === 'percentage' ? '(%)' : '(FC)'}
                  </label>
                  <input
                    type="number"
                    className="input"
                    min="0"
                    max={formData.discountType === 'percentage' ? 100 : undefined}
                    step="0.01"
                    value={formData.discountValue}
                    onChange={(e) =>
                      setFormData({ ...formData, discountValue: e.target.value })
                    }
                    required
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Utilisations max (optionnel)
                  </label>
                  <input
                    type="number"
                    className="input"
                    min="1"
                    placeholder="Illimité"
                    value={formData.maxUses}
                    onChange={(e) => setFormData({ ...formData, maxUses: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Achat minimum FC (optionnel)
                  </label>
                  <input
                    type="number"
                    className="input"
                    min="0"
                    step="0.01"
                    value={formData.minPurchase}
                    onChange={(e) => setFormData({ ...formData, minPurchase: e.target.value })}
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Date d'expiration (optionnel)
                </label>
                <input
                  type="date"
                  className="input"
                  value={formData.validUntil}
                  onChange={(e) => setFormData({ ...formData, validUntil: e.target.value })}
                />
              </div>
              {selectedCoupon && (
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.isActive}
                    onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                    className="h-4 w-4 text-green-600 rounded"
                  />
                  <span className="text-sm">Coupon actif</span>
                </label>
              )}
              <div className="flex space-x-4 pt-4">
                <button type="button" onClick={resetForm} className="flex-1 btn-secondary">
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={createMutation.isLoading || updateMutation.isLoading}
                  className="flex-1 btn-primary"
                >
                  {createMutation.isLoading || updateMutation.isLoading
                    ? 'Enregistrement...'
                    : 'Enregistrer'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Modal */}
      {showDeleteModal && selectedCoupon && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6">
            <div className="text-center">
              <ExclamationTriangleIcon className="h-16 w-16 text-red-500 mx-auto mb-4" />
              <h3 className="text-xl font-bold text-gray-900 mb-2">Supprimer le coupon</h3>
              <p className="text-gray-600 mb-6">
                Êtes-vous sûr de vouloir supprimer le coupon{' '}
                <strong className="font-mono">{selectedCoupon.code}</strong> ?
              </p>
              <div className="flex space-x-4">
                <button
                  onClick={() => setShowDeleteModal(false)}
                  className="flex-1 btn-secondary"
                >
                  Annuler
                </button>
                <button
                  onClick={() => deleteMutation.mutate(selectedCoupon.id)}
                  disabled={deleteMutation.isLoading}
                  className="flex-1 bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700"
                >
                  {deleteMutation.isLoading ? 'Suppression...' : 'Supprimer'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
