import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { useQuery, useMutation, useQueryClient } from 'react-query'
import { weddingAPI, templateAPI } from '../../services/api'
import toast from 'react-hot-toast'
import TemplatePreview from '../../components/templates/TemplatePreview'
import ImageUpload from '../../components/common/ImageUpload'
import {
  ArrowLeftIcon, TrashIcon, BuildingLibraryIcon, MusicalNoteIcon,
  CalendarDaysIcon, HeartIcon,
  QrCodeIcon, PrinterIcon, SparklesIcon,
  SwatchIcon, ExclamationTriangleIcon,
  EyeIcon, UserIcon, PhotoIcon
} from '@heroicons/react/24/outline'

const ChurchIcon = ({ className }) => (
  <svg className={className} fill="currentColor" viewBox="0 0 24 24">
    <path d="M18 12.22V9l-5-2.5V5h1V3h-1V1h-2v2h-1v2h1v1.5L6 9v3.22l-2 1V22h8v-3c0-1.1.9-2 2-2s2 .9 2 2v3h8v-8.78l-2-1zM12 13.5c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2z" />
  </svg>
)

const QR_STYLES = [
  { id: 'classic', name: 'Classique', desc: 'QR standard', pattern: 'square', color: '#000000' },
  { id: 'rounded', name: 'Arrondi', desc: 'Coins arrondis', pattern: 'rounded', color: '#1a1a1a' },
  { id: 'dots', name: 'Points', desc: 'Modules circulaires', pattern: 'dots', color: '#333333' },
  { id: 'elegant', name: 'Élégant', desc: 'Style premium', pattern: 'elegant', color: '#8B7355' }
]

const PAPER_TYPES = [
  { id: 'standard', name: 'Standard', desc: 'Papier couché 250g', extra: '0€' },
  { id: 'premium', name: 'Premium', desc: 'Papier texturé 300g', extra: '+0,50€/u' },
  { id: 'luxury', name: 'Luxe', desc: 'Papier coton 350g', extra: '+1,50€/u' }
]

const PRINT_FINISHES = [
  { id: 'mat', name: 'Mat', desc: 'Finition mate élégante' },
  { id: 'glossy', name: 'Brillant', desc: 'Finition brillante' },
  { id: 'satin', name: 'Satiné', desc: 'Finition satinée' }
]

const PRINT_SIZES = [
  { id: 'A6', name: 'A6 (10.5×14.8cm)', desc: 'Carte postale' },
  { id: 'A5', name: 'A5 (14.8×21cm)', desc: 'Format standard' },
  { id: 'custom', name: 'Personnalisé', desc: 'Sur mesure' }
]

const TEMPLATE_CATEGORIES = {
  ELEGANT: 'Élégant',
  MODERN: 'Moderne',
  ROMANTIC: 'Romantique',
  MINIMALIST: 'Minimaliste',
  TRADITIONAL: 'Traditionnel'
}

