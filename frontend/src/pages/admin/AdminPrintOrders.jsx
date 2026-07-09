import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from 'react-query'
import { adminAPI } from '../../services/api'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'
import toast from 'react-hot-toast'
import {
  PrinterIcon,
  EyeIcon,
  CheckCircleIcon,
  XCircleIcon,
  ClockIcon,
  XMarkIcon,
  TruckIcon,
  CubeIcon,
  DocumentTextIcon,
  UserIcon,
  MapPinIcon,
  PhoneIcon,
  ArrowDownTrayIcon,
  DocumentArrowDownIcon,
  RectangleGroupIcon,
  ArrowPathIcon
} from '@heroicons/react/24/outline'

const STATUS_MAP = {
  PENDING: { label: 'En attente', color: 'yellow', icon: ClockIcon },
  CONFIRMED: { label: 'Confirmée', color: 'blue', icon: CheckCircleIcon },
  PRINTING: { label: 'En impression', color: 'purple', icon: PrinterIcon },
  SHIPPED: { label: 'Expédiée', color: 'indigo', icon: TruckIcon },
  DELIVERED: { label: 'Livrée', color: 'green', icon: CubeIcon },
  CANCELLED: { label: 'Annulée', color: 'red', icon: XCircleIcon }
}

const PAPER_TYPES = {
  standard: 'Standard',
  premium: 'Premium',
  luxury: 'Luxe'
}

const FINISHES = {
  mat: 'Mat',
  glossy: 'Brillant',
  satin: 'Satiné'
}

const PRINT_SIZES = {
  A6: 'A6 (10.5×14.8cm)',
  A5: 'A5 (14.8×21cm)',
  custom: 'Personnalisé'
}

