import { useState } from 'react'
import { useQuery, useQueryClient } from 'react-query'
import { useNavigate } from 'react-router-dom'
import { templateAPI } from '../../services/api'
import toast from 'react-hot-toast'
import {
  PlusIcon,
  SparklesIcon,
  EyeIcon,
  PencilIcon,
  TrashIcon
} from '@heroicons/react/24/outline'
import TemplatePreview from '../../components/templates/TemplatePreview'

export default function CreatorTemplates() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [previewTemplate, setPreviewTemplate] = useState(null)
  const [selectedCategory, setSelectedCategory] = useState('all')

  const { data: myTemplatesData, isLoading: myLoading, refetch: refetchMine } = useQuery(
    'my-templates',
    () => templateAPI.getMyTemplates()
  )
  const myTemplates = myTemplatesData?.data?.templates || []

  const { data: allTemplatesData, isLoading: allLoading } = useQuery(
    'all-templates',
    () => templateAPI.getAll()
  )
  const allTemplates = allTemplatesData?.data?.templates || []

  const categories = [
    { value: 'all', label: 'Tous' },
    { value: 'ELEGANT', label: 'Élégant' },
    { value: 'MODERN', label: 'Moderne' },
    { value: 'ROMANTIC', label: 'Romantique' },
    { value: 'MINIMALIST', label: 'Minimaliste' },
    { value: 'TRADITIONAL', label: 'Traditionnel' }
  ]

  const filteredTemplates = selectedCategory === 'all'
    ? allTemplates
    : allTemplates.filter(t => t.category === selectedCategory)

  const handleFork = async (templateId) => {
    try {
      const response = await templateAPI.fork(templateId)
      const forkedId = response.data.template.id
      queryClient.invalidateQueries('my-templates')
      toast.success('Template dupliqué avec succès')
      // Rediriger vers l'éditeur
      navigate(`/templates/${forkedId}/design?wedding=null`)
    } catch (err) {
      toast.error(err.response?.data?.error || 'Erreur lors de la duplication')
    }
  }

  const handleDeleteTemplate = async (templateId) => {
    if (!window.confirm('Êtes-vous sûr de vouloir supprimer ce template?')) return

    try {
      await templateAPI.delete(templateId)
      queryClient.invalidateQueries('my-templates')
      toast.success('Template supprimé')
    } catch (err) {
      toast.error('Erreur lors de la suppression')
    }
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-serif font-bold text-gray-900">Créer un Template</h1>
          <p className="text-gray-600 mt-1">Dupliquez un template existant pour commencer</p>
        </div>
      </div>

      {/* Mes Templates Section */}
      {myTemplates.length > 0 && (
        <div>
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Mes Templates ({myTemplates.length})</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {myTemplates.map((template) => (
              <div
                key={template.id}
                className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden hover:shadow-lg transition-shadow"
              >
                {template.config?.previewImage && (
                  <div className="aspect-[3/4] overflow-hidden bg-gray-100">
                    <img
                      src={template.config.previewImage}
                      alt={template.name}
                      className="w-full h-full object-cover"
                    />
                  </div>
                )}
                <div className="p-4">
                  <h3 className="font-semibold text-gray-900 truncate">{template.name}</h3>
                  <p className="text-xs text-gray-500 mt-1 line-clamp-1">{template.description}</p>

                  <div className="flex gap-2 mt-3">
                    <button
                      onClick={() => navigate(`/templates/${template.id}/design?wedding=null`)}
                      className="flex-1 flex items-center justify-center gap-1 px-3 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-lg text-xs font-medium transition-colors"
                    >
                      <PencilIcon className="w-3.5 h-3.5" />
                      Designer
                    </button>
                    <button
                      onClick={() => navigate(`/templates/${template.id}/publish`)}
                      className="flex-1 flex items-center justify-center gap-1 px-3 py-2 border border-primary-600 text-primary-600 hover:bg-primary-50 rounded-lg text-xs font-medium transition-colors"
                    >
                      <SparklesIcon className="w-3.5 h-3.5" />
                      Publier
                    </button>
                    <button
                      onClick={() => handleDeleteTemplate(template.id)}
                      className="px-3 py-2 border border-red-200 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                    >
                      <TrashIcon className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Galerie de Templates à Dupliquer */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-2xl font-bold text-gray-900">Galerie de Templates</h2>
          <p className="text-sm text-gray-600">Dupliquez un template pour démarrer</p>
        </div>

        {/* Filtres */}
        <div className="flex flex-wrap gap-2 mb-6">
          {categories.map((cat) => (
            <button
              key={cat.value}
              onClick={() => setSelectedCategory(cat.value)}
              className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                selectedCategory === cat.value
                  ? 'bg-primary-600 text-white'
                  : 'bg-white text-gray-600 border border-gray-200 hover:border-primary-300'
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>

        {/* Templates Grid */}
        {allLoading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto"></div>
            <p className="mt-4 text-gray-500">Chargement des templates...</p>
          </div>
        ) : filteredTemplates.length === 0 ? (
          <div className="bg-white rounded-xl shadow-lg p-12 text-center">
            <SparklesIcon className="h-16 w-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-xl font-medium text-gray-900 mb-2">Aucun template disponible</h3>
            <p className="text-gray-500">Les templates seront bientôt disponibles</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {filteredTemplates.map((template) => (
              <div
                key={template.id}
                className="group bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden hover:shadow-xl hover:border-primary-200 transition-all"
              >
                {/* Preview */}
                <div className="relative aspect-[3/4] overflow-hidden bg-gray-100">
                  <TemplatePreview
                    template={template}
                    className="group-hover:scale-105 transition-transform duration-500"
                  />

                  {/* Overlay with Actions */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/30 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex flex-col items-center justify-end pb-4 px-3">
                    <button
                      onClick={() => setPreviewTemplate(template)}
                      className="mb-2 flex items-center gap-1 px-3 py-1.5 bg-white/90 backdrop-blur-sm text-gray-800 rounded-full text-xs font-medium hover:bg-white transition-colors"
                    >
                      <EyeIcon className="h-3 w-3" />
                      Aperçu
                    </button>
                    <button
                      onClick={() => handleFork(template.id)}
                      className="flex items-center gap-1 px-4 py-2 bg-primary-600 text-white rounded-full text-xs font-semibold hover:bg-primary-700 transition-colors shadow-lg"
                    >
                      <PlusIcon className="h-3.5 w-3.5" />
                      Dupliquer
                    </button>
                  </div>
                </div>

                {/* Info */}
                <div className="p-3">
                  <h3 className="font-semibold text-gray-900 text-sm truncate">{template.name}</h3>
                  <p className="text-xs text-gray-500 mt-0.5 line-clamp-1">{template.description}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Preview Modal */}
      {previewTemplate && (
        <div
          className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4 backdrop-blur-sm"
          onClick={() => setPreviewTemplate(null)}
        >
          <div
            className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="sticky top-0 bg-white p-4 border-b flex items-center justify-between">
              <h3 className="text-lg font-bold text-gray-900">{previewTemplate.name}</h3>
              <button
                onClick={() => setPreviewTemplate(null)}
                className="text-gray-400 hover:text-gray-600"
              >
                ✕
              </button>
            </div>

            <div className="p-6 flex justify-center">
              <div className="aspect-[3/4] w-full max-w-sm bg-white shadow-lg rounded-lg overflow-hidden">
                <TemplatePreview template={previewTemplate} />
              </div>
            </div>

            <div className="p-6 border-t flex gap-3 justify-center">
              <button
                onClick={() => {
                  setPreviewTemplate(null)
                  handleFork(previewTemplate.id)
                }}
                className="px-6 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-lg font-medium transition-colors flex items-center gap-2"
              >
                <PlusIcon className="w-4 h-4" />
                Dupliquer ce template
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
