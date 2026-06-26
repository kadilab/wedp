import { useState, useEffect, useRef } from 'react'
import { useParams, Link, useSearchParams } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from 'react-query'
import { invitationAPI, guestAPI, weddingAPI, invitationOrderAPI } from '../../services/api'
import { socketService } from '../../services/socket'
import { useAuthStore } from '../../stores/authStore'
import BuyQuotaModal from '../../components/invitations/BuyQuotaModal'
import toast from 'react-hot-toast'
import {
  ArrowLeftIcon,
  EnvelopeIcon,
  DocumentArrowDownIcon,
  QrCodeIcon,
  ArrowPathIcon,
  PhotoIcon,
  DocumentIcon,
  ChevronDownIcon,
  EyeIcon,
  CheckCircleIcon,
  XCircleIcon,
  ClockIcon,
  LinkIcon,
  ShoppingCartIcon
} from '@heroicons/react/24/outline'

const RSVP_BADGE = {
  CONFIRMED: { label: 'Confirmé', cls: 'bg-green-100 text-green-700 border-green-200', Icon: CheckCircleIcon },
  DECLINED:  { label: 'Décliné',  cls: 'bg-red-100 text-red-700 border-red-200',   Icon: XCircleIcon },
  PENDING:   { label: 'En attente', cls: 'bg-amber-100 text-amber-700 border-amber-200', Icon: ClockIcon }
}

