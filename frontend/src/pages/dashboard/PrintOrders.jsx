import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from 'react-query'
import { printOrderAPI, weddingAPI, invitationAPI } from '../../services/api'
import toast from 'react-hot-toast'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'
import {
  PrinterIcon,
  EyeIcon,
  XMarkIcon,
  CheckCircleIcon,
  ClockIcon,
  TruckIcon,
  CubeIcon,
  ExclamationCircleIcon,
  ArrowPathIcon,
  ArrowDownTrayIcon
} from '@heroicons/react/24/outline'

const EVENT_TYPE_LABELS = { WEDDING: 'Mariage', BIRTHDAY: 'Anniversaire', DOT: 'Mariage coutumier', CEREMONY: 'Cérémonie', CONFERENCE: 'Conférence', OTHER: 'Événement' }
const eventDisplayName = (w) =>
  (!w.eventType || w.eventType === 'WEDDING') ? `${w.brideName} & ${w.groomName}` : (w.eventTitle || EVENT_TYPE_LABELS[w.eventType])

const STATUS_MAP = {
  PENDING: { label: 'En attente de confirmation', color: 'yellow', icon: ClockIcon, step: 1 },
  CONFIRMED: { label: 'Confirmée', color: 'blue', icon: CheckCircleIcon, step: 2 },
  PRINTING: { label: 'En cours d\'impression', color: 'purple', icon: PrinterIcon, step: 3 },
  SHIPPED: { label: 'Expédiée', color: 'indigo', icon: TruckIcon, step: 4 },
  DELIVERED: { label: 'Livrée', color: 'green', icon: CubeIcon, step: 5 },
  CANCELLED: { label: 'Annulée', color: 'red', icon: XMarkIcon, step: 0 }
}

const STEPS = [
  { key: 'PENDING', label: 'Demande', icon: ClockIcon },
  { key: 'CONFIRMED', label: 'Confirmée', icon: CheckCircleIcon },
  { key: 'PRINTING', label: 'Impression', icon: PrinterIcon },
  { key: 'SHIPPED', label: 'Expédition', icon: TruckIcon },
  { key: 'DELIVERED', label: 'Livrée', icon: CubeIcon }
]

