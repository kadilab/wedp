import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from 'react-query'
import { adminAPI } from '../../services/api'
import toast from 'react-hot-toast'
import {
  CheckIcon,
  XMarkIcon,
  SparklesIcon,
} from '@heroicons/react/24/outline'
import TemplatePreview from '../../components/templates/TemplatePreview'

export default function AdminMarketplaceApprovals() {
  const queryClient = useQueryClient()
  const [viewMode, setViewMode] = useState('submissions') // 'submissions' or 'by-creator'
  const [statusFilter, setStatusFilter] = useState('PENDING_REVIEW')
  const [selectedSubmission, setSelectedSubmission] = useState(null)
  const [showReviewModal, setShowReviewModal] = useState(false)
  const [reviewData, setReviewData] = useState({ status: 'APPROVED', adminNote: '' })
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
    ({ submissionId, status, adminNote }) =>
      adminAPI.reviewMarketplaceTemplate(submissionId, { status, adminNote }),
    {
      onSuccess: () => {
        queryClient.invalidateQueries('marketplace-submissions')
        toast.success('Template review submitted')
        setShowReviewModal(false)
        setSelectedSubmission(null)
        setReviewData({ status: 'APPROVED', adminNote: '' })
      },
      onError: (err) =>
        toast.error(err.response?.data?.message || 'Error reviewing template')
    }
  )

  const handleReview = () => {
    if (!selectedSubmission) return
    reviewMutation.mutate({
      submissionId: selectedSubmission.id,
      status: reviewData.status,
      adminNote: reviewData.adminNote
    })
  }

  const openReviewModal = (submission, status) => {
    setSelectedSubmission(submission)
    setReviewData({ status, adminNote: '' })
    setShowReviewModal(true)
  }

  return (
    <div className="space-y-6">
      {/* Header with Background */}
      <div className="bg-gradient-to-r from-indigo-50 to-purple-50 rounded-2xl p-8 border border-indigo-100">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-4xl font-serif font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
              Marketplace
            </h1>
            <p className="text-gray-600 mt-2 text-lg">Approuvez ou rejetez les templates créateurs</p>
          </div>
          <div className="text-right">
            <p className="text-sm text-gray-600">Total soumissions</p>
            <p className="text-3xl font-bold text-indigo-600">{pagination.total || 0}</p>
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
                ? 'bg-indigo-600 text-white shadow-md'
                : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
            }`}
          >
            📋 Soumissions
          </button>
          <button
            onClick={() => {
              setViewMode('by-creator')
              setPage(1)
            }}
            className={`flex-1 px-4 py-3 font-medium rounded-lg transition-all duration-200 ${
              viewMode === 'by-creator'
                ? 'bg-indigo-600 text-white shadow-md'
                : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
            }`}
          >
            👥 Par Créateur
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
                      ? 'bg-amber-500 text-white shadow-md'
                      : status === 'APPROVED'
                      ? 'bg-green-500 text-white shadow-md'
                      : 'bg-red-500 text-white shadow-md'
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                }`}
              >
                {status === 'PENDING_REVIEW' && '⏳ En attente'}
                {status === 'APPROVED' && '✅ Approuvés'}
                {status === 'REJECTED' && '❌ Rejetés'}
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
          <div className="bg-gradient-to-br from-indigo-50 to-purple-50 rounded-2xl shadow-sm border border-indigo-100 p-16 text-center">
            <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-indigo-100 mb-6">
              <SparklesIcon className="h-10 w-10 text-indigo-600" />
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
                  className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-2xl hover:border-indigo-200 transition-all duration-300 group"
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
                      <div className="flex items-center gap-2">
                        <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-indigo-100 text-indigo-700">
                          {submission.category}
                        </span>
                      </div>
                    </div>

                    {/* Creator Info */}
                    <div className="bg-gradient-to-r from-indigo-50 to-purple-50 rounded-xl p-3 flex items-center gap-3 border border-indigo-100">
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
                        <p className="text-lg font-bold text-indigo-600">{submission.commissionPercentage}%</p>
                      </div>
                    </div>

                    {/* Status Badge */}
                    <div className="text-center py-2 px-3 rounded-lg bg-gradient-to-r from-gray-100 to-gray-50 border border-gray-200">
                      <p className="text-xs text-gray-600 font-medium">
                        Soumis le {new Date(submission.submittedAt).toLocaleDateString('fr-FR')}
                      </p>
                    </div>

                    {/* Actions - Only show for PENDING_REVIEW */}
                    {statusFilter === 'PENDING_REVIEW' && (
                      <div className="flex gap-2 pt-2">
                        <button
                          onClick={() => openReviewModal(submission, 'APPROVED')}
                          className="flex-1 flex items-center justify-center gap-1 px-3 py-2.5 bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white rounded-lg text-sm font-semibold transition-all duration-200 shadow-sm hover:shadow-md disabled:opacity-50"
                          disabled={reviewMutation.isLoading}
                        >
                          <CheckIcon className="w-4 h-4" />
                          Approuver
                        </button>
                        <button
                          onClick={() => openReviewModal(submission, 'REJECTED')}
                          className="flex-1 flex items-center justify-center gap-1 px-3 py-2.5 bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white rounded-lg text-sm font-semibold transition-all duration-200 shadow-sm hover:shadow-md disabled:opacity-50"
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
                    className="px-5 py-2 border border-gray-300 rounded-xl hover:bg-indigo-50 hover:border-indigo-300 text-gray-700 font-medium transition-all duration-200"
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
                          ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-md'
                          : 'border border-gray-300 text-gray-700 hover:bg-gray-50 hover:border-indigo-300'
                      }`}
                    >
                      {p}
                    </button>
                  ))}
                </div>

                {pagination.page < pagination.totalPages && (
                  <button
                    onClick={() => setPage(pagination.page + 1)}
                    className="px-5 py-2 border border-gray-300 rounded-xl hover:bg-indigo-50 hover:border-indigo-300 text-gray-700 font-medium transition-all duration-200"
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
          <div className="bg-gradient-to-br from-purple-50 to-indigo-50 rounded-2xl shadow-sm border border-purple-100 p-16 text-center">
            <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-purple-100 mb-6">
              <SparklesIcon className="h-10 w-10 text-purple-600" />
            </div>
            <h3 className="text-2xl font-bold text-gray-900 mb-2">Aucun template approuvé</h3>
            <p className="text-gray-600 text-lg max-w-md mx-auto">Les templates approuvés apparaîtront ici</p>
          </div>
        ) : (
          <div className="space-y-8">
            {Object.values(submissionsByCreator).map((group) => (
              <div key={group.creator.id} className="space-y-5">
                {/* Creator Header */}
                <div className="bg-gradient-to-r from-purple-50 via-indigo-50 to-blue-50 rounded-2xl p-8 border border-purple-100 shadow-sm">
                  <div className="flex items-center gap-6">
                    {group.creator.profileImage && (
                      <img
                        src={group.creator.profileImage}
                        alt={group.creator.displayName}
                        className="w-20 h-20 rounded-full object-cover ring-4 ring-white shadow-md"
                      />
                    )}
                    <div className="flex-1">
                      <h3 className="text-2xl font-bold bg-gradient-to-r from-purple-600 to-indigo-600 bg-clip-text text-transparent">
                        {group.creator.displayName}
                      </h3>
                      <div className="flex items-center gap-4 mt-3 flex-wrap">
                        {group.creator.verified && (
                          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-r from-green-100 to-emerald-100 text-green-700 rounded-full text-xs font-semibold border border-green-200">
                            ✓ Vérifié
                          </span>
                        )}
                        <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-indigo-100 text-indigo-700 rounded-full text-xs font-semibold border border-indigo-200">
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
                      className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-xl hover:border-indigo-200 transition-all duration-300 group"
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
                        <div className="bg-gradient-to-r from-indigo-50 to-purple-50 rounded-lg p-3 space-y-2 border border-indigo-100">
                          <div className="flex justify-between text-xs">
                            <span className="text-gray-600 font-medium">Prix:</span>
                            <span className="font-bold text-gray-900">${submission.priceUSD.toFixed(2)}</span>
                          </div>
                          <div className="flex justify-between text-xs">
                            <span className="text-gray-600 font-medium">Commission:</span>
                            <span className="font-bold text-indigo-600">{submission.commissionPercentage}%</span>
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
                <div className="w-14 h-14 bg-gradient-to-br from-green-100 to-emerald-100 rounded-full flex items-center justify-center">
                  <CheckIcon className="w-7 h-7 text-green-600" />
                </div>
              ) : (
                <div className="w-14 h-14 bg-gradient-to-br from-red-100 to-rose-100 rounded-full flex items-center justify-center">
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
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-red-500 focus:border-transparent outline-none transition resize-none bg-gray-50 hover:bg-white"
                  />
                </div>
              )}

              {reviewData.status === 'APPROVED' && (
                <div className="bg-gradient-to-br from-green-50 to-emerald-50 border border-green-200 rounded-xl p-5">
                  <p className="text-sm font-medium text-green-900">
                    ✓ Ce template sera visible dans la marketplace et les créateurs pourront gagner des commissions.
                  </p>
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
                      ? 'bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700'
                      : 'bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700'
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