export default function Invitations() {
  const { id: weddingId } = useParams()
  const [selectedGuests, setSelectedGuests] = useState([])
  const [generating, setGenerating] = useState(false)
  const [showDownloadMenu, setShowDownloadMenu] = useState(false)
  const [showBuyModal, setShowBuyModal] = useState(false)
  const downloadMenuRef = useRef(null)
  const queryClient = useQueryClient()
  const { user } = useAuthStore()
  const [searchParams, setSearchParams] = useSearchParams()

  // K-PAY return/cancel handling: the client is redirected back here after the
  // hosted payment page. The order is confirmed server-side by the webhook, so
  // here we only inform the client and refresh the quota.
  useEffect(() => {
    const kpay = searchParams.get('kpay')
    if (!kpay) return
    if (kpay === 'return') {
      toast.success('Paiement reçu — confirmation en cours. Vos invitations seront débloquées dès validation.', { duration: 7000 })
      queryClient.invalidateQueries(['quota', weddingId])
      queryClient.invalidateQueries(['invitation-orders', weddingId])
    } else if (kpay === 'cancel') {
      toast('Paiement annulé.', { icon: 'ℹ️' })
    }
    // Clean the query params so the message doesn't reappear on refresh.
    const next = new URLSearchParams(searchParams)
    next.delete('kpay'); next.delete('order')
    setSearchParams(next, { replace: true })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (downloadMenuRef.current && !downloadMenuRef.current.contains(event.target)) {
        setShowDownloadMenu(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // ── Real-time socket connection ──────────────────────────────────────────
  useEffect(() => {
    if (!weddingId) return

    socketService.connect()
    if (user?.id) socketService.joinUser(user.id)
    socketService.joinWedding(weddingId)

    // RSVP updated → refresh guests + invitations
    socketService.onRSVP((data) => {
      if (data.weddingId === weddingId || !data.weddingId) {
        queryClient.invalidateQueries(['guests', weddingId])
        queryClient.invalidateQueries(['invitations', weddingId])
        toast.success(`RSVP: ${data.guestName} — ${data.response === 'CONFIRMED' ? '✅ Confirmé' : '❌ Décliné'}`, {
          id: `rsvp-${data.guestId}`,
          duration: 4000
        })
      }
    })

    // Guest check-in → refresh invitations
    socketService.onCheckIn((data) => {
      if (data.weddingId === weddingId || !data.weddingId) {
        queryClient.invalidateQueries(['invitations', weddingId])
        queryClient.invalidateQueries(['guests', weddingId])
      }
    })

    return () => {
      socketService.offRSVP()
      socketService.offCheckIn()
      socketService.leaveWedding(weddingId)
    }
  }, [weddingId, queryClient, user?.id])

  const { data: weddingData } = useQuery(['wedding', weddingId], () => weddingAPI.getOne(weddingId))
  const wedding = weddingData?.data?.wedding

  const { data: guestsData, refetch: refetchGuests } = useQuery(
    ['guests', weddingId],
    () => guestAPI.getAll(weddingId),
    { refetchInterval: 30000 }
  )
  const guests = guestsData?.data?.guests || []

  const { data: invitationsData, isLoading, refetch: refetchInvitations } = useQuery(
    ['invitations', weddingId],
    () => invitationAPI.getAll(weddingId),
    { refetchInterval: 30000 }
  )
  const invitations = invitationsData?.data?.invitations || []

  const { data: quotaData } = useQuery(
    ['quota', weddingId],
    () => invitationOrderAPI.getQuota(weddingId),
    { enabled: !!weddingId }
  )
  const quota = quotaData?.data?.quota

  const generateMutation = useMutation(
    (guestIds) => invitationAPI.generate(weddingId, guestIds),
    {
      onSuccess: (response) => {
        toast.success(`${response.data.generated} invitation(s) générée(s)`)
        queryClient.invalidateQueries(['invitations', weddingId])
        queryClient.invalidateQueries(['quota', weddingId])
        setSelectedGuests([])
      },
      onError: (error) => {
        if (error.response?.data?.code === 'QUOTA_EXCEEDED') {
          toast.error('Quota d\'invitations insuffisant. Achetez plus d\'invitations pour continuer.')
          setShowBuyModal(true)
          return
        }
        toast.error(error.response?.data?.error || 'Erreur lors de la génération')
      }
    }
  )

  const generatePdfsMutation = useMutation(
    (guestIds) => invitationAPI.generatePDFs(weddingId, guestIds),
    {
      onSuccess: (response) => {
        const { generated, errors } = response.data
        if (generated > 0) {
          toast.success(`${generated} PDF(s) généré(s) avec succès`)
        }
        if (errors > 0) {
          toast.error(`${errors} erreur(s) lors de la génération`)
        }
        queryClient.invalidateQueries(['invitations', weddingId])
      },
      onError: (error) => {
        toast.error(error.response?.data?.error || 'Erreur lors de la génération des PDFs')
      }
    }
  )

  const generateImagesMutation = useMutation(
    (guestIds) => invitationAPI.generateImages(weddingId, guestIds),
    {
      onSuccess: (response) => {
        const { generated, errors } = response.data
        if (generated > 0) {
          toast.success(`${generated} image(s) générée(s) avec succès`)
        }
        if (errors > 0) {
          toast.error(`${errors} erreur(s) lors de la génération`)
        }
        queryClient.invalidateQueries(['invitations', weddingId])
      },
      onError: (error) => {
        toast.error(error.response?.data?.error || 'Erreur lors de la génération des images')
      }
    }
  )

  const downloadAll = async (type) => {
    setShowDownloadMenu(false)
    try {
      const response = await invitationAPI.downloadAll(weddingId, type)
      const url = window.URL.createObjectURL(new Blob([response.data]))
      const link = document.createElement('a')
      link.href = url
      link.setAttribute('download', `invitations_${type === 'image' ? 'images' : 'pdfs'}_${weddingId}.zip`)
      document.body.appendChild(link)
      link.click()
      link.remove()
      window.URL.revokeObjectURL(url)
      toast.success('Téléchargement réussi')
    } catch (error) {
      const errorMessage = error.response?.data?.error || 'Erreur lors du téléchargement'
      toast.error(errorMessage)
    }
  }

  const guestsWithoutInvitation = guests.filter(
    (g) => !invitations.find((i) => i.guestId === g.id)
  )

  const toggleSelect = (id) => {
    setSelectedGuests((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    )
  }

  const selectAll = () => {
    if (selectedGuests.length === guestsWithoutInvitation.length) {
      setSelectedGuests([])
    } else {
      setSelectedGuests(guestsWithoutInvitation.map((g) => g.id))
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
            <h1 className="text-3xl font-serif font-bold text-gray-900">Invitations</h1>
            {wedding && (
              <p className="text-gray-600">{wedding.brideName} & {wedding.groomName}</p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => { refetchInvitations(); refetchGuests() }}
            className="btn-secondary btn-sm"
            title="Rafraîchir"
          >
            <ArrowPathIcon className="h-4 w-4 mr-1" />
            Actualiser
          </button>
          <div className="relative" ref={downloadMenuRef}>
            <button
              onClick={() => setShowDownloadMenu(!showDownloadMenu)}
              className="btn-secondary"
              disabled={invitations.length === 0}
            >
              <DocumentArrowDownIcon className="h-5 w-5 mr-2" />
              Tout télécharger
              <ChevronDownIcon className="h-4 w-4 ml-2" />
            </button>
            {showDownloadMenu && (
              <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border z-50">
                <button
                  onClick={() => downloadAll('image')}
                  className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-gray-50 rounded-t-lg"
                >
                  <PhotoIcon className="h-5 w-5 text-green-600" />
                  <span className="text-gray-700">Images (PNG)</span>
                </button>
                <button
                  onClick={() => downloadAll('pdf')}
                  className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-gray-50 rounded-b-lg border-t"
                >
                  <DocumentIcon className="h-5 w-5 text-primary-600" />
                  <span className="text-gray-700">PDFs</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg p-4 shadow-sm border">
          <p className="text-2xl font-bold text-gray-900">{guests.length}</p>
          <p className="text-sm text-gray-500">Total invités</p>
        </div>
        <div className="bg-white rounded-lg p-4 shadow-sm border">
          <p className="text-2xl font-bold text-primary-600">{invitations.length}</p>
          <p className="text-sm text-gray-500">Invitations générées</p>
        </div>
        <div className="bg-white rounded-lg p-4 shadow-sm border">
          <div className="flex items-center justify-between mb-1">
            <p className="text-2xl font-bold text-green-600">
              {guests.filter(g => g.rsvpStatus === 'CONFIRMED').length}
            </p>
            <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" title="Temps réel" />
          </div>
          <p className="text-sm text-gray-500">Confirmés (RSVP)</p>
        </div>
        <div className="bg-white rounded-lg p-4 shadow-sm border">
          <p className="text-2xl font-bold text-blue-600">
            {invitations.reduce((acc, i) => acc + (i.viewCount || 0), 0)}
          </p>
          <p className="text-sm text-gray-500">Vues totales</p>
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
              {quota.freeQuota > 0 && `${quota.freeQuota} gratuite${quota.freeQuota > 1 ? 's' : ''} + `}
              {quota.purchased} achetée{quota.purchased > 1 ? 's' : ''}
            </p>
          </div>
          <button onClick={() => setShowBuyModal(true)} className="btn-secondary btn-sm">
            <ShoppingCartIcon className="h-4 w-4 mr-1" />
            Acheter plus
          </button>
        </div>
      )}

      {/* Generate Section */}
      {guestsWithoutInvitation.length > 0 && (
        <div className="bg-gold-50 border border-gold-200 rounded-xl p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-lg font-serif font-bold text-gray-900">
                Invités sans invitation ({guestsWithoutInvitation.length})
              </h2>
              <p className="text-sm text-gray-600">
                Sélectionnez les invités pour générer leurs invitations
              </p>
              {quota && selectedGuests.length > quota.remaining && (
                <p className="text-sm text-amber-600 font-medium mt-1">
                  Vous avez sélectionné plus d'invitations que votre quota restant ({quota.remaining}).
                </p>
              )}
            </div>
            <div className="flex items-center gap-2">
              <button onClick={selectAll} className="btn-secondary btn-sm">
                {selectedGuests.length === guestsWithoutInvitation.length ? 'Désélectionner' : 'Tout sélectionner'}
              </button>
              <button
                onClick={() => generateMutation.mutate(selectedGuests)}
                disabled={selectedGuests.length === 0 || generateMutation.isLoading || (quota && selectedGuests.length > quota.remaining)}
                className="btn-gold"
              >
                <QrCodeIcon className="h-5 w-5 mr-2" />
                Générer ({selectedGuests.length})
              </button>
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
            {guestsWithoutInvitation.map((guest) => (
              <label
                key={guest.id}
                className={`flex items-center p-3 bg-white rounded-lg border cursor-pointer transition-all ${
                  selectedGuests.includes(guest.id)
                    ? 'border-gold-500 ring-2 ring-gold-200'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <input
                  type="checkbox"
                  checked={selectedGuests.includes(guest.id)}
                  onChange={() => toggleSelect(guest.id)}
                  className="rounded border-gray-300 text-gold-600 mr-3"
                />
                <span className="text-sm font-medium text-gray-900">
                  {guest.firstName} {guest.lastName}
                </span>
              </label>
            ))}
          </div>
        </div>
      )}

      {/* Invitations List */}
      <div className="bg-white rounded-xl shadow-lg overflow-hidden">
        <div className="p-6 border-b flex items-center justify-between">
          <h2 className="text-lg font-serif font-bold text-gray-900">
            Invitations générées ({invitations.length})
          </h2>
          {invitations.length > 0 && (
            <div className="flex items-center gap-2">
              <button
                onClick={() => generateImagesMutation.mutate(invitations.map((i) => i.guestId))}
                disabled={generateImagesMutation.isLoading}
                className="btn-gold btn-sm"
              >
                <DocumentArrowDownIcon className="h-4 w-4 mr-1" />
                {generateImagesMutation.isLoading ? 'Génération...' : 'Générer Images'}
              </button>
              <button
                onClick={() => generatePdfsMutation.mutate(invitations.map((i) => i.guestId))}
                disabled={generatePdfsMutation.isLoading}
                className="btn-secondary btn-sm"
              >
                <DocumentArrowDownIcon className="h-4 w-4 mr-1" />
                Générer PDFs
              </button>
            </div>
          )}
        </div>

        {isLoading ? (
          <div className="p-12 text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto"></div>
          </div>
        ) : invitations.length === 0 ? (
          <div className="p-12 text-center">
            <EnvelopeIcon className="h-16 w-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              Aucune invitation générée
            </h3>
            <p className="text-gray-500">
              Sélectionnez des invités ci-dessus pour générer leurs invitations
            </p>
          </div>
        ) : (
          <div className="table-container">
            <table className="table">
              <thead>
                <tr>
                  <th>Invité</th>
                  <th>Code unique</th>
                  <th>RSVP</th>
                  <th>QR Code</th>
                  <th>
                    <span className="flex items-center gap-1">
                      Vues
                      <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" title="Temps réel" />
                    </span>
                  </th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {invitations.map((invitation) => {
                  const guest = invitation.guest || guests.find(g => g.id === invitation.guestId)
                  const rsvp = guest?.rsvpStatus || 'PENDING'
                  const badge = RSVP_BADGE[rsvp] || RSVP_BADGE.PENDING
                  const BadgeIcon = badge.Icon
                  const inviteUrl = wedding?.slug
                    ? `/i/${wedding.slug}/${invitation.uniqueCode}`
                    : null
                  return (
                    <tr key={invitation.id}>
                      <td className="font-medium">
                        {guest?.firstName || invitation.guest?.firstName} {guest?.lastName || invitation.guest?.lastName}
                      </td>
                      <td>
                        <code className="text-sm bg-gray-100 px-2 py-1 rounded">
                          {invitation.uniqueCode}
                        </code>
                      </td>
                      <td>
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border ${badge.cls}`}>
                          <BadgeIcon className="h-3 w-3" />
                          {badge.label}
                        </span>
                      </td>
                      <td>
                        {invitation.qrCodeUrl && (
                          <img
                            src={invitation.qrCodeUrl}
                            alt="QR Code"
                            className="h-10 w-10 rounded"
                            loading="lazy"
                          />
                        )}
                      </td>
                      <td>
                        <span className="font-semibold text-gray-700">{invitation.viewCount || 0}</span>
                      </td>
                      <td>
                        <div className="flex items-center gap-2">
                          {inviteUrl && (
                            <a
                              href={inviteUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="p-1.5 rounded-lg bg-blue-50 text-blue-600 hover:bg-blue-100 hover:text-blue-700 transition-colors"
                              title="Voir l'invitation"
                            >
                              <EyeIcon className="h-5 w-5" />
                            </a>
                          )}
                          {inviteUrl && (
                            <button
                              type="button"
                              onClick={() => { navigator.clipboard.writeText(window.location.origin + inviteUrl); toast.success('Lien copié !') }}
                              className="p-1.5 rounded-lg bg-gray-50 text-gray-500 hover:bg-gray-100 hover:text-gray-700 transition-colors"
                              title="Copier le lien"
                            >
                              <LinkIcon className="h-5 w-5" />
                            </button>
                          )}
                          {invitation.imageUrl && (
                            <a
                              href={invitation.imageUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="p-1.5 rounded-lg bg-green-50 text-green-600 hover:bg-green-100 hover:text-green-700 transition-colors"
                              title="Télécharger l'image"
                            >
                              <PhotoIcon className="h-5 w-5" />
                            </a>
                          )}
                          {invitation.pdfUrl && (
                            <a
                              href={invitation.pdfUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="p-1.5 rounded-lg bg-primary-50 text-primary-600 hover:bg-primary-100 hover:text-primary-700 transition-colors"
                              title="Télécharger le PDF"
                            >
                              <DocumentIcon className="h-5 w-5" />
                            </a>
                          )}
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <BuyQuotaModal
        weddingId={weddingId}
        isOpen={showBuyModal}
        onClose={() => setShowBuyModal(false)}
      />
    </div>
  )
}
