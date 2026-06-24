import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from 'react-query'
import { adminAPI } from '../../services/api'
import toast from 'react-hot-toast'
import {
  CheckIcon,
  XMarkIcon,
  SparklesIcon,
  BookOpenIcon,
  UsersIcon,
  ClockIcon,
  DocumentCheckIcon
} from '@heroicons/react/24/outline'
import TemplatePreview from '../../components/templates/TemplatePreview'

const EVENT_TYPE_LABELS = {
  WEDDING: 'Mariage',
  DOT: 'Dot / Fiançailles',
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
  const [reviewData, setReviewData] = useState({ status: 'APPROVED', adminNote: '', priceUSD: '', commissionPercentage: '30' })
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

  const submissions = data?.submissions || []
  const pagination = data?.pagination || {}

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
        setReviewData({ status: 'APPROVED', adminNote: '', priceUSD: '', commissionPercentage: '30' })
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
      commissionPercentage: submission.commissionPercentage ? String(submission.commissionPercentage) : '30'
    })
    setShowReviewModal(true)
  }

  return (
    <div className="space-y-6">
      {/* Header with Background */}
      <div className="bg-gradient-to-r from-primary-50 to-secondary-50 rounded-2xl p-8 border border-primary-100">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-4xl font-serif font-bold text-primary-700">
              Marketplace
            </h1>
            <p className="text-gray-600 mt-2 text-lg">Approuvez ou rejetez les templates créateurs</p>
          </div>
          <div className="text-right">
            <p className="text-sm text-gray-600">Total soumissions</p>
            <p className="text-3xl font-bold text-primary-600">{pagination.total || 0}</p>
          </div>
        </div>
      </div>

      {/* View Mode Tabs */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-1">
        <div className="flex gap-1">
          <button
            onClick={() => {
              setViewMode('submissions')
              setPage(1)
            }}
            className={`flex-1 px-4 py-3 font-medium rounded-lg transition-all duration-200 ${
              viewMode === 'submissions'
                ? 'bg-primary-600 text-white shadow-md'
                : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
            }`}
          >
             <BookOpenIcon className="w-4 h-4" /> Soumissions
            
          </button>
          <button
            onClick={() => {
              setViewMode('by-creator')
              setPage(1)
            }}
            className={`flex-1 px-4 py-3 font-medium rounded-lg transition-all duration-200 ${
              viewMode === 'by-creator'
                ? 'bg-primary-600 text-white shadow-md'
                : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
            }`}
          >
           <UsersIcon className="w-4 h-4" /> Par Créateur
          </button>
        </div>
      </div>

      {/* Status Filter Tabs - Only show in submissions view */}
      {viewMode === 'submissions' && (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-1">
          <div className="flex gap-1">
            {['PENDING_REVIEW', 'APPROVED', 'REJECTED'].map((status) => (
              <button
                key={status}
                onClick={() => {
                  setStatusFilter(status)
                  setPage(1)
                }}
                className={`flex-1 px-4 py-2 font-medium rounded-lg transition-all duration-200 text-sm ${
                  statusFilter === status
                    ? status === 'PENDING_REVIEW'
                      ? 'bg-gold-500 text-white shadow-md'
                      : status === 'APPROVED'
                      ? 'bg-green-600 text-white shadow-md'
                      : 'bg-red-600 text-white shadow-md'
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                }`}
              >
                {status === 'PENDING_REVIEW' && (
                <>
                  <ClockIcon className="w-4 h-4" />
                  <span>En attente</span>
                </>
              )}

              {status === 'APPROVED' && (
                <>
                  <DocumentCheckIcon className="w-4 h-4" />
                  <span>Approuvés</span>
                </>
              )}

              {status === 'REJECTED' && (
                <>
                  <XMarkIcon className="w-4 h-4" />
                  <span>Rejetés</span>
                </>
              )}
              </button>
            ))}
          </div>
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
                  className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-2xl hover:border-primary-200 transition-all duration-300 group"
                >
                  {/* Template Preview */}
                  <div className="aspect-[3/4] bg-gradient-to-br from-gray-100 to-gray-200 overflow-hidden relative">
                    <TemplatePreview
                      template={{ config: submission.template.config || {} }}
                      className="group-hover:scale-110 transition-transform duration-300"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                  </div>

                  {/* Info */}
                  <div className="p-5 space-y-4">
                    <div className="space-y-1">
                      <h3 className="font-bold text-gray-900 text-lg">{submission.templateName}</h3>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-primary-100 text-primary-800">
                          {EVENT_TYPE_LABELS[submission.eventType] || submission.eventType}
                        </span>
                        <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-gold-100 text-gold-800">
                          {submission.category}
                        </span>
                      </div>
                    </div>

                    {/* Creator Info */}
                    <div className="bg-gradient-to-r from-primary-50 to-secondary-50 rounded-xl p-3 flex items-center gap-3 border border-primary-100">
                      {submission.creator.profileImage && (
                        <img
                          src={submission.creator.profileImage}
                          alt={submission.creator.displayName}
                          className="w-10 h-10 rounded-full object-cover ring-2 ring-white"
                        />
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-gray-900 truncate">
                          {submission.creator.displayName}
                        </p>
                        {submission.creator.verified && (
                          <p className="text-xs text-green-600 font-medium">✓ Vérifié</p>
                        )}
                      </div>
                    </div>

                    {/* Pricing Info */}
                    <div className="grid grid-cols-2 gap-3 bg-gray-50 rounded-xl p-4 border border-gray-200">
                      <div>
                        <p className="text-xs text-gray-600 font-medium mb-1">Prix</p>
                        <p className="text-lg font-bold text-gray-900">${submission.priceUSD.toFixed(2)}</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-600 font-medium mb-1">Commission</p>
                        <p className="text-lg font-bold text-primary-600">{submission.commissionPercentage}%</p>
                      </div>
                    </div>

                    {/* Real usage data (approved templates) */}
                    {submission.status === 'APPROVED' && (
                      <div className="grid grid-cols-2 gap-3 bg-green-50 rounded-xl p-4 border border-green-200">
                        <div>
                          <p className="text-xs text-gray-600 font-medium mb-1">Utilisations</p>
                          <p className="text-lg font-bold text-gray-900">{submission.usageCount ?? 0}</p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-600 font-medium mb-1">Revenu généré</p>
                          <p className="text-lg font-bold text-green-700">${(submission.revenueGenerated ?? 0).toFixed(2)}</p>
                        </div>
                      </div>
                    )}

                    {/* Status Badge */}
                    <div className="text-center py-2 px-3 rounded-lg bg-gradient-to-r from-gray-100 to-gray-50 border border-gray-200">
                      <p className="text-xs text-gray-600 font-medium">
                        {submission.status === 'APPROVED' && submission.reviewedAt
                          ? `Approuvé le ${new Date(submission.reviewedAt).toLocaleDateString('fr-FR')}`
                          : `Soumis le ${new Date(submission.submittedAt).toLocaleDateString('fr-FR')}`}
                      </p>
                    </div>

                    {/* Actions - Only show for PENDING_REVIEW */}
                    {statusFilter === 'PENDING_REVIEW' && (
                      <div className="flex gap-2 pt-2">
                        <button
                          onClick={() => openReviewModal(submission, 'APPROVED')}
                          className="flex-1 flex items-center justify-center gap-1 px-3 py-2.5 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm font-semibold transition-all duration-200 shadow-sm hover:shadow-md disabled:opacity-50"
                          disabled={reviewMutation.isLoading}
                        >
                          <DocumentCheckIcon className="w-4 h-4" />
                          Approuver
                        </button>
                        <button
                          onClick={() => openReviewModal(submission, 'REJECTED')}
                          className="flex-1 flex items-center justify-center gap-1 px-3 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-lg text-sm font-semibold transition-all duration-200 shadow-sm hover:shadow-md disabled:opacity-50"
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
                <div className="bg-gradient-to-r from-primary-50 via-secondary-50 to-gold-50 rounded-2xl p-8 border border-primary-100 shadow-sm">
                  <div className="flex items-center gap-6">
                    {group.creator.profileImage && (
                      <img
                        src={group.creator.profileImage}
                        alt={group.creator.displayName}
                        className="w-20 h-20 rounded-full object-cover ring-4 ring-white shadow-md"
                      />
                    )}
                    <div className="flex-1">
                      <h3 className="text-2xl font-bold text-primary-700">
                        {group.creator.displayName}
                      </h3>
                      <div className="flex items-center gap-4 mt-3 flex-wrap">
                        {group.creator.verified && (
                          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-green-100 text-green-700 rounded-full text-xs font-semibold border border-green-200">
                            ✓ Vérifié
                          </span>
                        )}
                        <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-gold-100 text-gold-800 rounded-full text-xs font-semibold border border-gold-200">
                          📊 {group.templates.length} template{group.templates.length !== 1 ? 's' : ''}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Creator's Templates Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
                  {group.templates.map((submission) => (
                    <div
                      key={submission.id}
                      className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-xl hover:border-primary-200 transition-all duration-300 group"
                    >
                      {/* Template Preview */}
                      <div className="aspect-[3/4] bg-gradient-to-br from-gray-100 to-gray-200 overflow-hidden relative">
                        <TemplatePreview
                          template={{ config: submission.template.config || {} }}
                          className="group-hover:scale-110 transition-transform duration-300"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                      </div>

                      {/* Info */}
                      <div className="p-4 space-y-3">
                        <h4 className="font-bold text-gray-900">{submission.templateName}</h4>
                        <div className="bg-gradient-to-r from-primary-50 to-secondary-50 rounded-lg p-3 space-y-2 border border-primary-100">
                          <div className="flex justify-between text-xs">
                            <span className="text-gray-600 font-medium">Prix:</span>
                            <span className="font-bold text-gray-900">${submission.priceUSD.toFixed(2)}</span>
                          </div>
                          <div className="flex justify-between text-xs">
                            <span className="text-gray-600 font-medium">Commission:</span>
                            <span className="font-bold text-primary-600">{submission.commissionPercentage}%</span>
                          </div>
                        </div>
                        <p className="text-xs text-gray-500 font-medium">
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

              {reviewData.status === 'APPROVED' && (
                <div className="space-y-5">
                  <div className="bg-green-50 border border-green-200 rounded-xl p-4">
                    <p className="text-sm font-medium text-green-900">
                      ✓ Définissez le prix de vente et la commission du créateur. Le template sera ensuite
                      visible dans la marketplace.
                    </p>
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Prix de vente (USD)
                    </label>
                    <div className="flex">
                      <span className="inline-flex items-center px-3 bg-gray-200 text-gray-700 text-sm rounded-l-xl">$</span>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={reviewData.priceUSD}
                        onChange={(e) => setReviewData({ ...reviewData, priceUSD: e.target.value })}
                        placeholder="0.00"
                        className="flex-1 px-4 py-3 border border-gray-300 rounded-r-xl focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none transition bg-gray-50 hover:bg-white"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Commission créateur (%)
                    </label>
                    <input
                      type="number"
                      min="0"
                      max="100"
                      value={reviewData.commissionPercentage}
                      onChange={(e) => setReviewData({ ...reviewData, commissionPercentage: e.target.value })}
                      placeholder="30"
                      className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none transition bg-gray-50 hover:bg-white"
                    />
                  </div>

                  <div className="bg-primary-50 border border-primary-200 rounded-xl p-4">
                    <p className="text-xs text-gray-600 mb-1">Gain du créateur par utilisation</p>
                    <p className="text-2xl font-bold text-primary-600">
                      ${(((parseFloat(reviewData.priceUSD) || 0) * (parseFloat(reviewData.commissionPercentage) || 0)) / 100).toFixed(2)}
                    </p>
                    <p className="text-xs text-gray-500 mt-1">
                      ${reviewData.priceUSD || '0'} × {reviewData.commissionPercentage || '0'}%
                    </p>
                  </div>
                </div>
              )}

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
    </div>
  )
}