export default function AdminPrintOrders() {
  const queryClient = useQueryClient()
  const [statusFilter, setStatusFilter] = useState('PENDING')
  const [selectedOrder, setSelectedOrder] = useState(null)
  const [showViewModal, setShowViewModal] = useState(false)
  const [trackingNumber, setTrackingNumber] = useState('')
  const [estimatedDelivery, setEstimatedDelivery] = useState('')
  const [printLayoutResult, setPrintLayoutResult] = useState(null)
  const [printLayoutSize, setPrintLayoutSize] = useState('')

  const { data: ordersData, isLoading } = useQuery(
    ['admin-print-orders', statusFilter],
    () => adminAPI.getPrintOrders({ status: statusFilter })
  )
  const orders = ordersData?.data?.orders || []

  const updateStatusMutation = useMutation(
    ({ id, status, trackingNumber, estimatedDelivery }) => 
      adminAPI.updatePrintOrderStatus(id, { status, trackingNumber, estimatedDelivery }),
    {
      onSuccess: () => {
        queryClient.invalidateQueries('admin-print-orders')
        queryClient.invalidateQueries('admin-stats')
        toast.success('Statut mis à jour')
        setShowViewModal(false)
        setTrackingNumber('')
        setEstimatedDelivery('')
      },
      onError: (err) => toast.error(err.response?.data?.error || 'Erreur')
    }
  )

  const generatePrintLayoutMutation = useMutation(
    ({ orderId, printSize }) => adminAPI.generatePrintLayoutPDF({ orderId, printSize }),
    {
      onSuccess: (res) => {
        setPrintLayoutResult(res.data)
        toast.success('PDF prêt à imprimer généré !')
      },
      onError: (err) => toast.error(err.response?.data?.error || 'Erreur lors de la génération')
    }
  )

  const handleStatusChange = (newStatus) => {
    if (!selectedOrder) return
    updateStatusMutation.mutate({
      id: selectedOrder.id,
      status: newStatus,
      trackingNumber: newStatus === 'SHIPPED' ? trackingNumber : undefined,
      estimatedDelivery: estimatedDelivery || undefined
    })
  }

  const getStatusBadge = (status) => {
    const statusInfo = STATUS_MAP[status] || STATUS_MAP.PENDING
    const Icon = statusInfo.icon
    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-${statusInfo.color}-100 text-${statusInfo.color}-700`}>
        <Icon className="h-4 w-4 mr-1" />
        {statusInfo.label}
      </span>
    )
  }

  const pendingCount = orders.filter(o => o.status === 'PENDING').length

  const formatPrice = (price) => {
    return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(price || 0)
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-serif font-bold text-gray-900 flex items-center">
            <PrinterIcon className="h-8 w-8 mr-3 text-primary-500" />
            Commandes d'impression
          </h1>
          <p className="text-gray-600 mt-1">Gérez les commandes d'impression des utilisateurs</p>
        </div>
        {statusFilter === 'PENDING' && pendingCount > 0 && (
          <span className="bg-yellow-100 text-yellow-700 px-4 py-2 rounded-lg font-medium animate-pulse">
            {pendingCount} commande(s) en attente
          </span>
        )}
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl shadow-lg p-6">
        <div className="flex flex-wrap gap-2">
          {[
            { value: '', label: 'Toutes' },
            { value: 'PENDING', label: 'En attente' },
            { value: 'CONFIRMED', label: 'Confirmées' },
            { value: 'PRINTING', label: 'En impression' },
            { value: 'SHIPPED', label: 'Expédiées' },
            { value: 'DELIVERED', label: 'Livrées' },
            { value: 'CANCELLED', label: 'Annulées' }
          ].map((filter) => (
            <button
              key={filter.value}
              onClick={() => setStatusFilter(filter.value)}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                statusFilter === filter.value
                  ? 'bg-primary-600 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {filter.label}
            </button>
          ))}
        </div>
      </div>

      {/* Orders Table */}
      <div className="bg-white rounded-xl shadow-lg overflow-hidden">
        {isLoading ? (
          <div className="p-12 text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto"></div>
          </div>
        ) : orders.length === 0 ? (
          <div className="p-12 text-center">
            <PrinterIcon className="h-16 w-16 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500">Aucune commande trouvée</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full table-responsive">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Client</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Mariage</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Détails</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Prix</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Statut</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {orders.map((order) => (
                  <tr key={order.id} className={order.status === 'PENDING' ? 'bg-yellow-50' : ''}>
                    <td data-label="Client" className="px-4 py-4">
                      <div>
                        <p className="font-medium text-gray-900">
                          {order.user?.firstName} {order.user?.lastName}
                        </p>
                        <p className="text-sm text-gray-500">{order.user?.email}</p>
                      </div>
                    </td>
                    <td data-label="Mariage" className="px-4 py-4">
                      <p className="font-medium text-gray-900">
                        {order.wedding?.brideName} & {order.wedding?.groomName}
                      </p>
                      {order.wedding?.template?.name && (
                        <p className="text-xs text-gray-500 mt-0.5">{order.wedding.template.name}</p>
                      )}
                    </td>
                    <td data-label="Détails" className="px-4 py-4">
                      <div className="text-sm">
                        <p><span className="font-medium">{order.quantity}</span> exemplaires</p>
                        <p className="text-gray-500">{PAPER_TYPES[order.paperType]} • {FINISHES[order.finish]} • {PRINT_SIZES[order.size] || order.size}</p>
                      </div>
                    </td>
                    <td data-label="Prix" className="px-4 py-4 font-semibold text-gray-900">
                      {formatPrice(order.price)}
                    </td>
                    <td data-label="Date" className="px-4 py-4 text-sm text-gray-500">
                      {format(new Date(order.createdAt), 'd MMM yyyy', { locale: fr })}
                    </td>
                    <td data-label="Statut" className="px-4 py-4">
                      {getStatusBadge(order.status)}
                    </td>
                    <td className="cell-actions px-4 py-4">
                      <button
                        onClick={() => {
                          setSelectedOrder(order)
                          setTrackingNumber(order.trackingNumber || '')
                          setEstimatedDelivery(order.estimatedDelivery ? format(new Date(order.estimatedDelivery), 'yyyy-MM-dd') : '')
                          setPrintLayoutResult(null)
                          setPrintLayoutSize(order.size || 'A6')
                          setShowViewModal(true)
                        }}
                        className="p-2 text-gray-600 hover:text-primary-600 hover:bg-primary-50 rounded-lg transition-colors"
                      >
                        <EyeIcon className="h-5 w-5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* View/Update Modal */}
      {showViewModal && selectedOrder && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b sticky top-0 bg-white">
              <h3 className="text-xl font-serif font-bold text-gray-900">
                Commande #{selectedOrder.id.slice(0, 8)}
              </h3>
              <button onClick={() => setShowViewModal(false)} className="text-gray-500 hover:text-gray-700">
                <XMarkIcon className="h-6 w-6" />
              </button>
            </div>
            
            <div className="p-6 space-y-6">
              {/* Client Info */}
              <div className="bg-gray-50 rounded-xl p-4">
                <h4 className="font-medium text-gray-900 mb-3 flex items-center">
                  <UserIcon className="h-5 w-5 mr-2 text-primary-500" />
                  Client
                </h4>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-gray-500">Nom</p>
                    <p className="font-medium">{selectedOrder.user?.firstName} {selectedOrder.user?.lastName}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Email</p>
                    <p className="font-medium">{selectedOrder.user?.email}</p>
                  </div>
                </div>
              </div>

              {/* Wedding Info */}
              <div className="bg-primary-50 rounded-xl p-4">
                <h4 className="font-medium text-gray-900 mb-3">Mariage</h4>
                <p className="text-lg font-semibold text-primary-700">
                  {selectedOrder.wedding?.brideName} & {selectedOrder.wedding?.groomName}
                </p>
                {selectedOrder.wedding?.template && (
                  <div className="mt-2 text-sm text-gray-600">
                    <span className="font-medium">Template :</span> {selectedOrder.wedding.template.name}
                    {selectedOrder.wedding.template.config?.canvasWidth && (
                      <span className="ml-2 text-xs bg-white px-2 py-0.5 rounded">
                        {selectedOrder.wedding.template.config.canvasWidth}×{selectedOrder.wedding.template.config.canvasHeight}px
                        {selectedOrder.wedding.template.config.selectedFormat && (
                          <> — {selectedOrder.wedding.template.config.selectedFormat}</>
                        )}
                      </span>
                    )}
                  </div>
                )}
              </div>

              {/* Print Details */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-gray-50 rounded-xl p-4 text-center">
                  <p className="text-sm text-gray-500">Quantité</p>
                  <p className="text-2xl font-bold text-gray-900">{selectedOrder.quantity}</p>
                </div>
                <div className="bg-gray-50 rounded-xl p-4 text-center">
                  <p className="text-sm text-gray-500">Papier</p>
                  <p className="font-semibold text-gray-900">{PAPER_TYPES[selectedOrder.paperType]}</p>
                </div>
                <div className="bg-gray-50 rounded-xl p-4 text-center">
                  <p className="text-sm text-gray-500">Finition</p>
                  <p className="font-semibold text-gray-900">{FINISHES[selectedOrder.finish]}</p>
                </div>
                <div className="bg-gray-50 rounded-xl p-4 text-center">
                  <p className="text-sm text-gray-500">Format</p>
                  <p className="font-semibold text-gray-900">{selectedOrder.size}</p>
                </div>
              </div>

              {/* Price */}
              <div className="bg-green-50 rounded-xl p-4 flex justify-between items-center">
                <span className="text-gray-700 font-medium">Prix total</span>
                <span className="text-2xl font-bold text-green-700">{formatPrice(selectedOrder.price)}</span>
              </div>

              {/* Print Layout - Imposition */}
              <div className="bg-indigo-50 rounded-xl p-4 space-y-4">
                <h4 className="font-medium text-gray-900 flex items-center">
                  <RectangleGroupIcon className="h-5 w-5 mr-2 text-indigo-500" />
                  Mise en page impression (Imposition)
                </h4>
                <p className="text-sm text-gray-600">
                  Générez un PDF prêt à imprimer avec plusieurs invitations par page A4.
                  Le template est automatiquement adapté au format choisi en respectant ses proportions.
                  {selectedOrder.size && (
                    <span className="font-medium"> Format commandé : {PRINT_SIZES[selectedOrder.size] || selectedOrder.size}</span>
                  )}
                </p>
                <div className="flex flex-wrap items-end gap-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Format d'impression</label>
                    <select
                      value={printLayoutSize || selectedOrder.size || 'A6'}
                      onChange={(e) => setPrintLayoutSize(e.target.value)}
                      className="input text-sm"
                    >
                      {Object.entries(PRINT_SIZES).map(([key, label]) => {
                        const perPage = { A6: 4, A5: 2, custom: 2 }
                        return (
                          <option key={key} value={key}>
                            {label} — ~{perPage[key] || '?'} par page A4
                          </option>
                        )
                      })}
                    </select>
                  </div>
                  <button
                    onClick={() => generatePrintLayoutMutation.mutate({
                      orderId: selectedOrder.id,
                      printSize: printLayoutSize || selectedOrder.size || 'A6'
                    })}
                    disabled={generatePrintLayoutMutation.isLoading}
                    className="btn-primary text-sm flex items-center"
                  >
                    {generatePrintLayoutMutation.isLoading ? (
                      <>
                        <ArrowPathIcon className="h-4 w-4 mr-2 animate-spin" />
                        Génération en cours...
                      </>
                    ) : (
                      <>
                        <DocumentArrowDownIcon className="h-4 w-4 mr-2" />
                        Générer le PDF
                      </>
                    )}
                  </button>
                </div>

                {printLayoutResult && (
                  <div className="bg-white rounded-lg p-4 border border-indigo-200 mt-3">
                    <div className="flex items-center justify-between mb-3">
                      <h5 className="font-medium text-indigo-700">PDF généré avec succès</h5>
                      <a
                        href={printLayoutResult.pdfUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="btn-primary text-sm flex items-center"
                      >
                        <ArrowDownTrayIcon className="h-4 w-4 mr-2" />
                        Télécharger
                      </a>
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-sm">
                      <div className="bg-indigo-50 rounded p-2 text-center">
                        <p className="text-xs text-gray-500">Format</p>
                        <p className="font-semibold">{printLayoutResult.imposition?.size}</p>
                      </div>
                      <div className="bg-indigo-50 rounded p-2 text-center">
                        <p className="text-xs text-gray-500">Par page</p>
                        <p className="font-semibold">{printLayoutResult.imposition?.perPage}</p>
                      </div>
                      <div className="bg-indigo-50 rounded p-2 text-center">
                        <p className="text-xs text-gray-500">Pages</p>
                        <p className="font-semibold">{printLayoutResult.imposition?.totalPages}</p>
                      </div>
                      <div className="bg-indigo-50 rounded p-2 text-center">
                        <p className="text-xs text-gray-500">Invitations</p>
                        <p className="font-semibold">{printLayoutResult.imposition?.totalInvitations}</p>
                      </div>
                    </div>
                    {printLayoutResult.imposition?.cardWidth && (
                      <div className="mt-2 grid grid-cols-2 md:grid-cols-3 gap-2 text-sm">
                        <div className="bg-gray-50 rounded p-2 text-center">
                          <p className="text-xs text-gray-500">Taille carte</p>
                          <p className="font-semibold">{printLayoutResult.imposition.cardWidth}×{printLayoutResult.imposition.cardHeight} mm</p>
                        </div>
                        <div className="bg-gray-50 rounded p-2 text-center">
                          <p className="text-xs text-gray-500">Grille</p>
                          <p className="font-semibold">{printLayoutResult.imposition.cols} col × {printLayoutResult.imposition.rows} lig</p>
                        </div>
                        {printLayoutResult.imposition?.canvasWidth && (
                          <div className="bg-gray-50 rounded p-2 text-center">
                            <p className="text-xs text-gray-500">Template</p>
                            <p className="font-semibold">{printLayoutResult.imposition.canvasWidth}×{printLayoutResult.imposition.canvasHeight}px</p>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Shipping Address */}
              {selectedOrder.shippingAddress && (
                <div className="bg-gray-50 rounded-xl p-4">
                  <h4 className="font-medium text-gray-900 mb-3 flex items-center">
                    <MapPinIcon className="h-5 w-5 mr-2 text-primary-500" />
                    Adresse de livraison
                  </h4>
                  <p>{selectedOrder.shippingAddress}</p>
                  <p>{selectedOrder.shippingCity}, {selectedOrder.shippingCountry}</p>
                  {selectedOrder.shippingPhone && (
                    <p className="flex items-center mt-2">
                      <PhoneIcon className="h-4 w-4 mr-2 text-gray-400" />
                      {selectedOrder.shippingPhone}
                    </p>
                  )}
                </div>
              )}

              {/* Notes */}
              {selectedOrder.notes && (
                <div className="bg-amber-50 rounded-xl p-4">
                  <h4 className="font-medium text-gray-900 mb-2 flex items-center">
                    <DocumentTextIcon className="h-5 w-5 mr-2 text-amber-500" />
                    Notes du client
                  </h4>
                  <p className="text-gray-700">{selectedOrder.notes}</p>
                </div>
              )}

              {/* Tracking & Delivery (for Shipped status) */}
              {(selectedOrder.status === 'CONFIRMED' || selectedOrder.status === 'PRINTING') && (
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Numéro de suivi (pour expédition)
                    </label>
                    <input
                      type="text"
                      value={trackingNumber}
                      onChange={(e) => setTrackingNumber(e.target.value)}
                      className="input"
                      placeholder="Ex: AB123456789FR"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Date de livraison estimée
                    </label>
                    <input
                      type="date"
                      value={estimatedDelivery}
                      onChange={(e) => setEstimatedDelivery(e.target.value)}
                      className="input"
                    />
                  </div>
                </div>
              )}

              {/* Status Actions */}
              <div className="border-t pt-6">
                <h4 className="font-medium text-gray-900 mb-4">Changer le statut</h4>
                <div className="flex flex-wrap gap-2">
                  {selectedOrder.status === 'PENDING' && (
                    <>
                      <button
                        onClick={() => handleStatusChange('CONFIRMED')}
                        disabled={updateStatusMutation.isLoading}
                        className="btn-primary"
                      >
                        <CheckCircleIcon className="h-5 w-5 mr-2" />
                        Confirmer
                      </button>
                      <button
                        onClick={() => handleStatusChange('CANCELLED')}
                        disabled={updateStatusMutation.isLoading}
                        className="btn-outline-danger"
                      >
                        <XCircleIcon className="h-5 w-5 mr-2" />
                        Annuler
                      </button>
                    </>
                  )}
                  {selectedOrder.status === 'CONFIRMED' && (
                    <button
                      onClick={() => handleStatusChange('PRINTING')}
                      disabled={updateStatusMutation.isLoading}
                      className="btn-primary"
                    >
                      <PrinterIcon className="h-5 w-5 mr-2" />
                      Lancer l'impression
                    </button>
                  )}
                  {selectedOrder.status === 'PRINTING' && (
                    <button
                      onClick={() => handleStatusChange('SHIPPED')}
                      disabled={updateStatusMutation.isLoading || !trackingNumber}
                      className="btn-primary"
                    >
                      <TruckIcon className="h-5 w-5 mr-2" />
                      Marquer expédié
                    </button>
                  )}
                  {selectedOrder.status === 'SHIPPED' && (
                    <button
                      onClick={() => handleStatusChange('DELIVERED')}
                      disabled={updateStatusMutation.isLoading}
                      className="btn-success"
                    >
                      <CubeIcon className="h-5 w-5 mr-2" />
                      Marquer livré
                    </button>
                  )}
                </div>
              </div>

              {/* Timeline */}
              <div className="border-t pt-6">
                <h4 className="font-medium text-gray-900 mb-4">Historique</h4>
                <div className="space-y-3">
                  <div className="flex items-center gap-3 text-sm">
                    <ClockIcon className="h-5 w-5 text-gray-400" />
                    <span>Commandé le {format(new Date(selectedOrder.createdAt), 'd MMM yyyy à HH:mm', { locale: fr })}</span>
                  </div>
                  {selectedOrder.processedAt && (
                    <div className="flex items-center gap-3 text-sm text-blue-600">
                      <CheckCircleIcon className="h-5 w-5" />
                      <span>Confirmé le {format(new Date(selectedOrder.processedAt), 'd MMM yyyy à HH:mm', { locale: fr })}</span>
                    </div>
                  )}
                  {selectedOrder.shippedAt && (
                    <div className="flex items-center gap-3 text-sm text-indigo-600">
                      <TruckIcon className="h-5 w-5" />
                      <span>Expédié le {format(new Date(selectedOrder.shippedAt), 'd MMM yyyy', { locale: fr })}</span>
                      {selectedOrder.trackingNumber && (
                        <span className="text-gray-500">• N° {selectedOrder.trackingNumber}</span>
                      )}
                    </div>
                  )}
                  {selectedOrder.deliveredAt && (
                    <div className="flex items-center gap-3 text-sm text-green-600">
                      <CubeIcon className="h-5 w-5" />
                      <span>Livré le {format(new Date(selectedOrder.deliveredAt), 'd MMM yyyy', { locale: fr })}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
