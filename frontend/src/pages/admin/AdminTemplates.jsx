import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from 'react-query'
import { useNavigate } from 'react-router-dom'
import { adminAPI } from '../../services/api'
import toast from 'react-hot-toast'
import TemplatePreview from '../../components/templates/TemplatePreview'
import { EVENT_TYPES, EVENT_TYPE_LABELS } from '../../utils/eventTypes'
import {
  PencilIcon,
  TrashIcon,
  XMarkIcon,
  PhotoIcon,
  StarIcon,
  ExclamationTriangleIcon,
  DocumentDuplicateIcon,
  PaintBrushIcon,
  PlusIcon
} from '@heroicons/react/24/outline'

export default function AdminTemplates() {
  const queryClient = useQueryClient()
  const navigate = useNavigate()
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [selectedTemplate, setSelectedTemplate] = useState(null)
  const [formData, setFormData] = useState({
    name: '',
    category: 'MODERN',
    eventType: 'WEDDING',
    description: '',
    isPremium: false,
    isActive: true
  })

  const { data: templatesData, isLoading } = useQuery('admin-templates', () =>
    adminAPI.getTemplates()
  )
  const templates = templatesData?.data?.templates || []

  const updateMutation = useMutation(
    ({ id, data }) => adminAPI.updateTemplate(id, data),
    {
      onSuccess: () => {
        queryClient.invalidateQueries('admin-templates')
        toast.success('Template mis à jour')
        setShowEditModal(false)
        setSelectedTemplate(null)
      },
      onError: (err) => toast.error(err.response?.data?.message || 'Erreur lors de la mise à jour')
    }
  )

  const deleteMutation = useMutation((id) => adminAPI.deleteTemplate(id), {
    onSuccess: () => {
      queryClient.invalidateQueries('admin-templates')
      toast.success('Template supprimé')
      setShowDeleteModal(false)
      setSelectedTemplate(null)
    },
    onError: (err) => toast.error(err.response?.data?.message || 'Erreur lors de la suppression')
  })

  const duplicateMutation = useMutation(
    (template) => adminAPI.createTemplate({
      name: `${template.name} (copie)`,
      category: template.category,
      eventType: template.eventType,
      description: template.description,
      isPremium: template.isPremium,
      backgroundUrl: template.backgroundUrl,
      backgroundOpacity: template.backgroundOpacity,
      designElements: template.config?.designElements || [],
      canvasWidth: template.canvasWidth || 800,
      canvasHeight: template.canvasHeight || 1120
    }),
    {
      onSuccess: () => {
        queryClient.invalidateQueries('admin-templates')
        toast.success('Template dupliqué')
      },
      onError: (err) => toast.error(err.response?.data?.message || 'Erreur lors de la duplication')
    }
  )

  const handleEditInfo = (template) => {
    setSelectedTemplate(template)
    setFormData({
      name: template.name,
      category: template.category,
      eventType: template.eventType || 'WEDDING',
      description: template.description || '',
      isPremium: template.isPremium,
      isActive: template.isActive !== false
    })
    setShowEditModal(true)
  }

  const handleSubmitEdit = (e) => {
    e.preventDefault()
    updateMutation.mutate({ id: selectedTemplate.id, data: formData })
  }

  const categories = [
    { value: 'ELEGANT', label: 'Élégant', color: 'bg-purple-100 text-purple-700' },
    { value: 'MODERN', label: 'Moderne', color: 'bg-blue-100 text-blue-700' },
    { value: 'TRADITIONAL', label: 'Traditionnel', color: 'bg-amber-100 text-amber-700' },
    { value: 'ROMANTIC', label: 'Romantique', color: 'bg-pink-100 text-pink-700' },
    { value: 'MINIMALIST', label: 'Minimaliste', color: 'bg-gray-100 text-gray-700' }
  ]

  const eventTypeColors = {
    WEDDING: 'bg-rose-100 text-rose-700',
    BIRTHDAY: 'bg-orange-100 text-orange-700',
    DOT: 'bg-emerald-100 text-emerald-700',
    CEREMONY: 'bg-indigo-100 text-indigo-700',
    CONFERENCE: 'bg-sky-100 text-sky-700',
    OTHER: 'bg-gray-100 text-gray-700'
  }

  // Group by event type so it's clear which templates are offered for which
  // kind of invitation (mariage / anniversaire / dot / cérémonie / conférence / autre)
  const eventTypeSections = EVENT_TYPES.map(type => ({
    value: type,
    label: EVENT_TYPE_LABELS[type],
    color: eventTypeColors[type],
    templates: templates.filter(t => (t.eventType || 'WEDDING') === type)
  }))

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-serif font-bold text-gray-900">Templates</h1>
          <p className="text-gray-600 mt-1">Créez et gérez les modèles d'invitations</p>
        </div>
        <button
          onClick={() => navigate('/admin/templates/new/design')}
          className="btn-primary flex items-center"
        >
          <PaintBrushIcon className="h-5 w-5 mr-2" />
          Créer un template
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
          <p className="text-3xl font-bold text-gray-900">{templates.length}</p>
          <p className="text-sm text-gray-500 mt-1">Total templates</p>
        </div>
        <div className="bg-gradient-to-r from-gold-50 to-gold-100 rounded-xl shadow-sm border border-gold-200 p-5">
          <p className="text-3xl font-bold text-gold-700">{templates.filter(t => t.isPremium).length}</p>
          <p className="text-sm text-gold-600 mt-1">Premium</p>
        </div>
        <div className="bg-gradient-to-r from-green-50 to-emerald-100 rounded-xl shadow-sm border border-green-200 p-5">
          <p className="text-3xl font-bold text-green-700">{templates.filter(t => !t.isPremium).length}</p>
          <p className="text-sm text-green-600 mt-1">Gratuits</p>
        </div>
        <div className="bg-gradient-to-r from-primary-50 to-primary-100 rounded-xl shadow-sm border border-primary-200 p-5">
          <p className="text-3xl font-bold text-primary-700">{templates.filter(t => t.backgroundUrl).length}</p>
          <p className="text-sm text-primary-600 mt-1">Avec fond</p>
        </div>
      </div>

      {/* Per-event-type breakdown - jump straight to a type, and spot at a
          glance which ones still have zero templates available to clients */}
      {templates.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 flex flex-wrap gap-2">
          {eventTypeSections.map(section => (
            <a
              key={section.value}
              href={`#section-${section.value}`}
              className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                section.templates.length > 0
                  ? `${section.color} hover:opacity-80`
                  : 'bg-red-50 text-red-600 hover:bg-red-100'
              }`}
            >
              {section.label} · {section.templates.length}
            </a>
          ))}
        </div>
      )}

      {/* Templates Grid */}
      {isLoading ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
        </div>
      ) : templates.length === 0 ? (
        <div className="bg-white rounded-xl shadow-lg p-12 text-center">
          <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <PhotoIcon className="h-10 w-10 text-gray-400" />
          </div>
          <h3 className="text-xl font-semibold text-gray-900 mb-2">Aucun template</h3>
          <p className="text-gray-500 mb-6">Commencez par créer votre premier modèle d'invitation</p>
          <button onClick={() => navigate('/admin/templates/new/design')} className="btn-primary inline-flex items-center">
            <PaintBrushIcon className="h-5 w-5 mr-2" />
            Créer un template
          </button>
        </div>
      ) : (
        <div className="space-y-10">
          {eventTypeSections.map(section => {
            return (
              <div key={section.value} id={`section-${section.value}`}>
                <div className="flex items-center gap-3 mb-5">
                  <h2 className="text-xl font-serif font-bold text-gray-900">{section.label}</h2>
                  <span className={`px-3 py-1 rounded-full text-sm font-medium ${section.color}`}>
                    {section.templates.length}
                  </span>
                </div>
                {section.templates.length === 0 ? (
                  <button
                    onClick={() => navigate(`/admin/templates/new/design?eventType=${section.value}`)}
                    className="w-full border-2 border-dashed border-gray-200 rounded-xl p-8 text-center hover:border-primary-300 hover:bg-primary-50/30 transition-colors group"
                  >
                    <div className="w-12 h-12 bg-gray-100 group-hover:bg-primary-100 rounded-full flex items-center justify-center mx-auto mb-3 transition-colors">
                      <PlusIcon className="h-6 w-6 text-gray-400 group-hover:text-primary-600" />
                    </div>
                    <p className="text-gray-500 group-hover:text-primary-700 font-medium">
                      Aucun template "{section.label}" - les clients ne pourront pas en choisir un pour ce type
                    </p>
                    <p className="text-sm text-gray-400 mt-1">Cliquez pour en créer un</p>
                  </button>
                ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                  {section.templates.map((template) => (
                    <div
                      key={template.id}
                      className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden group hover:shadow-lg hover:border-primary-200 transition-all duration-300"
                    >
                      {/* Preview - same live-rendered canvas as the client-facing template gallery,
                          instead of a flat snapshot image that can drift out of sync with the design */}
                      <div className="relative aspect-[3/4] bg-gradient-to-br from-gray-50 to-gray-100 overflow-hidden">
                        <TemplatePreview
                          template={template}
                          className="group-hover:scale-105 transition-transform duration-500"
                        />

                        {/* Badges */}
                        {template.isPremium && (
                          <div className="absolute top-3 right-3 bg-gradient-to-r from-gold-400 to-gold-500 text-white px-3 py-1.5 rounded-full text-xs font-semibold flex items-center shadow-lg">
                            <StarIcon className="h-3.5 w-3.5 mr-1" />
                            Premium
                          </div>
                        )}
                        {!template.isActive && (
                          <div className="absolute top-3 left-3 bg-red-500 text-white px-2 py-1 rounded-full text-xs font-medium">
                            Inactif
                          </div>
                        )}

                        {/* Hover Overlay */}
                        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-end justify-center pb-6">
                          <div className="flex gap-2">
                            <button
                              onClick={() => navigate(`/admin/templates/${template.id}/design`)}
                              className="p-2.5 bg-white rounded-full text-primary-600 hover:bg-primary-50 transition-colors shadow-lg"
                              title="Modifier le design"
                            >
                              <PaintBrushIcon className="h-5 w-5" />
                            </button>
                            <button
                              onClick={() => handleEditInfo(template)}
                              className="p-2.5 bg-white rounded-full text-gray-600 hover:bg-gray-50 transition-colors shadow-lg"
                              title="Modifier les infos"
                            >
                              <PencilIcon className="h-5 w-5" />
                            </button>
                            <button
                              onClick={() => duplicateMutation.mutate(template)}
                              className="p-2.5 bg-white rounded-full text-blue-600 hover:bg-blue-50 transition-colors shadow-lg"
                              title="Dupliquer"
                            >
                              <DocumentDuplicateIcon className="h-5 w-5" />
                            </button>
                            <button
                              onClick={() => { setSelectedTemplate(template); setShowDeleteModal(true) }}
                              className="p-2.5 bg-white rounded-full text-red-600 hover:bg-red-50 transition-colors shadow-lg"
                              title="Supprimer"
                            >
                              <TrashIcon className="h-5 w-5" />
                            </button>
                          </div>
                        </div>
                      </div>

                      {/* Info */}
                      <div className="p-4">
                        <div className="flex items-center justify-between gap-2">
                          <h3 className="font-semibold text-gray-900 truncate">{template.name}</h3>
                          <span className={`shrink-0 px-2 py-0.5 rounded text-xs font-medium ${categories.find(c => c.value === template.category)?.color || 'bg-gray-100 text-gray-700'}`}>
                            {categories.find(c => c.value === template.category)?.label || template.category}
                          </span>
                        </div>
                        {template.description && (
                          <p className="text-sm text-gray-500 mt-1 line-clamp-2">{template.description}</p>
                        )}
                        <div className="mt-3 flex items-center justify-between text-xs">
                          <span className="text-gray-400">
                            {template._count?.weddings || 0} utilisation{(template._count?.weddings || 0) > 1 ? 's' : ''}
                          </span>
                          <span className="text-gray-400">
                            {new Date(template.createdAt).toLocaleDateString('fr-FR')}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* Edit Info Modal */}
      {showEditModal && selectedTemplate && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full animate-in fade-in zoom-in duration-200">
            <div className="flex items-center justify-between p-6 border-b border-gray-100">
              <h3 className="text-xl font-serif font-bold text-gray-900">Modifier les infos</h3>
              <button onClick={() => { setShowEditModal(false); setSelectedTemplate(null) }} className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full">
                <XMarkIcon className="h-5 w-5" />
              </button>
            </div>
            <form onSubmit={handleSubmitEdit} className="p-6 space-y-5">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Nom *</label>
                <input type="text" className="input" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} required />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Type d'événement</label>
                <select className="input" value={formData.eventType} onChange={(e) => setFormData({ ...formData, eventType: e.target.value })}>
                  {EVENT_TYPES.map(type => <option key={type} value={type}>{EVENT_TYPE_LABELS[type]}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Catégorie (style)</label>
                <select className="input" value={formData.category} onChange={(e) => setFormData({ ...formData, category: e.target.value })}>
                  {categories.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Description</label>
                <textarea className="input resize-none" rows="3" value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} />
              </div>
              <div className="flex items-center gap-4">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={formData.isPremium} onChange={(e) => setFormData({ ...formData, isPremium: e.target.checked })} className="h-4 w-4 text-gold-600 rounded" />
                  <span className="text-sm">Premium</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={formData.isActive} onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })} className="h-4 w-4 text-green-600 rounded" />
                  <span className="text-sm">Actif</span>
                </label>
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => { setShowEditModal(false); setSelectedTemplate(null) }} className="flex-1 btn-secondary">Annuler</button>
                <button type="submit" disabled={updateMutation.isLoading} className="flex-1 btn-primary">
                  {updateMutation.isLoading ? 'Enregistrement...' : 'Enregistrer'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteModal && selectedTemplate && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 animate-in fade-in zoom-in duration-200">
            <div className="text-center">
              <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <ExclamationTriangleIcon className="h-8 w-8 text-red-600" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">Supprimer ce template ?</h3>
              <p className="text-gray-600 mb-6">
                Le template <strong>"{selectedTemplate.name}"</strong> sera définitivement supprimé.
              </p>
              {selectedTemplate._count?.weddings > 0 && (
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 mb-6 text-left">
                  <p className="text-sm text-amber-800">
                    <strong>Attention :</strong> Ce template est utilisé par {selectedTemplate._count.weddings} mariage{selectedTemplate._count.weddings > 1 ? 's' : ''}.
                  </p>
                </div>
              )}
              <div className="flex gap-3">
                <button onClick={() => { setShowDeleteModal(false); setSelectedTemplate(null) }} className="flex-1 btn-secondary">Annuler</button>
                <button
                  onClick={() => deleteMutation.mutate(selectedTemplate.id)}
                  disabled={deleteMutation.isLoading}
                  className="flex-1 bg-red-600 text-white px-4 py-2.5 rounded-lg hover:bg-red-700 font-medium disabled:opacity-50"
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
