import { useState, useEffect } from 'react'
import { useQuery, useQueryClient } from 'react-query'
import { useNavigate } from 'react-router-dom'
import { templateAPI, weddingAPI } from '../../services/api'
import { useAuthStore } from '../../stores/authStore'
import TemplatePreview from '../../components/templates/TemplatePreview'
import toast from 'react-hot-toast'
import {
  HeartIcon,
  SwatchIcon,
  StarIcon,
  EyeIcon,
  XMarkIcon,
  CheckIcon,
  SparklesIcon,
  DevicePhoneMobileIcon,
  ComputerDesktopIcon,
  PaintBrushIcon,
  UserIcon,
  ArrowUpIcon
} from '@heroicons/react/24/outline'
import { StarIcon as StarSolidIcon } from '@heroicons/react/24/solid'
import { EVENT_TYPES, EVENT_TYPE_LABELS } from '../../utils/eventTypes'

export default function Templates() {
  const navigate = useNavigate()
  const { user } = useAuthStore()
  const [selectedEventType, setSelectedEventType] = useState('all')
  const [selectedCategory, setSelectedCategory] = useState('all')
  const [previewTemplate, setPreviewTemplate] = useState(null)
  const [previewDevice, setPreviewDevice] = useState('desktop')
  const [page, setPage] = useState(1)
  const PER_PAGE = 10

  
  const { data, isLoading } = useQuery('templates', () => templateAPI.getAll())
  const templates = data?.data?.templates || []

  const { data: myTemplatesData, refetch: refetchMyTemplates } = useQuery('my-templates', () => templateAPI.getMyTemplates())
  const myTemplates = myTemplatesData?.data?.templates || []


  const categories = [
    { value: 'all', label: 'Tous' },
    { value: 'ELEGANT', label: 'Élégant' },
    { value: 'MODERN', label: 'Moderne' },
    { value: 'ROMANTIC', label: 'Romantique' },
    { value: 'MINIMALIST', label: 'Minimaliste' },
    { value: 'TRADITIONAL', label: 'Traditionnel' }
  ]

  const eventTypeFilters = [
    { value: 'all', label: 'Tous' },
    ...EVENT_TYPES.map(type => ({ value: type, label: EVENT_TYPE_LABELS[type] }))
  ]

  const eventFilteredTemplates = selectedEventType === 'all'
    ? templates
    : templates.filter(t => (t.eventType || 'WEDDING') === selectedEventType)

  const filteredTemplates = selectedCategory === 'all'
    ? eventFilteredTemplates
    : eventFilteredTemplates.filter(t => t.category === selectedCategory)

  // Pagination — 10 per page, reset to page 1 whenever the filters change.
  useEffect(() => { setPage(1) }, [selectedEventType, selectedCategory])
  const totalPages = Math.max(1, Math.ceil(filteredTemplates.length / PER_PAGE))
  const currentPage = Math.min(page, totalPages)
  const pagedTemplates = filteredTemplates.slice((currentPage - 1) * PER_PAGE, currentPage * PER_PAGE)

  const handleSelectTemplate = (template) => {
    // Navigate to event creation with the template AND its event type, so the
    // right form (wedding / birthday…) opens with this template pre-selected.
    navigate('/weddings/new', {
      state: { templateId: template.id, eventType: template.eventType || 'WEDDING' }
    })
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-serif font-bold text-gray-900">Templates</h1>
          <p className="text-gray-600 mt-1">
            Choisissez un design pour créer vos invitations de mariage
          </p>
        </div>
        <div className="flex items-center gap-2 text-sm text-gray-500">
          <SparklesIcon className="h-5 w-5 text-gold-500" />
          <span>{templates.length} modèles disponibles</span>
        </div>
      </div>

      {/* Event Type Filters */}
      <div className="flex flex-wrap gap-2">
        {eventTypeFilters.map((type) => (
          <button
            key={type.value}
            onClick={() => setSelectedEventType(type.value)}
            className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
              selectedEventType === type.value
                ? 'bg-gold-500 text-white shadow-lg shadow-gold-200'
                : 'bg-white text-gray-600 border border-gray-200 hover:border-gold-300 hover:text-gold-600'
            }`}
          >
            {type.label}
            {type.value !== 'all' && (
              <span className="ml-1.5 opacity-70">
                ({templates.filter(t => (t.eventType || 'WEDDING') === type.value).length})
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Mes Templates */}
      {myTemplates.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-3">
            <UserIcon className="h-5 w-5 text-primary-600" />
            <h2 className="text-lg font-semibold text-gray-800">Mes templates personnalisés</h2>
            <span className="text-xs bg-primary-100 text-primary-700 px-2 py-0.5 rounded-full">{myTemplates.length}</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {myTemplates.map((tpl) => {
              const linkedWedding = tpl.weddings?.[0]
              return (
                <div key={tpl.id} className="group bg-white rounded-xl shadow-sm border border-primary-100 overflow-hidden hover:shadow-lg hover:border-primary-300 transition-all duration-300">
                  <div className="relative aspect-[3/4] overflow-hidden bg-gray-100">
                    <TemplatePreview template={tpl} fit="cover" className="group-hover:scale-105 transition-transform duration-500" />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex flex-col items-center justify-end pb-4 gap-2">
                      <button
                        onClick={() => navigate(`/templates/${tpl.id}/design${linkedWedding ? `?wedding=${linkedWedding.id}` : ''}`)}
                        className="flex items-center gap-2 px-4 py-2 bg-white/90 backdrop-blur-sm text-primary-700 rounded-full text-sm font-medium hover:bg-white transition-colors"
                      >
                        <PaintBrushIcon className="h-4 w-4" />
                        Modifier
                      </button>
                      {linkedWedding && (
                        <button
                          onClick={() => navigate(`/weddings/${linkedWedding.id}/invitations`)}
                          className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-full text-sm font-medium hover:bg-primary-700 transition-colors"
                        >
                          <CheckIcon className="h-4 w-4" />
                          Voir les invitations
                        </button>
                      )}
                    </div>
                  </div>
                  <div className="p-3">
                    <p className="font-medium text-gray-900 text-sm truncate">{tpl.name}</p>
                    {linkedWedding && (
                      <p className="text-xs text-gray-500 mt-0.5 truncate">{linkedWedding.brideName} & {linkedWedding.groomName}</p>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
          <hr className="mt-6" />
        </div>
      )}


      <div className="flex flex-wrap gap-2">
        {categories.map((cat) => (
          <button
            key={cat.value}
            onClick={() => setSelectedCategory(cat.value)}
            className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
              selectedCategory === cat.value
                ? 'bg-primary-600 text-white shadow-lg shadow-primary-200'
                : 'bg-white text-gray-600 border border-gray-200 hover:border-primary-300 hover:text-primary-600'
            }`}
          >
            {cat.label}
            {cat.value !== 'all' && (
              <span className="ml-1.5 opacity-70">
                ({eventFilteredTemplates.filter(t => t.category === cat.value).length})
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Templates Grid */}
      {isLoading ? (
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto"></div>
          <p className="mt-4 text-gray-500">Chargement des templates...</p>
        </div>
      ) : filteredTemplates.length === 0 ? (
        <div className="bg-white rounded-xl shadow-lg p-12 text-center">
          <SwatchIcon className="h-16 w-16 text-gray-300 mx-auto mb-4" />
          <h2 className="text-xl font-medium text-gray-900 mb-2">
            {selectedCategory === 'all' ? 'Aucun template disponible' : 'Aucun template dans cette catégorie'}
          </h2>
          <p className="text-gray-500">
            {selectedCategory === 'all' 
              ? 'Les templates seront bientôt disponibles'
              : 'Essayez une autre catégorie'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {pagedTemplates.map((template) => (
            <div 
              key={template.id} 
              className="group bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-xl hover:border-primary-200 transition-all duration-300"
            >
              {/* Preview */}
              <div className="relative aspect-[3/4] overflow-hidden bg-gray-100">
                <TemplatePreview
                  template={template}
                  fit="cover"
                  className="group-hover:scale-105 transition-transform duration-500"
                />

                {/* Premium Badge */}
                {template.isPremium && (
                  <div className="absolute top-3 right-3 bg-gradient-to-r from-gold-400 to-gold-500 text-white px-3 py-1.5 rounded-full text-xs font-semibold flex items-center shadow-lg">
                    <StarSolidIcon className="h-3.5 w-3.5 mr-1" />
                    Premium
                  </div>
                )}

                {/* Hover Actions */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/30 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex flex-col items-center justify-end pb-6">
                  <button
                    onClick={() => setPreviewTemplate(template)}
                    className="flex items-center gap-2 px-4 py-2 bg-white/90 backdrop-blur-sm text-gray-800 rounded-full text-sm font-medium hover:bg-white transition-colors mb-2"
                  >
                    <EyeIcon className="h-4 w-4" />
                    Aperçu
                  </button>
                  <button
                    onClick={() => handleSelectTemplate(template)}
                    className="flex items-center gap-2 px-6 py-2.5 bg-primary-600 text-white rounded-full text-sm font-semibold hover:bg-primary-700 transition-colors shadow-lg"
                  >
                    <CheckIcon className="h-4 w-4" />
                    Choisir ce template
                  </button>
                </div>
              </div>

              {/* Info */}
              <div className="p-4">
                <div className="flex items-start justify-between gap-2">
                  <h3 className="font-semibold text-gray-900">{template.name}</h3>
                  {template.config && (
                    <span className="px-2 py-0.5 bg-primary-100 text-primary-600 text-xs rounded">
                      Personnalisé
                    </span>
                  )}
                </div>
                <p className="text-sm text-gray-500 mt-1 line-clamp-2">
                  {template.description || 'Design élégant pour vos invitations'}
                </p>
                <div className="mt-3 flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs px-2 py-1 bg-gold-100 text-gold-700 rounded">
                      {EVENT_TYPE_LABELS[template.eventType] || 'Mariage'}
                    </span>
                    <span className="text-xs px-2 py-1 bg-gray-100 text-gray-600 rounded">
                      {categories.find(c => c.value === template.category)?.label || template.category}
                    </span>
                  </div>
                  {template.isPremium ? (
                    <span className="text-xs text-gold-600 flex items-center">
                      <StarSolidIcon className="h-3.5 w-3.5 mr-1" />
                      Premium
                    </span>
                  ) : (
                    <span className="text-xs text-green-600 font-medium">Gratuit</span>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Pagination — 10 per page */}
      {filteredTemplates.length > PER_PAGE && (
        <div className="flex items-center justify-center gap-1.5 pt-2">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={currentPage <= 1}
            className="px-3 py-1.5 rounded-lg border border-gray-200 text-sm text-gray-600 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            Précédent
          </button>
          {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
            <button
              key={p}
              onClick={() => setPage(p)}
              className={`w-9 h-9 rounded-lg text-sm font-medium ${p === currentPage ? 'bg-primary-600 text-white' : 'border border-gray-200 text-gray-600 hover:bg-gray-50'}`}
            >
              {p}
            </button>
          ))}
          <button
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={currentPage >= totalPages}
            className="px-3 py-1.5 rounded-lg border border-gray-200 text-sm text-gray-600 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            Suivant
          </button>
        </div>
      )}

      {/* Preview Modal */}
      {previewTemplate && (
        <div 
          className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4 backdrop-blur-sm"
          onClick={() => setPreviewTemplate(null)}
        >
          <div 
            className="bg-white rounded-2xl shadow-2xl max-w-5xl w-full max-h-[90vh] overflow-hidden animate-in fade-in zoom-in duration-300"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <div>
                <h3 className="text-xl font-serif font-bold text-gray-900 flex items-center gap-3">
                  {previewTemplate.name}
                  {previewTemplate.isPremium && (
                    <span className="bg-gradient-to-r from-gold-400 to-gold-500 text-white px-3 py-1 rounded-full text-xs font-semibold flex items-center">
                      <StarSolidIcon className="h-3 w-3 mr-1" />
                      Premium
                    </span>
                  )}
                </h3>
                <p className="text-sm text-gray-500 mt-1">
                  {previewTemplate.description || 'Aperçu du template'}
                </p>
              </div>
              <div className="flex items-center gap-3">
                {/* Device Toggle */}
                <div className="flex bg-gray-100 rounded-lg p-1">
                  <button
                    onClick={() => setPreviewDevice('desktop')}
                    className={`p-2 rounded-md transition-colors ${
                      previewDevice === 'desktop' 
                        ? 'bg-white text-primary-600 shadow-sm' 
                        : 'text-gray-500 hover:text-gray-700'
                    }`}
                  >
                    <ComputerDesktopIcon className="h-5 w-5" />
                  </button>
                  <button
                    onClick={() => setPreviewDevice('mobile')}
                    className={`p-2 rounded-md transition-colors ${
                      previewDevice === 'mobile' 
                        ? 'bg-white text-primary-600 shadow-sm' 
                        : 'text-gray-500 hover:text-gray-700'
                    }`}
                  >
                    <DevicePhoneMobileIcon className="h-5 w-5" />
                  </button>
                </div>
                <button 
                  onClick={() => setPreviewTemplate(null)}
                  className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-colors"
                >
                  <XMarkIcon className="h-6 w-6" />
                </button>
              </div>
            </div>

            {/* Preview Content */}
            <div className="flex flex-col lg:flex-row h-[70vh]">
              {/* Preview Frame */}
              <div className="flex-1 bg-gray-100 p-6 flex items-center justify-center overflow-auto">
                <div
                  className={`bg-white shadow-2xl transition-all duration-300 ${
                    previewDevice === 'mobile'
                      ? 'w-[375px] rounded-[2rem] border-[8px] border-gray-800'
                      : 'w-full max-w-xl rounded-xl'
                  }`}
                  style={{
                    aspectRatio: `${previewTemplate.config?.canvasWidth || previewTemplate.canvasWidth || 800} / ${previewTemplate.config?.canvasHeight || previewTemplate.canvasHeight || 1120}`
                  }}
                >
                  <div className={`w-full h-full ${previewDevice === 'mobile' ? 'rounded-[1.5rem]' : 'rounded-xl'} overflow-hidden`}>
                    <TemplatePreview template={previewTemplate} />
                  </div>
                </div>
              </div>

              {/* Details Sidebar */}
              <div className="lg:w-80 border-t lg:border-t-0 lg:border-l border-gray-100 p-6 flex flex-col">
                <h4 className="font-semibold text-gray-900 mb-4">Détails du template</h4>
                
                <div className="space-y-4 flex-1">
                  <div>
                    <span className="text-xs text-gray-500 uppercase tracking-wide">Catégorie</span>
                    <p className="text-gray-900 mt-1">
                      {categories.find(c => c.value === previewTemplate.category)?.label || previewTemplate.category}
                    </p>
                  </div>
                  
                  {previewTemplate.config?.colors && (
                    <div>
                      <span className="text-xs text-gray-500 uppercase tracking-wide">Palette de couleurs</span>
                      <div className="flex gap-2 mt-2">
                        {Object.entries(previewTemplate.config.colors).slice(0, 5).map(([key, color]) => (
                          <div 
                            key={key}
                            className="w-8 h-8 rounded-full border-2 border-white shadow-md"
                            style={{ background: color }}
                            title={key}
                          ></div>
                        ))}
                      </div>
                    </div>
                  )}
                  
                  {previewTemplate.config?.fonts && (
                    <div>
                      <span className="text-xs text-gray-500 uppercase tracking-wide">Typographies</span>
                      <div className="mt-2 space-y-1">
                        {previewTemplate.config.fonts.heading && (
                          <p className="text-sm" style={{ fontFamily: previewTemplate.config.fonts.heading }}>
                            Titre: {previewTemplate.config.fonts.heading.split(',')[0]}
                          </p>
                        )}
                        {previewTemplate.config.fonts.body && (
                          <p className="text-sm" style={{ fontFamily: previewTemplate.config.fonts.body }}>
                            Corps: {previewTemplate.config.fonts.body.split(',')[0]}
                          </p>
                        )}
                      </div>
                    </div>
                  )}

                  <div>
                    <span className="text-xs text-gray-500 uppercase tracking-wide">Type</span>
                    <p className="text-gray-900 mt-1">
                      {previewTemplate.isPremium ? (
                        <span className="text-gold-600 flex items-center">
                          <StarSolidIcon className="h-4 w-4 mr-1" />
                          Template Premium
                        </span>
                      ) : (
                        <span className="text-green-600">Template Gratuit</span>
                      )}
                    </p>
                  </div>
                </div>

                {/* Publish to Marketplace Button - Only for custom templates and creators */}
                {previewTemplate.isCustom && user?.isCreator && (
                  <button
                    onClick={() => {
                      setPreviewTemplate(null)
                      navigate(`/templates/${previewTemplate.id}/publish`)
                    }}
                    className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-green-500 to-emerald-500 text-white rounded-lg font-medium hover:from-green-600 hover:to-emerald-600 transition-all w-full mt-3"
                  >
                    <ArrowUpIcon className="h-5 w-5" />
                    Publier sur la Marketplace
                  </button>
                )}

                <button
                  onClick={() => {
                    setPreviewTemplate(null)
                    handleSelectTemplate(previewTemplate)
                  }}
                  className="btn-primary w-full mt-3"
                >
                  <CheckIcon className="h-5 w-5 mr-2" />
                  Utiliser ce template
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
