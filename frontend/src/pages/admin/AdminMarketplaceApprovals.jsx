import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from 'react-query'
import { adminAPI } from '../../services/api'
import { formatMoney } from '../../utils/currency'
import toast from 'react-hot-toast'
import {
  CheckIcon,
  XMarkIcon,
  SparklesIcon,
  BookOpenIcon,
  UsersIcon,
  ClockIcon,
  DocumentCheckIcon,
  EyeIcon,
  ShoppingBagIcon,
  BanknotesIcon
} from '@heroicons/react/24/outline'
import TemplatePreview from '../../components/templates/TemplatePreview'

const EVENT_TYPE_LABELS = {
  WEDDING: 'Mariage',
  DOT: 'Mariage coutumier',
  BIRTHDAY: 'Anniversaire',
  CEREMONY: 'Cérémonie',
  CONFERENCE: 'Conférence',
  OTHER: 'Autre'
}

export default function AdminMarketplaceApprovals() {
  const queryClient = useQueryClient()
  const [viewMode, setViewMode] = useState('submissions') // 'submissions' or 'by-creator'
  const [statusFilter, setStatusFilter] = useState('PENDING_REVIEW')
  const [selectedSubmission, setSelectedSubmission] = useState(null)
  const [showReviewModal, setShowReviewModal] = useState(false)
  const [reviewData, setReviewData] = useState({ status: 'APPROVED', adminNote: '', priceUSD: '', commissionPercentage: '40' })
  const [previewTemplate, setPreviewTemplate] = useState(null)
  const [page, setPage] = useState(1)

  const { data, isLoading, error } = useQuery(
    ['marketplace-submissions', statusFilter, page, viewMode],
    () => {
      if (viewMode === 'submissions') {
        return adminAPI.getMarketplaceSubmissions({
          status: statusFilter,
          page,
          limit: 12
        })
      } else {
        // For by-creator view, show all APPROVED templates
        return adminAPI.getMarketplaceSubmissions({
          status: 'APPROVED',
          page,
          limit: 12
        })
      }
    },
    { keepPreviousData: true }
  )

  const submissions = data?.data?.submissions || []
  const pagination = data?.data?.pagination || {}

  // Group submissions by creator for the by-creator view
  const submissionsByCreator = viewMode === 'by-creator'
    ? submissions.reduce((acc, submission) => {
        const creatorId = submission.creator.id
        if (!acc[creatorId]) {
          acc[creatorId] = {
            creator: submission.creator,
            templates: []
          }
        }
        acc[creatorId].templates.push(submission)
        return acc
      }, {})
    : {}

  const reviewMutation = useMutation(
    ({ submissionId, ...payload }) =>
      adminAPI.reviewMarketplaceTemplate(submissionId, payload),
    {
      onSuccess: () => {
        queryClient.invalidateQueries('marketplace-submissions')
        toast.success('Template review submitted')
        setShowReviewModal(false)
        setSelectedSubmission(null)
        setReviewData({ status: 'APPROVED', adminNote: '', priceUSD: '', commissionPercentage: '40' })
      },
      onError: (err) =>
        toast.error(err.response?.data?.message || 'Error reviewing template')
    }
  )

  const handleReview = () => {
    if (!selectedSubmission) return

    const payload = {
      submissionId: selectedSubmission.id,
      status: reviewData.status,
      adminNote: reviewData.adminNote
    }

    if (reviewData.status === 'APPROVED') {
      payload.priceUSD = parseFloat(reviewData.priceUSD)
      payload.commissionPercentage = parseFloat(reviewData.commissionPercentage)

      if (Number.isNaN(payload.priceUSD) || payload.priceUSD < 0) {
        toast.error('Veuillez saisir un prix de vente valide')
        return
      }
      if (Number.isNaN(payload.commissionPercentage) || payload.commissionPercentage < 0 || payload.commissionPercentage > 100) {
        toast.error('Veuillez saisir une commission valide (0-100%)')
        return
      }
    }

    reviewMutation.mutate(payload)
  }

  const openReviewModal = (submission, status) => {
    setSelectedSubmission(submission)
    setReviewData({
      status,
      adminNote: '',
      priceUSD: submission.priceUSD ? String(submission.priceUSD) : '',
      commissionPercentage: submission.commissionPercentage ? String(submission.commissionPercentage) : '40'
    })
    setShowReviewModal(true)
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-primary-600 via-primary-500 to-secondary-500 p-8 text-white shadow-lg">
        <div className="absolute -top-10 -right-10 w-48 h-48 bg-white/10 rounded-full" />
        <div className="absolute -bottom-16 -left-8 w-56 h-56 bg-white/5 rounded-full" />
        <div className="relative flex flex-col sm:flex-row sm:items-center sm:justify-between gap-6">
          <div className="flex items-center gap-4">
            <div className="hidden sm:flex w-14 h-14 rounded-2xl bg-white/20 backdrop-blur items-center justify-center">
              <ShoppingBagIcon className="w-7 h-7 text-white" />
            </div>
            <div>
              <h1 className="text-3xl sm:text-4xl font-serif font-bold">Marketplace</h1>
              <p className="text-white/80 mt-1">Approuvez ou rejetez les templates des créateurs</p>
            </div>
          </div>
          <div className="flex items-center gap-3 rounded-2xl bg-white/15 backdrop-blur px-5 py-3">
            <span className="text-4xl font-bold leading-none">{pagination.total || 0}</span>
            <span className="text-sm text-white/80 leading-tight">Total<br />soumissions</span>
          </div>
        </div>
      </div>

      {/* View Mode Segmented Control */}
      <div className="inline-flex w-full sm:w-auto rounded-full bg-gray-100 p-1.5 shadow-inner">
        {[
          { key: 'submissions', label: 'Soumissions', Icon: BookOpenIcon },
          { key: 'by-creator', label: 'Par créateur', Icon: UsersIcon }
        ].map(({ key, label, Icon }) => (
          <button
            key={key}
            onClick={() => { setViewMode(key); setPage(1) }}
            className={`flex-1 sm:flex-none inline-flex items-center justify-center gap-2 px-6 py-2.5 rounded-full text-sm font-semibold transition-all duration-200 ${
              viewMode === key
                ? 'bg-white text-primary-700 shadow'
                : 'text-gray-500 hover:text-gray-800'
            }`}
          >
            <Icon className="w-4 h-4" />
            {label}
          </button>
        ))}
      </div>

      {/* Status Filter Pills - Only show in submissions view */}
      {viewMode === 'submissions' && (
        <div className="flex flex-wrap gap-2">
          {[
            { key: 'PENDING_REVIEW', label: 'En attente', Icon: ClockIcon, active: 'bg-gold-500 text-white border-gold-500 shadow-sm', idle: 'bg-white text-gold-700 border-gold-200 hover:bg-gold-50' },
            { key: 'APPROVED', label: 'Approuvés', Icon: DocumentCheckIcon, active: 'bg-green-600 text-white border-green-600 shadow-sm', idle: 'bg-white text-green-700 border-green-200 hover:bg-green-50' },
            { key: 'REJECTED', label: 'Rejetés', Icon: XMarkIcon, active: 'bg-red-600 text-white border-red-600 shadow-sm', idle: 'bg-white text-red-700 border-red-200 hover:bg-red-50' }
          ].map(({ key, label, Icon, active, idle }) => (
            <button
              key={key}
              onClick={() => { setStatusFilter(key); setPage(1) }}
              className={`inline-flex items-center gap-2 px-5 py-2.5 rounded-full text-sm font-semibold border transition-all duration-200 ${
                statusFilter === key ? active : idle
              }`}
            >
              <Icon className="w-4 h-4" />
              {label}
            </button>
          ))}
        </div>
      )}

      {/* Content */}
      {isLoading ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
        </div>
      ) : error ? (
        <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
          <p className="text-red-700">Erreur lors du chargement</p>
        </div>
      ) : viewMode === 'submissions' ? (
        // SUBMISSIONS VIEW
        submissions.length === 0 ? (
          <div className="bg-gradient-to-br from-primary-50 to-secondary-50 rounded-2xl shadow-sm border border-primary-100 p-16 text-center">
            <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-primary-100 mb-6">
              <SparklesIcon className="h-10 w-10 text-primary-600" />
            </div>
            <h3 className="text-2xl font-bold text-gray-900 mb-2">
              Aucune soumission {statusFilter === 'PENDING_REVIEW' ? 'en attente' : statusFilter === 'APPROVED' ? 'approuvée' : 'rejetée'}
            </h3>
            <p className="text-gray-600 text-lg max-w-md mx-auto">
              {statusFilter === 'PENDING_REVIEW'
                ? 'Les créateurs pourront soumettre leurs templates pour approbation'
                : 'Aucun template trouvé'}
            </p>
          </div>
        ) : (
          <>
            {/* Submissions Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {submissions.map((submission) => (
                <div
                  key={submission.id}
                  className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-lg hover:border-primary-200 transition-all duration-200 group flex flex-col"
                >
                  {/* Template Preview — capped height so the card stays compact */}
                  <div className="h-44 bg-gradient-to-br from-gray-100 to-gray-200 overflow-hidden relative cursor-pointer" onClick={() => setPreviewTemplate(submission.template)}>
                    <TemplatePreview
                      template={{ config: submission.template.config || {} }}
                      fit="cover"
                    />
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors duration-300 flex items-center justify-center">
                      <span className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1.5 px-3 py-1.5 bg-white/95 text-gray-800 rounded-full text-xs font-semibold shadow">
                        <EyeIcon className="w-4 h-4" /> Aperçu
                      </span>
                    </div>
                  </div>

                  {/* Info */}
                  <div className="p-4 flex flex-1 flex-col gap-3">
                    <div>
                      <div className="flex items-start justify-between gap-2">
                        <h3 className="font-bold text-gray-900 truncate">{submission.templateName}</h3>
                        <span className="shrink-0 inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-primary-100 text-primary-800">
                          {EVENT_TYPE_LABELS[submission.eventType] || submission.eventType}
                        </span>
                      </div>
                      <p className="mt-0.5 text-xs text-gray-500 truncate">
                        par <span className="font-medium text-gray-700">{submission.creator.displayName}</span>
                        {submission.creator.verified && <span className="text-green-600"> · ✓</span>}
                        {submission.category ? ` · ${submission.category}` : ''}
                      </p>
                    </div>

                    {/* Price (set by the creator) + creator share */}
                    <div className="flex items-center justify-between rounded-xl bg-gray-50 border border-gray-200 px-3 py-2">
                      <div>
                        <p className="text-[10px] text-gray-500 font-medium">Prix fixé par le créateur</p>
                        <p className="text-base font-bold text-gray-900">{submission.priceUSD > 0 ? formatMoney(submission.priceUSD) : 'Gratuit'}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-[10px] text-gray-500 font-medium">Part créateur</p>
                        <p className="text-sm font-bold text-primary-600">{submission.commissionPercentage}%</p>
                      </div>
                    </div>

                    {/* Real usage data (approved templates) */}
                    {submission.status === 'APPROVED' && (
                      <div className="flex items-center justify-between rounded-xl bg-green-50 border border-green-200 px-3 py-2 text-sm">
                        <span className="text-gray-600">{submission.usageCount ?? 0} utilisation(s)</span>
                        <span className="font-bold text-green-700">{formatMoney(submission.revenueGenerated ?? 0)}</span>
                      </div>
                    )}

                    <p className="text-[11px] text-gray-400">
                      {submission.status === 'APPROVED' && submission.reviewedAt
                        ? `Approuvé le ${new Date(submission.reviewedAt).toLocaleDateString('fr-FR')}`
                        : `Soumis le ${new Date(submission.submittedAt).toLocaleDateString('fr-FR')}`}
                    </p>

                    {/* Actions - Only show for PENDING_REVIEW */}
                    {statusFilter === 'PENDING_REVIEW' && (
                      <div className="mt-auto flex gap-2 pt-1">
                        <button
                          onClick={() => openReviewModal(submission, 'APPROVED')}
                          className="flex-1 flex items-center justify-center gap-1 px-3 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm font-semibold transition-colors disabled:opacity-50"
                          disabled={reviewMutation.isLoading}
                        >
                          <DocumentCheckIcon className="w-4 h-4" />
                          Approuver
                        </button>
                        <button
                          onClick={() => openReviewModal(submission, 'REJECTED')}
                          className="flex-1 flex items-center justify-center gap-1 px-3 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-sm font-semibold transition-colors disabled:opacity-50"
                          disabled={reviewMutation.isLoading}
                        >
                          <XMarkIcon className="w-4 h-4" />
                          Rejeter
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* Pagination */}
            {pagination.totalPages > 1 && (
              <div className="flex items-center justify-center gap-2 mt-10">
                {pagination.page > 1 && (
                  <button
                    onClick={() => setPage(pagination.page - 1)}
                    className="px-5 py-2 border border-gray-300 rounded-xl hover:bg-primary-50 hover:border-primary-300 text-gray-700 font-medium transition-all duration-200"
                  >
                    ← Précédent
                  </button>
                )}

                <div className="flex gap-1">
                  {Array.from({ length: pagination.totalPages }, (_, i) => i + 1).map((p) => (
                    <button
                      key={p}
                      onClick={() => setPage(p)}
                      className={`px-3.5 py-2 rounded-xl font-medium transition-all duration-200 ${
                        p === pagination.page
                          ? 'bg-primary-600 text-white shadow-md'
                          : 'border border-gray-300 text-gray-700 hover:bg-gray-50 hover:border-primary-300'
                      }`}
                    >
                      {p}
                    </button>
                  ))}
                </div>

                {pagination.page < pagination.totalPages && (
                  <button
                    onClick={() => setPage(pagination.page + 1)}
                    className="px-5 py-2 border border-gray-300 rounded-xl hover:bg-primary-50 hover:border-primary-300 text-gray-700 font-medium transition-all duration-200"
                  >
                    Suivant →
                  </button>
                )}
              </div>
            )}
          </>
        )
      ) : (
        // BY-CREATOR VIEW
        Object.keys(submissionsByCreator).length === 0 ? (
          <div className="bg-gradient-to-br from-secondary-50 to-gold-50 rounded-2xl shadow-sm border border-secondary-100 p-16 text-center">
            <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-secondary-100 mb-6">
              <SparklesIcon className="h-10 w-10 text-secondary-600" />
            </div>
            <h3 className="text-2xl font-bold text-gray-900 mb-2">Aucun template approuvé</h3>
            <p className="text-gray-600 text-lg max-w-md mx-auto">Les templates approuvés apparaîtront ici</p>
          </div>
        ) : (
          <div className="space-y-8">
            {Object.values(submissionsByCreator).map((group) => (
              <div key={group.creator.id} className="space-y-5">
                {/* Creator Header */}
                {(() => {
                  const tplCount = group.templates.length
                  const totalValue = group.templates.reduce((s, t) => s + (t.priceUSD || 0), 0)
                  const initials = (group.creator.displayName || '?')
                    .split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()
                  return (
                    <div className="relative overflow-hidden rounded-2xl border border-primary-100 bg-gradient-to-r from-primary-50 via-secondary-50 to-gold-50 p-6 shadow-sm">
                      <div className="absolute -top-8 -right-8 w-32 h-32 bg-white/30 rounded-full" />
                      <div className="relative flex items-center gap-5">
                        {group.creator.profileImage ? (
                          <img
                            src={group.creator.profileImage}
                            alt={group.creator.displayName}
                            className="w-16 h-16 rounded-2xl object-cover ring-4 ring-white shadow-md"
                          />
                        ) : (
                          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary-500 to-secondary-500 text-white flex items-center justify-center text-xl font-bold ring-4 ring-white shadow-md">
                            {initials}
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <h3 className="text-2xl font-serif font-bold text-primary-700 truncate">
                              {group.creator.displayName}
                            </h3>
                            {group.creator.verified && (
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-green-100 text-green-700 rounded-full text-xs font-semibold border border-green-200">
                                <CheckIcon className="w-3.5 h-3.5" /> Vérifié
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-2 mt-3 flex-wrap">
                            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white/70 text-gray-700 rounded-full text-xs font-semibold border border-gray-200">
                              <DocumentCheckIcon className="w-4 h-4 text-primary-600" />
                              {tplCount} template{tplCount !== 1 ? 's' : ''}
                            </span>
                            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white/70 text-gray-700 rounded-full text-xs font-semibold border border-gray-200">
                              <BanknotesIcon className="w-4 h-4 text-green-600" />
                              {formatMoney(totalValue)} valeur catalogue
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  )
                })()}

                {/* Creator's Templates Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
                  {group.templates.map((submission) => (
                    <div
                      key={submission.id}
                      className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-xl hover:border-primary-200 transition-all duration-300 group"
                    >
                      {/* Template Preview */}
                      <div className="aspect-[3/4] bg-gradient-to-br from-gray-100 to-gray-200 overflow-hidden relative cursor-pointer" onClick={() => setPreviewTemplate(submission.template)}>
                        <TemplatePreview
                          template={{ config: submission.template.config || {} }}
                          fit="cover"
                          className="group-hover:scale-110 transition-transform duration-300"
                        />
                        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors duration-300 flex items-center justify-center">
                          <span className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1.5 px-3 py-1.5 bg-white/95 text-gray-800 rounded-full text-xs font-semibold shadow">
                            <EyeIcon className="w-4 h-4" /> Aperçu
                          </span>
                        </div>
                      </div>

                      {/* Info */}
                      <div className="p-4 space-y-3">
                        <div className="flex items-start justify-between gap-2">
                          <h4 className="font-serif font-bold text-gray-900 truncate">{submission.templateName}</h4>
                          <span className="shrink-0 inline-flex items-center gap-1 px-2 py-0.5 bg-green-100 text-green-700 rounded-full text-[10px] font-semibold">
                            <CheckIcon className="w-3 h-3" /> Approuvé
                          </span>
                        </div>
                        {submission.category && (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-gold-100 text-gold-800">
                            {submission.category}
                          </span>
                        )}
                        <div className="grid grid-cols-2 gap-2">
                          <div className="bg-gray-50 rounded-lg p-2.5 border border-gray-100">
                            <p className="text-[10px] text-gray-500 font-medium">Prix</p>
                            <p className="text-sm font-bold text-gray-900">{submission.priceUSD > 0 ? formatMoney(submission.priceUSD) : 'Gratuit'}</p>
                          </div>
                          <div className="bg-gray-50 rounded-lg p-2.5 border border-gray-100">
                            <p className="text-[10px] text-gray-500 font-medium">Part créateur</p>
                            <p className="text-sm font-bold text-primary-600">{submission.commissionPercentage}%</p>
                          </div>
                        </div>
                        <p className="text-xs text-gray-400">
                          Approuvé le {new Date(submission.submittedAt).toLocaleDateString('fr-FR')}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )
      )}

      {/* Review Modal */}
      {showReviewModal && selectedSubmission && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 backdrop-blur-md">
          <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full p-8 animate-in fade-in zoom-in duration-300">
            <div className="flex items-center gap-4 mb-8">
              {reviewData.status === 'APPROVED' ? (
                <div className="w-14 h-14 bg-green-100 rounded-full flex items-center justify-center">
                  <CheckIcon className="w-7 h-7 text-green-600" />
                </div>
              ) : (
                <div className="w-14 h-14 bg-red-100 rounded-full flex items-center justify-center">
                  <XMarkIcon className="w-7 h-7 text-red-600" />
                </div>
              )}
              <div className="flex-1">
                <h3 className="text-xl font-bold text-gray-900">
                  {reviewData.status === 'APPROVED' ? 'Approuver' : 'Rejeter'}
                </h3>
                <p className="text-sm text-gray-600 truncate">{selectedSubmission.templateName}</p>
              </div>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault()
                handleReview()
              }}
              className="space-y-6"
            >
              {reviewData.status === 'REJECTED' && (
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-3">
                    Raison du rejet <span className="text-gray-500 font-normal">(optionnel)</span>
                  </label>
                  <textarea
                    value={reviewData.adminNote}
                    onChange={(e) =>
                      setReviewData({ ...reviewData, adminNote: e.target.value })
                    }
                    placeholder="Expliquez pourquoi ce template n'est pas approuvé..."
                    rows="3"
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none transition resize-none bg-gray-50 hover:bg-white"
                  />
                </div>
              )}

              {reviewData.status === 'APPROVED' && (() => {
                const price = parseFloat(reviewData.priceUSD) || 0
                const creatorPrice = selectedSubmission?.priceUSD || 0
                const part = (pct) => Math.round(price * pct / 100).toLocaleString('fr-FR')
                return (
                <div className="space-y-5">
                  <div className="bg-green-50 border border-green-200 rounded-xl p-4">
                    <p className="text-sm text-green-900">
                      Prix proposé par le créateur : <strong>{creatorPrice > 0 ? formatMoney(creatorPrice) : 'Gratuit'}</strong>.
                      Vous pouvez l'ajuster avant d'approuver.
                    </p>
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Prix affiché dans la marketplace (FC)
                    </label>
                    <div className="flex">
                      <input
                        type="number"
                        min="0"
                        step="1"
                        value={reviewData.priceUSD}
                        onChange={(e) => setReviewData({ ...reviewData, priceUSD: e.target.value })}
                        placeholder="0"
                        className="flex-1 px-4 py-3 border border-gray-300 rounded-l-xl focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none transition bg-gray-50 hover:bg-white"
                      />
                      <span className="inline-flex items-center px-4 bg-gray-100 text-gray-700 text-sm font-medium rounded-r-xl border border-l-0 border-gray-300">FC</span>
                    </div>
                  </div>

                  {/* Fixed revenue split */}
                  <div className="bg-primary-50 border border-primary-200 rounded-xl p-4">
                    <p className="text-xs font-semibold text-gray-700 mb-3">Répartition sur ce prix</p>
                    <div className="grid grid-cols-3 gap-2 text-center">
                      <div className="rounded-lg bg-white border border-primary-200 p-2">
                        <p className="text-lg font-bold text-primary-600">40%</p>
                        <p className="text-[10px] text-gray-500">Créateur</p>
                        {price > 0 && <p className="text-[10px] text-gray-400">{part(40)} FC</p>}
                      </div>
                      <div className="rounded-lg bg-white border border-gray-200 p-2">
                        <p className="text-lg font-bold text-gray-700">40%</p>
                        <p className="text-[10px] text-gray-500">Winvite</p>
                        {price > 0 && <p className="text-[10px] text-gray-400">{part(40)} FC</p>}
                      </div>
                      <div className="rounded-lg bg-white border border-gray-200 p-2">
                        <p className="text-lg font-bold text-gray-700">20%</p>
                        <p className="text-[10px] text-gray-500">Frais</p>
                        {price > 0 && <p className="text-[10px] text-gray-400">{part(20)} FC</p>}
                      </div>
                    </div>
                  </div>
                </div>
                )
              })()}

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowReviewModal(false)}
                  className="flex-1 px-4 py-3 border border-gray-300 rounded-xl text-gray-700 font-semibold hover:bg-gray-50 transition-all duration-200"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={reviewMutation.isLoading}
                  className={`flex-1 px-4 py-3 rounded-xl text-white font-semibold transition-all duration-200 disabled:opacity-50 shadow-sm hover:shadow-md ${
                    reviewData.status === 'APPROVED'
                      ? 'bg-green-600 hover:bg-green-700'
                      : 'bg-red-600 hover:bg-red-700'
                  }`}
                >
                  {reviewMutation.isLoading
                    ? 'Traitement...'
                    : reviewData.status === 'APPROVED'
                    ? 'Approuver'
                    : 'Rejeter'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Large preview modal */}
      {previewTemplate && (
        <div
          className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4 backdrop-blur-sm"
          onClick={() => setPreviewTemplate(null)}
        >
          <div
            className="bg-white rounded-2xl shadow-2xl max-w-md w-full max-h-[90vh] overflow-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="sticky top-0 bg-white p-4 border-b flex items-center justify-between">
              <h3 className="text-lg font-bold text-gray-900">Aperçu du template</h3>
              <button onClick={() => setPreviewTemplate(null)} className="text-gray-400 hover:text-gray-600">✕</button>
            </div>
            <div className="p-6 flex justify-center">
              <div className="w-full max-w-sm bg-white shadow-lg rounded-lg overflow-hidden">
                <TemplatePreview template={{ config: previewTemplate.config || {} }} adaptive />
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