export default function WeddingEdit() {
  const { id } = useParams()
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  const { data: weddingData, isLoading } = useQuery(['wedding', id], () => weddingAPI.getOne(id))
  const wedding = weddingData?.data?.wedding
  // Event type is fixed at creation - this page only adapts which fields it shows.
  const isWedding = !wedding?.eventType || wedding.eventType === 'WEDDING'
  const EVENT_TYPE_LABELS = { WEDDING: 'Mariage', BIRTHDAY: 'Anniversaire', DOT: 'Dot', CEREMONY: 'Cérémonie', CONFERENCE: 'Conférence', OTHER: 'Événement' }

  // Only show templates designed for this event's type
  const { data: templatesData } = useQuery(
    ['templates', wedding?.eventType],
    () => templateAPI.getAll({ eventType: wedding?.eventType || 'WEDDING' }),
    { enabled: !!wedding }
  )
  const { data: myTemplatesData } = useQuery('my-templates', () => templateAPI.getMyTemplates())

  const templates = templatesData?.data?.templates || []
  const myTemplates = (myTemplatesData?.data?.templates || []).filter(t => (t.eventType || 'WEDDING') === (wedding?.eventType || 'WEDDING'))

  const {
    register, handleSubmit, watch, setValue,
    formState: { errors, isDirty }
  } = useForm({
    values: wedding ? {
      brideName: wedding.brideName || '',
      groomName: wedding.groomName || '',
      eventTitle: wedding.eventTitle || '',
      weddingDate: wedding.weddingDate?.split('T')[0],
      ceremonyTime: wedding.ceremonyTime || '',
      venueName: wedding.venueName || '',
      venueAddress: wedding.venueAddress || '',
      venueCity: wedding.venueCity || '',
      customMessage: wedding.customMessage || '',
      templateId: wedding.templateId || '',
      status: wedding.status,
      // Programme
      communeDate: wedding.communeDate?.split('T')[0] || '',
      communeTime: wedding.communeTime || '',
      communeVenue: wedding.communeVenue || '',
      communeAddress: wedding.communeAddress || '',
      egliseDate: wedding.egliseDate?.split('T')[0] || '',
      egliseTime: wedding.egliseTime || '',
      egliseVenue: wedding.egliseVenue || '',
      egliseAddress: wedding.egliseAddress || '',
      receptionDate: wedding.receptionDate?.split('T')[0] || '',
      receptionStartTime: wedding.receptionStartTime || '',
      receptionVenue: wedding.receptionVenue || '',
      receptionAddress: wedding.receptionAddress || '',
      // QR Code
      qrCodeStyle: wedding.qrCodeStyle || 'classic',
      qrCodeColor: wedding.qrCodeColor || '#000000',
      qrCodeBgColor: wedding.qrCodeBgColor === 'transparent' ? '#FFFFFF' : (wedding.qrCodeBgColor || '#FFFFFF'),
      qrCodeSize: wedding.qrCodeSize || 300,
      qrCodeTransparentBg: wedding.qrCodeBgColor === 'transparent',
      // Print
      wantsPrintService: wedding.wantsPrintService || false,
      printPaperType: wedding.printPaperType || 'premium',
      printFinish: wedding.printFinish || 'mat',
      printSize: wedding.printSize || 'A5',
      printQuantity: wedding.printQuantity || 50,
      printNotes: wedding.printNotes || '',
      // Extra
      rsvpDeadline: wedding.rsvpDeadline?.split('T')[0] || '',
      additionalInfo: wedding.additionalInfo || ''
    } : undefined
  })

  const wantsPrint = watch('wantsPrintService')
  const selectedTemplateId = watch('templateId')

  // Photo placeholders of the bound template - drives the per-placeholder uploads
  const selectedTemplateForImages = [...myTemplates, ...templates].find(t => t.id === selectedTemplateId)
  const photoPlaceholders = (selectedTemplateForImages?.config?.designElements || [])
    .filter(el => el.type === 'photo')
  const weddingTemplateImages = (wedding?.templateImages && typeof wedding.templateImages === 'object')
    ? wedding.templateImages : {}

  // Shared live-preview data so canvas tokens ({{event_title}}, {{venue_name}}...)
  // reflect what the user has typed so far, for wedding and non-wedding types alike.
  const previewWeddingData = {
    eventType: wedding?.eventType,
    eventTitle: watch('eventTitle'),
    brideName: watch('brideName'),
    groomName: watch('groomName'),
    weddingDate: watch('weddingDate'),
    ceremonyTime: watch('ceremonyTime'),
    venueName: watch('venueName'),
    venueAddress: watch('venueAddress'),
    customMessage: watch('customMessage'),
    communeTime: watch('communeTime'),
    communeVenue: watch('communeVenue'),
    egliseTime: watch('egliseTime'),
    egliseVenue: watch('egliseVenue'),
    receptionStartTime: watch('receptionStartTime'),
    receptionVenue: watch('receptionVenue'),
    receptionDate: watch('receptionDate')
  }

  const updateMutation = useMutation(
    (data) => weddingAPI.update(id, data),
    {
      onSuccess: () => {
        toast.success('Événement mis à jour avec succès')
        queryClient.invalidateQueries(['wedding', id])
      },
      onError: (error) => {
        toast.error(error.response?.data?.error || 'Erreur lors de la mise à jour')
      }
    }
  )

  const deleteMutation = useMutation(
    () => weddingAPI.delete(id),
    {
      onSuccess: () => { toast.success('Événement supprimé'); navigate('/weddings') },
      onError: (error) => { toast.error(error.response?.data?.error || 'Erreur') }
    }
  )

  const uploadPhotoMutation = useMutation(
    ({ file, onProgress }) => weddingAPI.uploadCouplePhoto(id, file, onProgress),
    {
      onSuccess: () => {
        toast.success('Photo des mariés mise à jour')
        queryClient.invalidateQueries(['wedding', id])
      },
      onError: (error) => toast.error(error.response?.data?.error || "Erreur lors de l'upload")
    }
  )
  const handlePhotoUpload = (file, filename, onProgress) =>
    uploadPhotoMutation.mutateAsync({ file, onProgress })

  // One upload handler per template photo placeholder (multi-image templates)
  const makeTemplateImageUpload = (placeholderId) => async (file, filename, onProgress) => {
    const res = await weddingAPI.uploadTemplateImage(id, placeholderId, file, onProgress)
    queryClient.invalidateQueries(['wedding', id])
    toast.success('Image mise à jour')
    return res
  }

  const cleanValue = (val) => (val === '' || val === undefined) ? null : val

  const onSubmit = (data) => {
    const submitData = {
      weddingDate: new Date(data.weddingDate).toISOString(),
      customMessage: cleanValue(data.customMessage),
      templateId: cleanValue(data.templateId),
      status: data.status,
      ...(isWedding ? {
        brideName: data.brideName,
        groomName: data.groomName,
        // Programme
        communeDate: data.communeDate ? new Date(data.communeDate).toISOString() : null,
        communeTime: cleanValue(data.communeTime),
        communeVenue: cleanValue(data.communeVenue),
        communeAddress: cleanValue(data.communeAddress),
        egliseDate: data.egliseDate ? new Date(data.egliseDate).toISOString() : null,
        egliseTime: cleanValue(data.egliseTime),
        egliseVenue: cleanValue(data.egliseVenue),
        egliseAddress: cleanValue(data.egliseAddress),
        receptionDate: data.receptionDate ? new Date(data.receptionDate).toISOString() : null,
        receptionStartTime: cleanValue(data.receptionStartTime),
        receptionVenue: cleanValue(data.receptionVenue),
        receptionAddress: cleanValue(data.receptionAddress)
      } : {
        eventTitle: data.eventTitle,
        ceremonyTime: cleanValue(data.ceremonyTime),
        venueName: cleanValue(data.venueName),
        venueAddress: cleanValue(data.venueAddress),
        venueCity: cleanValue(data.venueCity)
      }),
      // QR Code
      qrCodeStyle: data.qrCodeStyle || 'classic',
      qrCodeColor: data.qrCodeColor || '#000000',
      qrCodeBgColor: data.qrCodeTransparentBg ? 'transparent' : (data.qrCodeBgColor || '#FFFFFF'),
      qrCodeSize: parseInt(data.qrCodeSize) || 300,
      // Print
      wantsPrintService: data.wantsPrintService === true || data.wantsPrintService === 'true',
      printQuantity: data.wantsPrintService ? parseInt(data.printQuantity) || null : null,
      printPaperType: data.wantsPrintService ? data.printPaperType : null,
      printFinish: data.wantsPrintService ? data.printFinish : null,
      printSize: data.wantsPrintService ? data.printSize : null,
      printNotes: data.wantsPrintService ? cleanValue(data.printNotes) : null,
      // Extra
      rsvpDeadline: data.rsvpDeadline ? new Date(data.rsvpDeadline).toISOString() : null,
      additionalInfo: cleanValue(data.additionalInfo)
    }
    updateMutation.mutate(submitData)
  }

  const handleDelete = () => {
    if (window.confirm('Êtes-vous sûr de vouloir supprimer cet événement ? Cette action est irréversible.')) {
      deleteMutation.mutate()
    }
  }

  if (isLoading) {
    return (
      <div className="text-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto"></div>
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-8">
        <button onClick={() => navigate(`/weddings/${id}`)} className="flex items-center text-gray-600 hover:text-gray-900 mb-4">
          <ArrowLeftIcon className="h-5 w-5 mr-1" /> Retour
        </button>
        <h1 className="text-3xl font-serif font-bold text-gray-900">Modifier l'événement</h1>
        <p className="text-gray-600 mt-2 flex items-center gap-2">
          {isWedding ? `${wedding?.brideName} & ${wedding?.groomName}` : wedding?.eventTitle}
          <span className="badge-gold">{EVENT_TYPE_LABELS[wedding?.eventType] || 'Mariage'}</span>
        </p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        {/* ==================== Section 1: Mariés (Mariage uniquement) ==================== */}
        {isWedding && (
        <div className="bg-white rounded-xl shadow-lg p-8 space-y-6">
          <h2 className="text-xl font-serif font-bold text-gray-900 flex items-center gap-2">
            <HeartIcon className="h-6 w-6 text-primary-500" />
            Informations des mariés
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="label">Prénom de la mariée *</label>
              <input type="text" className={`input ${errors.brideName ? 'input-error' : ''}`} {...register('brideName', { required: 'Requis' })} />
              {errors.brideName && <p className="text-red-500 text-sm mt-1">{errors.brideName.message}</p>}
            </div>
            <div>
              <label className="label">Prénom du marié *</label>
              <input type="text" className={`input ${errors.groomName ? 'input-error' : ''}`} {...register('groomName', { required: 'Requis' })} />
              {errors.groomName && <p className="text-red-500 text-sm mt-1">{errors.groomName.message}</p>}
            </div>
          </div>
          <div>
            <label className="label">Date principale du mariage *</label>
            <input type="date" className={`input ${errors.weddingDate ? 'input-error' : ''}`} {...register('weddingDate', { required: 'Requis' })} />
          </div>
          <div>
            <label className="label">Message personnalisé</label>
            <textarea className="input" rows={3} placeholder="Un message spécial..." {...register('customMessage')} />
          </div>

          {/* Photo des mariés */}
          <div className="border-t pt-6">
            <h3 className="font-medium text-gray-900 flex items-center mb-1">
              <PhotoIcon className="h-5 w-5 mr-2 text-primary-500" />
              Photo des mariés
            </h3>
            <p className="text-sm text-gray-500 mb-3">
              Si votre template prévoit un emplacement photo, cette image y sera intégrée automatiquement.
            </p>
            <ImageUpload
              value={wedding?.couplePhoto}
              onUpload={handlePhotoUpload}
              preset="couplePhoto"
              size="lg"
              helpText="JPG, PNG ou WebP — compressée automatiquement (max 5 Mo)"
              validation={{ maxSizeMB: 5 }}
            />
          </div>

          {/* Per-placeholder images for multi-photo templates */}
          {photoPlaceholders.length > 1 && (
            <div className="border-t pt-6">
              <h3 className="font-medium text-gray-900 flex items-center mb-1">
                <PhotoIcon className="h-5 w-5 mr-2 text-primary-500" />
                Photos de l'invitation
                <span className="ml-2 text-xs font-normal text-gray-400">
                  ({photoPlaceholders.length} emplacements)
                </span>
              </h3>
              <p className="text-sm text-gray-500 mb-4">
                Ce template a plusieurs emplacements photo — chacun reçoit sa propre image.
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {photoPlaceholders.map((ph, i) => (
                  <div key={ph.id}>
                    <p className="text-xs font-medium text-gray-600 mb-1 truncate">{ph.label || `Photo ${i + 1}`}</p>
                    <ImageUpload
                      value={weddingTemplateImages[ph.id]}
                      onUpload={makeTemplateImageUpload(ph.id)}
                      preset="couplePhoto"
                      size="md"
                      helpText="Max 5 Mo"
                      validation={{ maxSizeMB: 5 }}
                    />
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Extra personalization */}
          <div className="border-t pt-6 space-y-4">
            <h3 className="font-medium text-gray-900 flex items-center">
              <SparklesIcon className="h-5 w-5 mr-2 text-amber-500" />
              Personnalisation avancée
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="label">Date limite RSVP</label>
                <input type="date" className="input" {...register('rsvpDeadline')} />
              </div>
            </div>
            <div>
              <label className="label">Informations supplémentaires</label>
              <textarea className="input" rows={2} placeholder="Parking, allergies..." {...register('additionalInfo')} />
            </div>
          </div>
        </div>
        )}

        {/* ==================== Section 1bis: Infos simples (hors Mariage) ==================== */}
        {!isWedding && (
        <div className="bg-white rounded-xl shadow-lg p-8 space-y-6">
          <h2 className="text-xl font-serif font-bold text-gray-900 flex items-center gap-2">
            <CalendarDaysIcon className="h-6 w-6 text-primary-500" />
            Informations de l'événement
          </h2>
          <div>
            <label className="label">Titre / Nom de l'événement *</label>
            <input type="text" className={`input ${errors.eventTitle ? 'input-error' : ''}`} {...register('eventTitle', { required: 'Requis' })} />
            {errors.eventTitle && <p className="text-red-500 text-sm mt-1">{errors.eventTitle.message}</p>}
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="label">Date *</label>
              <input type="date" className={`input ${errors.weddingDate ? 'input-error' : ''}`} {...register('weddingDate', { required: 'Requis' })} />
            </div>
            <div>
              <label className="label">Heure</label>
              <input type="time" className="input" {...register('ceremonyTime')} />
            </div>
          </div>
          <div className="border-t pt-6 space-y-4">
            <h3 className="font-medium text-gray-900">Lieu</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="label text-sm">Nom du lieu</label>
                <input type="text" className="input" {...register('venueName')} />
              </div>
              <div>
                <label className="label text-sm">Ville</label>
                <input type="text" className="input" {...register('venueCity')} />
              </div>
            </div>
            <div>
              <label className="label text-sm">Adresse</label>
              <input type="text" className="input" {...register('venueAddress')} />
            </div>
          </div>
          <div className="border-t pt-6">
            <label className="label">Message personnalisé</label>
            <textarea className="input" rows={3} placeholder="Un message spécial..." {...register('customMessage')} />
          </div>
          <div className="border-t pt-6 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="label">Date limite RSVP</label>
                <input type="date" className="input" {...register('rsvpDeadline')} />
              </div>
            </div>
            <div>
              <label className="label">Informations supplémentaires</label>
              <textarea className="input" rows={2} placeholder="Parking, dress code..." {...register('additionalInfo')} />
            </div>
          </div>
        </div>
        )}

        {/* ==================== Section 2: Programme (Mariage uniquement) ==================== */}
        {isWedding && (
        <div className="bg-white rounded-xl shadow-lg p-8 space-y-8">
          <h2 className="text-xl font-serif font-bold text-gray-900 flex items-center gap-2">
            <CalendarDaysIcon className="h-6 w-6 text-primary-500" />
            Programme du mariage
          </h2>

          {/* Mairie */}
          <div className="bg-blue-50 rounded-xl p-6 border border-blue-200">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-blue-500 rounded-full flex items-center justify-center">
                <BuildingLibraryIcon className="h-5 w-5 text-white" />
              </div>
              <div><h3 className="font-bold text-blue-900">Mariage Civil</h3><p className="text-sm text-blue-600">Mairie / Commune</p></div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div><label className="label text-sm">Date</label><input type="date" className="input bg-white" {...register('communeDate')} /></div>
              <div><label className="label text-sm">Heure</label><input type="time" className="input bg-white" {...register('communeTime')} /></div>
              <div><label className="label text-sm">Nom</label><input type="text" className="input bg-white" placeholder="Mairie de..." {...register('communeVenue')} /></div>
              <div><label className="label text-sm">Adresse</label><input type="text" className="input bg-white" {...register('communeAddress')} /></div>
            </div>
          </div>

          {/* Église */}
          <div className="bg-purple-50 rounded-xl p-6 border border-purple-200">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-purple-500 rounded-full flex items-center justify-center">
                <ChurchIcon className="h-5 w-5 text-white" />
              </div>
              <div><h3 className="font-bold text-purple-900">Mariage Religieux</h3><p className="text-sm text-purple-600">Église</p></div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div><label className="label text-sm">Date</label><input type="date" className="input bg-white" {...register('egliseDate')} /></div>
              <div><label className="label text-sm">Heure</label><input type="time" className="input bg-white" {...register('egliseTime')} /></div>
              <div><label className="label text-sm">Nom</label><input type="text" className="input bg-white" placeholder="Église..." {...register('egliseVenue')} /></div>
              <div><label className="label text-sm">Adresse</label><input type="text" className="input bg-white" {...register('egliseAddress')} /></div>
            </div>
          </div>

          {/* Réception */}
          <div className="bg-pink-50 rounded-xl p-6 border border-pink-200">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-pink-500 rounded-full flex items-center justify-center">
                <MusicalNoteIcon className="h-5 w-5 text-white" />
              </div>
              <div><h3 className="font-bold text-pink-900">Réception & Soirée</h3><p className="text-sm text-pink-600">Fête et célébration</p></div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div><label className="label text-sm">Date</label><input type="date" className="input bg-white" {...register('receptionDate')} /></div>
              <div><label className="label text-sm">Heure début</label><input type="time" className="input bg-white" {...register('receptionStartTime')} /></div>
              <div><label className="label text-sm">Nom du lieu</label><input type="text" className="input bg-white" {...register('receptionVenue')} /></div>
              <div><label className="label text-sm">Adresse</label><input type="text" className="input bg-white" {...register('receptionAddress')} /></div>
            </div>
          </div>
        </div>
        )}

        {/* ==================== Section 3: Design ==================== */}
        <div className="bg-white rounded-xl shadow-lg p-8 space-y-6">
          <h2 className="text-xl font-serif font-bold text-gray-900 flex items-center gap-2">
            <SwatchIcon className="h-6 w-6 text-primary-500" />
            Choix du template
          </h2>

          {/* Template Selection + Live Preview */}
          <div>
            <h3 className="font-medium text-gray-900 mb-3">Choisir un template</h3>
            {templates.length === 0 && myTemplates.length === 0 ? (
              <div className="text-center py-6 bg-gray-50 rounded-xl">
                <HeartIcon className="h-10 w-10 text-gray-300 mx-auto mb-2" />
                <p className="text-gray-500 text-sm">
                  Aucun template disponible pour le type « {EVENT_TYPE_LABELS[wedding?.eventType] || 'Mariage'} » pour le moment
                </p>
              </div>
            ) : (
              <div className="flex gap-6">
                {/* Left: template grid */}
                <div className="flex-1 space-y-4">
                  {myTemplates.length > 0 && (
                    <div>
                      <p className="text-xs font-semibold text-primary-600 uppercase tracking-wider mb-2 flex items-center gap-1">
                        <UserIcon className="h-3.5 w-3.5" /> Mes templates personnalisés
                      </p>
                      <div className="grid grid-cols-2 gap-3">
                        {myTemplates.map((tmpl) => (
                          <label key={tmpl.id} className={`cursor-pointer rounded-xl border-2 overflow-hidden transition-all ${
                            selectedTemplateId === tmpl.id ? 'border-primary-600 ring-2 ring-primary-200 shadow-md' : 'border-primary-100 hover:border-primary-300 hover:shadow-sm'
                          }`}>
                            <input type="radio" value={tmpl.id} className="hidden" {...register('templateId')} />
                            <div className="aspect-[3/4] bg-gradient-wedding flex items-center justify-center relative">
                              <TemplatePreview template={tmpl} weddingData={previewWeddingData} />
                              {selectedTemplateId === tmpl.id && (
                                <div className="absolute inset-0 bg-primary-600/10 flex items-center justify-center">
                                  <div className="bg-primary-600 text-white rounded-full p-1.5">
                                    <EyeIcon className="h-4 w-4" />
                                  </div>
                                </div>
                              )}
                              <span className="absolute top-2 left-2 bg-primary-600 text-white text-[10px] px-1.5 py-0.5 rounded-full font-medium flex items-center gap-0.5">
                                <UserIcon className="h-2.5 w-2.5" /> Mon template
                              </span>
                            </div>
                            <div className="p-2">
                              <p className="font-medium text-sm text-gray-900 truncate">{tmpl.name}</p>
                              <p className="text-xs text-primary-500">Personnalisé</p>
                            </div>
                          </label>
                        ))}
                      </div>
                      <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mt-4 mb-2">Templates globaux</p>
                    </div>
                  )}
                  <div className="grid grid-cols-2 gap-3">
                    {templates.map((tmpl) => (
                      <label key={tmpl.id} className={`cursor-pointer rounded-xl border-2 overflow-hidden transition-all ${
                        selectedTemplateId === tmpl.id ? 'border-primary-600 ring-2 ring-primary-200 shadow-md' : 'border-gray-200 hover:border-gray-300 hover:shadow-sm'
                      }`}>
                        <input type="radio" value={tmpl.id} className="hidden" {...register('templateId')} />
                        <div className="aspect-[3/4] bg-gradient-wedding flex items-center justify-center relative">
                          <TemplatePreview template={tmpl} weddingData={previewWeddingData} />
                          {selectedTemplateId === tmpl.id && (
                            <div className="absolute inset-0 bg-primary-600/10 flex items-center justify-center">
                              <div className="bg-primary-600 text-white rounded-full p-1.5">
                                <EyeIcon className="h-4 w-4" />
                              </div>
                            </div>
                          )}
                          {tmpl.isPremium && (
                            <span className="absolute top-2 right-2 bg-amber-500 text-white text-xs px-2 py-0.5 rounded-full font-medium">Premium</span>
                          )}
                        </div>
                        <div className="p-2">
                          <p className="font-medium text-sm text-gray-900 truncate">{tmpl.name}</p>
                          <p className="text-xs text-gray-500">{TEMPLATE_CATEGORIES[tmpl.category] || tmpl.category}</p>
                        </div>
                      </label>
                    ))}
                  </div>
                </div>

                {/* Right: live preview panel */}
                <div className="w-52 flex-shrink-0">
                  <div className="sticky top-4">
                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2 flex items-center gap-1">
                      <EyeIcon className="h-3.5 w-3.5" /> Aperçu en direct
                    </p>
                    {selectedTemplateId ? (
                      (() => {
                        const selectedTmpl = [...myTemplates, ...templates].find(t => t.id === selectedTemplateId)
                        return selectedTmpl ? (
                          <div className="rounded-xl border-2 border-primary-200 overflow-hidden shadow-lg">
                            <div className="aspect-[3/4] relative bg-gray-50">
                              <TemplatePreview
                                template={selectedTmpl}
                                weddingData={previewWeddingData}
                              />
                            </div>
                            <div className="p-2 bg-primary-50 border-t border-primary-200">
                              <p className="text-xs font-semibold text-primary-700 truncate">{selectedTmpl.name}</p>
                              <p className="text-[10px] text-primary-500 mt-0.5">
                                {(watch('brideName') || wedding?.brideName || 'Mariée')} & {(watch('groomName') || wedding?.groomName || 'Marié')}
                              </p>
                            </div>
                          </div>
                        ) : null
                      })()
                    ) : (
                      <div className="aspect-[3/4] rounded-xl border-2 border-dashed border-gray-200 flex flex-col items-center justify-center bg-gray-50 text-center p-4">
                        <SwatchIcon className="h-8 w-8 text-gray-300 mb-2" />
                        <p className="text-xs text-gray-400">Sélectionnez un template pour voir l'aperçu</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* ==================== Section 4: QR Code ==================== */}
        <div className="bg-white rounded-xl shadow-lg p-8 space-y-6">
          <h2 className="text-xl font-serif font-bold text-gray-900 flex items-center gap-2">
            <QrCodeIcon className="h-6 w-6 text-primary-500" />
            QR Code
          </h2>

          {/* QR Style Selection */}
          <div>
            <h3 className="font-medium text-gray-900 mb-3">Style du QR Code</h3>
            <p className="text-sm text-gray-500 mb-4">Le QR code permet à vos invités d'accéder à l'invitation et de confirmer leur présence</p>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {QR_STYLES.map(style => {
                const isSelected = watch('qrCodeStyle') === style.id
                return (
                  <label
                    key={style.id}
                    className={`cursor-pointer p-4 rounded-xl border-2 text-center transition-all hover:shadow-md ${
                      isSelected ? 'border-primary-500 bg-primary-50 shadow-md ring-1 ring-primary-200' : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <input type="radio" value={style.id} className="hidden" {...register('qrCodeStyle')} />
                    <div className="w-20 h-20 mx-auto mb-3 rounded-xl flex items-center justify-center relative overflow-hidden"
                      style={{ backgroundColor: watch('qrCodeTransparentBg') ? 'transparent' : watch('qrCodeBgColor'), border: watch('qrCodeTransparentBg') ? '2px dashed #d1d5db' : 'none' }}>
                      {/* Visual QR pattern based on style */}
                      {style.pattern === 'square' && (
                        <div className="grid grid-cols-5 gap-[2px] p-1">
                          {[1,1,1,0,1, 1,0,1,1,0, 1,1,1,0,1, 0,1,0,1,0, 1,0,1,1,1].map((v, i) => (
                            <div key={i} className={`w-2.5 h-2.5 ${v ? '' : 'opacity-0'}`} style={{ backgroundColor: v ? (watch('qrCodeColor') || style.color) : 'transparent' }} />
                          ))}
                        </div>
                      )}
                      {style.pattern === 'rounded' && (
                        <div className="grid grid-cols-5 gap-[2px] p-1">
                          {[1,1,1,0,1, 1,0,1,1,0, 1,1,1,0,1, 0,1,0,1,0, 1,0,1,1,1].map((v, i) => (
                            <div key={i} className={`w-2.5 h-2.5 rounded-sm ${v ? '' : 'opacity-0'}`} style={{ backgroundColor: v ? (watch('qrCodeColor') || style.color) : 'transparent' }} />
                          ))}
                        </div>
                      )}
                      {style.pattern === 'dots' && (
                        <div className="grid grid-cols-5 gap-[2px] p-1">
                          {[1,1,1,0,1, 1,0,1,1,0, 1,1,1,0,1, 0,1,0,1,0, 1,0,1,1,1].map((v, i) => (
                            <div key={i} className={`w-2.5 h-2.5 rounded-full ${v ? '' : 'opacity-0'}`} style={{ backgroundColor: v ? (watch('qrCodeColor') || style.color) : 'transparent' }} />
                          ))}
                        </div>
                      )}
                      {style.pattern === 'elegant' && (
                        <div className="grid grid-cols-5 gap-[3px] p-1.5">
                          {[1,1,1,0,1, 1,0,1,1,0, 1,1,1,0,1, 0,1,0,1,0, 1,0,1,1,1].map((v, i) => (
                            <div key={i} className={`w-2 h-2 rounded-[1px] ${v ? 'shadow-sm' : 'opacity-0'}`} style={{ backgroundColor: v ? (watch('qrCodeColor') || style.color) : 'transparent' }} />
                          ))}
                        </div>
                      )}
                    </div>
                    <p className="text-sm font-semibold text-gray-900">{style.name}</p>
                    <p className="text-xs text-gray-500 mt-0.5">{style.desc}</p>
                    {isSelected && (
                      <div className="mt-2 inline-flex items-center gap-1 text-xs text-primary-600 font-medium">
                        <EyeIcon className="h-3.5 w-3.5" /> Sélectionné
                      </div>
                    )}
                  </label>
                )
              })}
            </div>
          </div>

          {/* QR Colors & Options */}
          <div className="border-t pt-6">
            <h3 className="font-medium text-gray-900 mb-4">Personnalisation</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="label text-sm">Couleur des modules</label>
                <div className="flex items-center gap-2">
                  <input type="color" className="w-10 h-10 rounded-lg cursor-pointer border-0" {...register('qrCodeColor')} />
                  <input type="text" className="input flex-1 text-sm font-mono" {...register('qrCodeColor')} />
                </div>
                {/* Quick color presets */}
                <div className="flex gap-1.5 mt-2">
                  {['#000000', '#1a1a1a', '#333333', '#8B7355', '#D4AF37', '#B76E79', '#2D5F3A', '#1E3A5F'].map(c => (
                    <button key={c} type="button" onClick={() => setValue('qrCodeColor', c)}
                      className={`w-6 h-6 rounded-full border-2 transition-transform hover:scale-110 ${watch('qrCodeColor') === c ? 'border-primary-500 scale-110' : 'border-gray-200'}`}
                      style={{ backgroundColor: c }} />
                  ))}
                </div>
              </div>
              <div>
                <label className="label text-sm">Taille</label>
                <select className="input" {...register('qrCodeSize')}>
                  <option value="200">200px — Compact</option>
                  <option value="300">300px — Standard</option>
                  <option value="400">400px — Grand</option>
                  <option value="500">500px — Très grand</option>
                </select>
              </div>
            </div>
          </div>

          {/* Background Option */}
          <div className="border-t pt-6">
            <h3 className="font-medium text-gray-900 mb-4">Arrière-plan du QR Code</h3>
            <div className="grid grid-cols-2 gap-3 mb-4">
              <label className={`cursor-pointer p-4 rounded-xl border-2 text-center transition-all ${
                !watch('qrCodeTransparentBg') ? 'border-primary-500 bg-primary-50' : 'border-gray-200 hover:border-gray-300'
              }`}>
                <input type="radio" className="hidden" checked={!watch('qrCodeTransparentBg')} onChange={() => setValue('qrCodeTransparentBg', false)} />
                <div className="w-14 h-14 mx-auto mb-2 rounded-lg flex items-center justify-center" style={{ backgroundColor: watch('qrCodeBgColor') }}>
                  <QrCodeIcon className="h-8 w-8" style={{ color: watch('qrCodeColor') }} />
                </div>
                <p className="text-sm font-medium">Avec fond</p>
                <p className="text-xs text-gray-500">Couleur personnalisable</p>
              </label>
              <label className={`cursor-pointer p-4 rounded-xl border-2 text-center transition-all ${
                watch('qrCodeTransparentBg') ? 'border-primary-500 bg-primary-50' : 'border-gray-200 hover:border-gray-300'
              }`}>
                <input type="radio" className="hidden" checked={watch('qrCodeTransparentBg')} onChange={() => setValue('qrCodeTransparentBg', true)} />
                <div className="w-14 h-14 mx-auto mb-2 rounded-lg flex items-center justify-center border-2 border-dashed border-gray-300"
                  style={{ backgroundImage: 'linear-gradient(45deg, #e5e7eb 25%, transparent 25%), linear-gradient(-45deg, #e5e7eb 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #e5e7eb 75%), linear-gradient(-45deg, transparent 75%, #e5e7eb 75%)', backgroundSize: '8px 8px', backgroundPosition: '0 0, 0 4px, 4px -4px, -4px 0px' }}>
                  <QrCodeIcon className="h-8 w-8" style={{ color: watch('qrCodeColor') }} />
                </div>
                <p className="text-sm font-medium">Sans fond</p>
                <p className="text-xs text-gray-500">Arrière-plan transparent</p>
              </label>
            </div>

            {!watch('qrCodeTransparentBg') && (
              <div>
                <label className="label text-sm">Couleur de fond</label>
                <div className="flex items-center gap-2">
                  <input type="color" className="w-10 h-10 rounded-lg cursor-pointer border-0" {...register('qrCodeBgColor')} />
                  <input type="text" className="input flex-1 text-sm font-mono" {...register('qrCodeBgColor')} />
                </div>
              </div>
            )}
          </div>

          {/* QR Preview */}
          <div className="border-t pt-6">
            <h3 className="font-medium text-gray-900 mb-3">Aperçu</h3>
            <div className="flex justify-center">
              <div className={`p-8 rounded-2xl border-2 border-gray-200 inline-block`}
                style={{
                  backgroundColor: watch('qrCodeTransparentBg') ? 'transparent' : watch('qrCodeBgColor'),
                  backgroundImage: watch('qrCodeTransparentBg') ? 'linear-gradient(45deg, #f3f4f6 25%, transparent 25%), linear-gradient(-45deg, #f3f4f6 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #f3f4f6 75%), linear-gradient(-45deg, transparent 75%, #f3f4f6 75%)' : 'none',
                  backgroundSize: '12px 12px',
                  backgroundPosition: '0 0, 0 6px, 6px -6px, -6px 0px'
                }}>
                <div className="flex flex-col items-center">
                  {/* Mini QR pattern preview */}
                  <div className="mb-3">
                    {(() => {
                      const style = QR_STYLES.find(s => s.id === watch('qrCodeStyle'))
                      const radius = style?.pattern === 'dots' ? 'rounded-full' : style?.pattern === 'rounded' ? 'rounded-sm' : style?.pattern === 'elegant' ? 'rounded-[1px]' : ''
                      const color = watch('qrCodeColor') || '#000000'
                      const pattern = [1,1,1,1,1,0,0,1, 1,0,0,0,1,0,1,0, 1,0,1,0,1,0,0,1, 1,0,0,0,1,0,1,1, 1,1,1,1,1,0,1,0, 0,0,0,0,0,0,0,1, 1,0,1,1,0,1,1,0, 0,1,0,1,1,0,1,1]
                      return (
                        <div className="grid grid-cols-8 gap-[2px]">
                          {pattern.map((v, i) => (
                            <div key={i} className={`w-3 h-3 ${radius} ${v ? '' : 'opacity-0'}`} style={{ backgroundColor: v ? color : 'transparent' }} />
                          ))}
                        </div>
                      )
                    })()}
                  </div>
                  <p className="text-xs text-gray-500">Style: {QR_STYLES.find(s => s.id === watch('qrCodeStyle'))?.name}</p>
                  <p className="text-xs text-gray-400 mt-0.5">{watch('qrCodeTransparentBg') ? 'Fond transparent' : `Fond: ${watch('qrCodeBgColor')}`}</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ==================== Section 5: Print Service ==================== */}
        <div className="bg-white rounded-xl shadow-lg p-8 space-y-6">
          <h2 className="text-xl font-serif font-bold text-gray-900 flex items-center gap-2">
            <PrinterIcon className="h-6 w-6 text-primary-500" />
            Service d'impression
          </h2>
          <p className="text-gray-600">Nous pouvons imprimer et livrer vos invitations sur papier de qualité professionnelle</p>

          <div className="bg-gradient-to-r from-primary-50 to-amber-50 rounded-xl p-6 border border-primary-200">
            <label className="flex items-center cursor-pointer">
              <input type="checkbox" className="w-5 h-5 rounded border-gray-300 text-primary-600 mr-4" {...register('wantsPrintService')} />
              <div>
                <p className="font-semibold text-gray-900">Oui, je souhaite faire imprimer mes invitations</p>
                <p className="text-sm text-gray-600">Notre équipe imprimera et livrera vos invitations chez vous</p>
              </div>
            </label>
          </div>

          {wantsPrint && (
            <div className="space-y-6 animate-fadeIn">
              <div>
                <label className="label">Nombre d'exemplaires (min. 10)</label>
                <input type="number" min="10" max="1000" className="input w-40" {...register('printQuantity', { min: 10 })} />
              </div>

              <div>
                <label className="label">Type de papier</label>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  {PAPER_TYPES.map(paper => (
                    <label key={paper.id} className={`cursor-pointer p-4 rounded-xl border-2 transition-all ${
                      watch('printPaperType') === paper.id ? 'border-primary-500 bg-primary-50' : 'border-gray-200 hover:border-gray-300'
                    }`}>
                      <input type="radio" value={paper.id} className="hidden" {...register('printPaperType')} />
                      <div className="flex justify-between items-start">
                        <div>
                          <p className="font-medium text-gray-900">{paper.name}</p>
                          <p className="text-xs text-gray-500 mt-1">{paper.desc}</p>
                        </div>
                        <span className="text-xs font-semibold text-primary-600">{paper.extra}</span>
                      </div>
                    </label>
                  ))}
                </div>
              </div>

              <div>
                <label className="label">Finition</label>
                <div className="grid grid-cols-3 gap-3">
                  {PRINT_FINISHES.map(finish => (
                    <label key={finish.id} className={`cursor-pointer p-3 rounded-lg border-2 text-center transition-all ${
                      watch('printFinish') === finish.id ? 'border-primary-500 bg-primary-50' : 'border-gray-200 hover:border-gray-300'
                    }`}>
                      <input type="radio" value={finish.id} className="hidden" {...register('printFinish')} />
                      <p className="font-medium text-sm">{finish.name}</p>
                      <p className="text-xs text-gray-500">{finish.desc}</p>
                    </label>
                  ))}
                </div>
              </div>

              <div>
                <label className="label">Format</label>
                <div className="grid grid-cols-3 gap-3">
                  {PRINT_SIZES.map(size => (
                    <label key={size.id} className={`cursor-pointer p-3 rounded-lg border-2 text-center transition-all ${
                      watch('printSize') === size.id ? 'border-primary-500 bg-primary-50' : 'border-gray-200 hover:border-gray-300'
                    }`}>
                      <input type="radio" value={size.id} className="hidden" {...register('printSize')} />
                      <p className="font-medium text-sm">{size.name}</p>
                      <p className="text-xs text-gray-500">{size.desc}</p>
                    </label>
                  ))}
                </div>
              </div>

              <div>
                <label className="label">Instructions spéciales</label>
                <textarea className="input" rows={3} placeholder="Ex: Inclure des enveloppes, finition dorée sur le texte..." {...register('printNotes')} />
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <p className="text-sm text-blue-800">
                  <strong>📋 Info :</strong> Un devis sera calculé après la création. Réductions : -10% dès 50 ex., -15% dès 100 ex., -20% dès 200 ex.
                </p>
              </div>
            </div>
          )}
        </div>

        {/* ==================== Section 6: Statut ==================== */}
        <div className="bg-white rounded-xl shadow-lg p-8 space-y-6">
          <h2 className="text-xl font-serif font-bold text-gray-900">Statut</h2>
          <select className="input" {...register('status')}>
            <option value="DRAFT">Brouillon</option>
            <option value="ACTIVE">Actif</option>
            <option value="COMPLETED">Terminé</option>
            <option value="CANCELLED">Annulé</option>
          </select>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-between bg-white rounded-xl shadow-lg p-6">
          <button type="button" onClick={handleDelete} className="btn-danger flex items-center" disabled={deleteMutation.isLoading}>
            <TrashIcon className="h-5 w-5 mr-2" />
            {deleteMutation.isLoading ? 'Suppression...' : 'Supprimer'}
          </button>
          <div className="flex items-center gap-4">
            <button type="button" onClick={() => navigate(`/weddings/${id}`)} className="btn-secondary">Annuler</button>
            <button type="submit" disabled={!isDirty || updateMutation.isLoading} className="btn-primary">
              {updateMutation.isLoading ? 'Enregistrement...' : 'Enregistrer'}
            </button>
          </div>
        </div>
      </form>
    </div>
  )
}
