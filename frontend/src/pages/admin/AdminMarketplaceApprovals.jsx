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
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-serif font-bold text-gray-900">Marketplace</h1>
          <p className="text-gray-600 mt-1">Approuvez ou rejetez les templates créateurs</p>
        </div>
      </div>

      {/* View Mode Tabs */}
      <div className="flex gap-2 border-b border-gray-200">
        <button
          onClick={() => {
            setViewMode('submissions')
            setPage(1)
          }}
          className={`px-4 py-3 font-medium border-b-2 transition-colors ${
            viewMode === 'submissions'
              ? 'border-primary-600 text-primary-600'
              : 'border-transparent text-gray-600 hover:text-gray-900'
          }`}
        >
          📋 Soumissions
        </button>
        <button
          onClick={() => {
            setViewMode('by-creator')
            setPage(1)
          }}
          className={`px-4 py-3 font-medium border-b-2 transition-colors ${
            viewMode === 'by-creator'
              ? 'border-primary-600 text-primary-600'
              : 'border-transparent text-gray-600 hover:text-gray-900'
          }`}
        >
          👥 Par Créateur
        </button>
      </div>

      {/* Status Filter Tabs - Only show in submissions view */}
      {viewMode === 'submissions' && (
        <div className="flex gap-2 border-b border-gray-200 bg-gray-50 px-4">
          {['PENDING_REVIEW', 'APPROVED', 'REJECTED'].map((status) => (
            <button
              key={status}
              onClick={() => {
                setStatusFilter(status)
                setPage(1)
              }}
              className={`px-4 py-3 font-medium border-b-2 transition-colors ${
                statusFilter === status
                  ? 'border-primary-600 text-primary-600'
                  : 'border-transparent text-gray-600 hover:text-gray-900'
              }`}
            >
              {status === 'PENDING_REVIEW' && '⏳ En attente'}
              {status === 'APPROVED' && '✅ Approuvés'}
              {status === 'REJECTED' && '❌ Rejetés'}
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
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-12 text-center">
            <SparklesIcon className="h-16 w-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-900 mb-2">
              Aucune soumission {statusFilter === 'PENDING_REVIEW' ? 'en attente' : statusFilter === 'APPROVED' ? 'approuvée' : 'rejetée'}
            </h3>
            <p className="text-gray-500">
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
                  className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-lg transition-shadow"
                >
                  {/* Template Preview */}
                  <div className="aspect-[3/4] bg-gray-100 overflow-hidden group">
                    <TemplatePreview
                      template={{ config: submission.template.config || {} }}
                      className="group-hover:scale-105 transition-transform duration-300"
                    />
                  </div>

                  {/* Info */}
                  <div className="p-4 space-y-3">
                    <div>
                      <h3 className="font-semibold text-gray-900">{submission.templateName}</h3>
                      <p className="text-sm text-gray-500 mt-0.5">
                        Catégorie: <span className="font-medium text-gray-700">{submission.category}</span>
                      </p>
                    </div>

                    {/* Creator Info */}
                    <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg p-3 flex items-center gap-3">
                      {submission.creator.profileImage && (
                        <img
                          src={submission.creator.profileImage}
                          alt={submission.creator.displayName}
                          className="w-8 h-8 rounded-full object-cover"
                        />
                      )}
                      <div className="flex-1">
                        <p className="text-sm font-medium text-gray-900">
                          {submission.creator.displayName}
                        </p>
                        {submission.creator.verified && (
                          <p className="text-xs text-green-600">✓ Vérifié</p>
                        )}
                      </div>
                    </div>

                    {/* Pricing Info */}
                    <div className="bg-gray-50 rounded-lg p-3 space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">Prix:</span>
                        <span className="font-semibold text-gray-900">${submission.priceUSD.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">Commission créateur:</span>
                        <span className="font-semibold text-gray-900">{submission.commissionPercentage}%</span>
                      </div>
                    </div>

                    {/* Status Badge */}
                    <div className="text-center py-2 px-3 rounded-lg bg-gradient-to-r from-blue-100 to-indigo-100">
                      <p className="text-sm font-medium text-blue-900">
                        Soumis le {new Date(submission.submittedAt).toLocaleDateString('fr-FR')}
                      </p>
                    </div>

                    {/* Actions - Only show for PENDING_REVIEW */}
                    {statusFilter === 'PENDING_REVIEW' && (
                      <div className="flex gap-2 pt-2">
                        <button
                          onClick={() => openReviewModal(submission, 'APPROVED')}
                          className="flex-1 flex items-center justify-center gap-1 px-3 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm font-medium transition-colors"
                          disabled={reviewMutation.isLoading}
                        >
                          <CheckIcon className="w-4 h-4" />
                          Approuver
                        </button>
                        <button
                          onClick={() => openReviewModal(submission, 'REJECTED')}
                          className="flex-1 flex items-center justify-center gap-1 px-3 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-sm font-medium transition-colors"
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
              <div className="flex items-center justify-center gap-2 mt-8">
                {pagination.page > 1 && (
                  <button
                    onClick={() => setPage(pagination.page - 1)}
                    className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                  >
                    Précédent
                  </button>
                )}

                <div className="flex gap-1">
                  {Array.from({ length: pagination.totalPages }, (_, i) => i + 1).map((p) => (
                    <button
                      key={p}
                      onClick={() => setPage(p)}
                      className={`px-3 py-2 rounded-lg ${
                        p === pagination.page
                          ? 'bg-primary-600 text-white'
                          : 'border border-gray-300 hover:bg-gray-50'
                      }`}
                    >
                      {p}
                    </button>
                  ))}
                </div>

                {pagination.page < pagination.totalPages && (
                  <button
                    onClick={() => setPage(pagination.page + 1)}
                    className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                  >
                    Suivant
                  </button>
                )}
              </div>
            )}
          </>
        )
      ) : (
        // BY-CREATOR VIEW
        Object.keys(submissionsByCreator).length === 0 ? (
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-12 text-center">
            <SparklesIcon className="h-16 w-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-900 mb-2">Aucun template approuvé</h3>
            <p className="text-gray-500">Les templates approuvés apparaîtront ici</p>
          </div>
        ) : (
          <div className="space-y-8">
            {Object.values(submissionsByCreator).map((group) => (
              <div key={group.creator.id} className="space-y-4">
                {/* Creator Header */}
                <div className="bg-gradient-to-r from-purple-50 to-indigo-50 rounded-xl p-6 border border-purple-100">
                  <div className="flex items-center gap-4">
                    {group.creator.profileImage && (
                      <img
                        src={group.creator.profileImage}
                        alt={group.creator.displayName}
                        className="w-16 h-16 rounded-full object-cover"
                      />
                    )}
                    <div className="flex-1">
                      <h3 className="text-lg font-bold text-gray-900">
                        {group.creator.displayName}
                      </h3>
                      <div className="flex items-center gap-3 mt-2">
                        {group.creator.verified && (
                          <span className="inline-flex items-center gap-1 px-2 py-1 bg-green-100 text-green-700 rounded-full text-xs font-medium">
                            ✓ Vérifié
                          </span>
                        )}
                        <span className="text-sm text-gray-600">
                          {group.templates.length} template{group.templates.length !== 1 ? 's' : ''}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Creator's Templates Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                  {group.templates.map((submission) => (
                    <div
                      key={submission.id}
                      className="bg-white rounded-lg shadow-sm border border-gray-100 overflow-hidden hover:shadow-md transition-shadow"
                    >
                      {/* Template Preview */}
                      <div className="aspect-[3/4] bg-gray-100 overflow-hidden group">
                        <TemplatePreview
                          template={{ config: submission.template.config || {} }}
                          className="group-hover:scale-105 transition-transform duration-300"
                        />
                      </div>

                      {/* Info */}
                      <div className="p-3 space-y-2">
                        <h4 className="font-semibold text-gray-900 text-sm">{submission.templateName}</h4>
                        <div className="bg-gray-50 rounded p-2 space-y-1">
                          <div className="flex justify-between text-xs">
                            <span className="text-gray-600">Prix:</span>
                            <span className="font-semibold">${submission.priceUSD.toFixed(2)}</span>
                          </div>
                          <div className="flex justify-between text-xs">
                            <span className="text-gray-600">Commission:</span>
                            <span className="font-semibold">{submission.commissionPercentage}%</span>
                          </div>
                        </div>
                        <p className="text-xs text-gray-500">
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
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 animate-in fade-in zoom-in duration-200">
            <div className="flex items-center gap-3 mb-6">
              {reviewData.status === 'APPROVED' ? (
                <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
                  <CheckIcon className="w-6 h-6 text-green-600" />
                </div>
              ) : (
                <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center">
                  <XMarkIcon className="w-6 h-6 text-red-600" />
                </div>
              )}
              <div>
                <h3 className="text-lg font-bold text-gray-900">
                  {reviewData.status === 'APPROVED' ? 'Approuver le template' : 'Rejeter le template'}
                </h3>
                <p className="text-sm text-gray-600">{selectedSubmission.templateName}</p>
              </div>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault()
                handleReview()
              }}
              className="space-y-4"
            >
              {reviewData.status === 'REJECTED' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Raison du rejet (optionnel)
                  </label>
                  <textarea
                    value={reviewData.adminNote}
                    onChange={(e) =>
                      setReviewData({ ...reviewData, adminNote: e.target.value })
                    }
                    placeholder="Expliquez pourquoi ce template n'est pas approuvé..."
                    rows="3"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none transition resize-none"
                  />
                </div>
              )}

              {reviewData.status === 'APPROVED' && (
                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <p className="text-sm text-green-800">
                    ✓ Ce template sera visible dans la marketplace et les créateurs pourront gagner des commissions.
                  </p>
                </div>
              )}

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowReviewModal(false)}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 font-medium hover:bg-gray-50 transition-colors"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={reviewMutation.isLoading}
                  className={`flex-1 px-4 py-2 rounded-lg text-white font-medium transition-colors disabled:opacity-50 ${
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