export default function PrintOrders() {
  const [selectedOrder, setSelectedOrder] = useState(null)
  const [downloadWeddingId, setDownloadWeddingId] = useState('')
  const [downloading, setDownloading] = useState(false)
  const queryClient = useQueryClient()

  const { data: ordersData, isLoading } = useQuery('printOrders', () => printOrderAPI.getAll())
  const orders = ordersData?.data?.orders || []

  const { data: weddingsData } = useQuery('weddings', () => weddingAPI.getAll())
  const weddings = weddingsData?.data?.weddings || []

  // Free self-print PDF - no print order/payment needed, anyone can grab
  // their already-generated invitation PDFs and print them at home.
  const handleDownloadPdf = async () => {
    const weddingId = downloadWeddingId || weddings[0]?.id
    if (!weddingId) {
      toast.error('Sélectionnez un événement')
      return
    }
    setDownloading(true)
    try {
      const response = await invitationAPI.downloadAll(weddingId, 'pdf')
      const url = window.URL.createObjectURL(new Blob([response.data]))
      const link = document.createElement('a')
      link.href = url
      link.setAttribute('download', `invitations_pdf_${weddingId}.zip`)
      document.body.appendChild(link)
      link.click()
      link.remove()
      window.URL.revokeObjectURL(url)
      toast.success('Téléchargement lancé')
    } catch (err) {
      toast.error(
        err.response?.data?.error ||
        'Aucun PDF disponible - générez d\'abord vos invitations depuis la page "Invitations" de cet événement'
      )
    } finally {
      setDownloading(false)
    }
  }

  const cancelMutation = useMutation(
    (id) => printOrderAPI.cancel(id),
    {
      onSuccess: () => {
        toast.success('Commande annulée')
        queryClient.invalidateQueries('printOrders')
        setSelectedOrder(null)
      },
      onError: (err) => toast.error(err.response?.data?.error || 'Erreur')
    }
  )

  const formatPrice = (price) => {
    return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(price)
  }

  const getStepStatus = (orderStatus, stepKey) => {
    const orderStep = STATUS_MAP[orderStatus]?.step || 0
    const stepIndex = STEPS.findIndex(s => s.key === stepKey) + 1
    if (orderStatus === 'CANCELLED') return 'cancelled'
    if (stepIndex < orderStep) return 'completed'
    if (stepIndex === orderStep) return 'current'
    return 'upcoming'
  }

  if (isLoading) {
    return (
      <div className="text-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto"></div>
      </div>
    )
  }

  return (
    <div className="max-w-5xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-serif font-bold text-gray-900 flex items-center">
          <PrinterIcon className="h-8 w-8 mr-3 text-primary-500" />
          Mes commandes d'impression
        </h1>
        <p className="text-gray-600 mt-1">Suivez vos commandes d'impression d'invitations</p>
      </div>

      {/* Free self-print download - no order/payment required */}
      {weddings.length > 0 && (
        <div className="bg-white rounded-xl shadow-lg p-6 mb-8 border border-primary-100">
          <div className="flex items-start gap-4">
            <div className="p-3 bg-primary-50 rounded-xl">
              <ArrowDownTrayIcon className="h-6 w-6 text-primary-600" />
            </div>
            <div className="flex-1">
              <h2 className="text-lg font-semibold text-gray-900">Télécharger le PDF d'impression</h2>
              <p className="text-sm text-gray-500 mt-1 mb-4">
                Téléchargez gratuitement le PDF de vos invitations pour les imprimer vous-même, sans passer de commande.
                Pour une impression professionnelle livrée chez vous, commandez le service ci-dessous.
              </p>
              <div className="flex flex-col sm:flex-row gap-3">
                <select
                  value={downloadWeddingId || weddings[0]?.id || ''}
                  onChange={(e) => setDownloadWeddingId(e.target.value)}
                  className="input flex-1"
                >
                  {weddings.map((w) => (
                    <option key={w.id} value={w.id}>{eventDisplayName(w)}</option>
                  ))}
                </select>
                <button
                  onClick={handleDownloadPdf}
                  disabled={downloading}
                  className="btn-primary whitespace-nowrap flex items-center justify-center"
                >
                  <ArrowDownTrayIcon className="h-5 w-5 mr-2" />
                  {downloading ? 'Téléchargement...' : 'Télécharger le PDF'}
                </button>
              </div>
              <p className="text-xs text-gray-400 mt-2">
                Besoin de générer les PDF d'abord ? Allez sur la page{' '}
                <Link to={`/weddings/${downloadWeddingId || weddings[0]?.id}/invitations`} className="link">Invitations</Link> de l'événement.
              </p>
            </div>
          </div>
        </div>
      )}

      {orders.length === 0 ? (
        <div className="bg-white rounded-xl shadow-lg p-12 text-center">
          <PrinterIcon className="h-16 w-16 text-gray-300 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Aucune commande</h2>
          <p className="text-gray-600 mb-4">
            Vous n'avez pas encore commandé d'impression. Activez le service d'impression lors de la création ou modification d'un mariage.
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {orders.map(order => {
            const status = STATUS_MAP[order.status] || STATUS_MAP.PENDING
            const StatusIcon = status.icon

            return (
              <div key={order.id} className="bg-white rounded-xl shadow-lg overflow-hidden hover:shadow-xl transition-shadow">
                {/* Header */}
                <div className="p-6 border-b">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className={`w-12 h-12 rounded-full bg-${status.color}-100 flex items-center justify-center`}>
                        <StatusIcon className={`h-6 w-6 text-${status.color}-600`} />
                      </div>
                      <div>
                        <h3 className="font-semibold text-gray-900">
                          {order.wedding ? eventDisplayName(order.wedding) : '-'}
                        </h3>
                        <p className="text-sm text-gray-500">
                          Commande #{order.id.slice(0, 8)} • {format(new Date(order.createdAt), 'd MMM yyyy', { locale: fr })}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className={`px-3 py-1 rounded-full text-xs font-medium bg-${status.color}-100 text-${status.color}-700`}>
                        {status.label}
                      </span>
                      <button
                        onClick={() => setSelectedOrder(order)}
                        className="btn-secondary text-sm flex items-center"
                      >
                        <EyeIcon className="h-4 w-4 mr-1" />
                        Détails
                      </button>
                    </div>
                  </div>
                </div>

                {/* Progress Timeline */}
                {order.status !== 'CANCELLED' && (
                  <div className="px-6 py-4 bg-gray-50">
                    <div className="flex items-center justify-between">
                      {STEPS.map((step, index) => {
                        const stepStatus = getStepStatus(order.status, step.key)
                        const StepIcon = step.icon
                        return (
                          <div key={step.key} className="flex items-center flex-1">
                            <div className="flex flex-col items-center">
                              <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                                stepStatus === 'completed' ? 'bg-green-500 text-white' :
                                stepStatus === 'current' ? 'bg-primary-500 text-white animate-pulse' :
                                'bg-gray-200 text-gray-400'
                              }`}>
                                {stepStatus === 'completed' ? (
                                  <CheckCircleIcon className="h-6 w-6" />
                                ) : stepStatus === 'current' ? (
                                  <ArrowPathIcon className="h-5 w-5 animate-spin" />
                                ) : (
                                  <StepIcon className="h-5 w-5" />
                                )}
                              </div>
                              <span className={`text-xs mt-1 ${
                                stepStatus === 'completed' || stepStatus === 'current' 
                                  ? 'text-gray-900 font-medium' 
                                  : 'text-gray-400'
                              }`}>
                                {step.label}
                              </span>
                            </div>
                            {index < STEPS.length - 1 && (
                              <div className={`flex-1 h-1 mx-2 rounded ${
                                getStepStatus(order.status, STEPS[index + 1].key) !== 'upcoming'
                                  ? 'bg-green-500'
                                  : 'bg-gray-200'
                              }`} />
                            )}
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )}

                {/* Tracking Info */}
                {order.trackingNumber && (
                  <div className="px-6 py-3 bg-indigo-50 border-t flex items-center gap-2">
                    <TruckIcon className="h-5 w-5 text-indigo-600" />
                    <span className="text-sm text-indigo-700">
                      <strong>N° de suivi :</strong> {order.trackingNumber}
                    </span>
                    {order.estimatedDelivery && (
                      <span className="text-sm text-indigo-600 ml-4">
                        • Livraison estimée : {format(new Date(order.estimatedDelivery), 'd MMMM yyyy', { locale: fr })}
                      </span>
                    )}
                  </div>
                )}

                {/* Order Details */}
                <div className="p-6 grid grid-cols-4 gap-4 border-t">
                  <div>
                    <p className="text-xs text-gray-500">Quantité</p>
                    <p className="font-semibold">{order.quantity} ex.</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Format</p>
                    <p className="font-semibold">{order.size || 'A5'}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Papier</p>
                    <p className="font-semibold capitalize">{order.paperType || 'Premium'}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Total</p>
                    <p className="font-semibold text-primary-600">{order.price ? formatPrice(order.price) : 'Sur devis'}</p>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Order Detail Modal */}
      {selectedOrder && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setSelectedOrder(null)}>
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full max-h-[85vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="p-6 border-b flex items-center justify-between">
              <h2 className="text-xl font-serif font-bold text-gray-900">Détails de la commande</h2>
              <button onClick={() => setSelectedOrder(null)} className="text-gray-400 hover:text-gray-600">
                <XMarkIcon className="h-6 w-6" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-500">Statut</span>
                <span className={`px-3 py-1 rounded-full text-sm font-medium bg-${STATUS_MAP[selectedOrder.status]?.color}-100 text-${STATUS_MAP[selectedOrder.status]?.color}-700`}>
                  {STATUS_MAP[selectedOrder.status]?.label}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-500">Événement</span>
                <span className="font-medium">{selectedOrder.wedding ? eventDisplayName(selectedOrder.wedding) : '-'}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-500">Quantité</span>
                <span className="font-medium">{selectedOrder.quantity} exemplaires</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-500">Format</span>
                <span className="font-medium">{selectedOrder.size || 'A5'}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-500">Type de papier</span>
                <span className="font-medium capitalize">{selectedOrder.paperType || 'Premium'}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-500">Finition</span>
                <span className="font-medium capitalize">{selectedOrder.finish || 'Mat'}</span>
              </div>
              {selectedOrder.price && (
                <div className="flex items-center justify-between pt-4 border-t">
                  <span className="text-sm font-medium text-gray-900">Total</span>
                  <span className="text-lg font-bold text-primary-600">{formatPrice(selectedOrder.price)}</span>
                </div>
              )}

              {/* Tracking Info in Modal */}
              {selectedOrder.trackingNumber && (
                <div className="p-4 bg-indigo-50 rounded-xl mt-4">
                  <p className="text-sm font-medium text-indigo-900">Informations de livraison</p>
                  <p className="text-sm text-indigo-700 mt-1">N° de suivi : <strong>{selectedOrder.trackingNumber}</strong></p>
                  {selectedOrder.estimatedDelivery && (
                    <p className="text-sm text-indigo-600 mt-1">
                      Livraison prévue : {format(new Date(selectedOrder.estimatedDelivery), 'd MMMM yyyy', { locale: fr })}
                    </p>
                  )}
                </div>
              )}

              {/* Timeline */}
              <div className="pt-4 border-t">
                <p className="text-sm font-medium text-gray-900 mb-3">Historique</p>
                <div className="space-y-2 text-sm">
                  <div className="flex items-center gap-2 text-gray-600">
                    <ClockIcon className="h-4 w-4" />
                    <span>Commandé le {format(new Date(selectedOrder.createdAt), 'd MMMM yyyy à HH:mm', { locale: fr })}</span>
                  </div>
                  {selectedOrder.processedAt && (
                    <div className="flex items-center gap-2 text-blue-600">
                      <CheckCircleIcon className="h-4 w-4" />
                      <span>Confirmé le {format(new Date(selectedOrder.processedAt), 'd MMMM yyyy', { locale: fr })}</span>
                    </div>
                  )}
                  {selectedOrder.shippedAt && (
                    <div className="flex items-center gap-2 text-indigo-600">
                      <TruckIcon className="h-4 w-4" />
                      <span>Expédié le {format(new Date(selectedOrder.shippedAt), 'd MMMM yyyy', { locale: fr })}</span>
                    </div>
                  )}
                  {selectedOrder.deliveredAt && (
                    <div className="flex items-center gap-2 text-green-600">
                      <CubeIcon className="h-4 w-4" />
                      <span>Livré le {format(new Date(selectedOrder.deliveredAt), 'd MMMM yyyy', { locale: fr })}</span>
                    </div>
                  )}
                </div>
              </div>

              {selectedOrder.notes && (
                <div className="pt-4 border-t">
                  <p className="text-sm text-gray-500 mb-1">Vos instructions</p>
                  <p className="text-sm text-gray-700 bg-gray-50 p-3 rounded-lg">{selectedOrder.notes}</p>
                </div>
              )}
            </div>
            {selectedOrder.status === 'PENDING' && (
              <div className="p-6 border-t">
                <button
                  onClick={() => cancelMutation.mutate(selectedOrder.id)}
                  disabled={cancelMutation.isLoading}
                  className="btn-danger w-full flex items-center justify-center"
                >
                  <ExclamationCircleIcon className="h-5 w-5 mr-2" />
                  {cancelMutation.isLoading ? 'Annulation...' : 'Annuler la commande'}
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
