import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { useQuery, useMutation, useQueryClient } from 'react-query'
import { weddingAPI, templateAPI } from '../../services/api'
import { confirmDialog } from '../../components/common/confirm'
import toast from 'react-hot-toast'
import TemplatePreview from '../../components/templates/TemplatePreview'
import ImageUpload from '../../components/common/ImageUpload'
import TablesEditor from '../../components/TablesEditor'
import { eventUsesCouple, eventUsesHonoree, eventUsesFreeTitle, eventUsesTables, honoreeFieldLabel, getEventDisplayTitle } from '../../utils/eventTypes'
import {
  ArrowLeftIcon, TrashIcon, BuildingLibraryIcon, MusicalNoteIcon,
  CalendarDaysIcon, HeartIcon,
  SparklesIcon,
  SwatchIcon, ExclamationTriangleIcon,
  EyeIcon, UserIcon, PhotoIcon
} from '@heroicons/react/24/outline'

const ChurchIcon = ({ className }) => (
  <svg className={className} fill="currentColor" viewBox="0 0 24 24">
    <path d="M18 12.22V9l-5-2.5V5h1V3h-1V1h-2v2h-1v2h1v1.5L6 9v3.22l-2 1V22h8v-3c0-1.1.9-2 2-2s2 .9 2 2v3h8v-8.78l-2-1zM12 13.5c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2z" />
  </svg>
)

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
  const isCouple = eventUsesCouple(wedding?.eventType)       // WEDDING + DOT → bride/groom
  const isHonoree = eventUsesHonoree(wedding?.eventType)     // BIRTHDAY + CEREMONY → honoree name
  const isFreeTitle = eventUsesFreeTitle(wedding?.eventType) // CONFERENCE + OTHER → free title
  const EVENT_TYPE_LABELS = { WEDDING: 'Mariage', BIRTHDAY: 'Anniversaire', DOT: 'Mariage coutumier', CEREMONY: 'Cérémonie', CONFERENCE: 'Conférence', OTHER: 'Événement' }

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
      honoreeName: wedding.honoreeName || '',
      tables: Array.isArray(wedding.tables) ? wedding.tables : [],
      weddingDate: wedding.weddingDate?.split('T')[0],
      ceremonyTime: wedding.ceremonyTime || '',
      venueName: wedding.venueName || '',
      venueAddress: wedding.venueAddress || '',
      venueCity: wedding.venueCity || '',
      venueMapUrl: wedding.venueMapUrl || '',
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
      // Extra
      rsvpDeadline: wedding.rsvpDeadline?.split('T')[0] || '',
      additionalInfo: wedding.additionalInfo || ''
    } : undefined
  })

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
    honoreeName: watch('honoreeName'),
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

  const locked = (wedding?._count?.invitations || 0) > 0

  const onSubmit = (data) => {
    if (locked) {
      toast.error('Des invitations ont déjà été générées : les informations ne sont plus modifiables.')
      return
    }
    const submitData = {
      weddingDate: new Date(data.weddingDate).toISOString(),
      customMessage: cleanValue(data.customMessage),
      templateId: cleanValue(data.templateId),
      status: data.status,
      ceremonyTime: cleanValue(data.ceremonyTime),
      // Main address — every event type has one
      venueName: cleanValue(data.venueName),
      venueAddress: cleanValue(data.venueAddress),
      venueCity: cleanValue(data.venueCity),
      venueMapUrl: cleanValue(data.venueMapUrl),
      // Identity fields, per event type
      ...(isCouple ? { brideName: data.brideName, groomName: data.groomName } : {}),
      ...(isHonoree ? { honoreeName: data.honoreeName } : {}),
      ...(isFreeTitle ? { eventTitle: data.eventTitle } : {}),
      ...(eventUsesTables(wedding?.eventType) ? { tables: data.tables || [] } : {}),
      // Programme — weddings only
      ...(isWedding ? {
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
      } : {}),
      // Le style du QR code se règle désormais dans l'éditeur de template
      // (côté créateur/admin) — le client ne peut plus l'altérer ici.
      // Extra
      rsvpDeadline: data.rsvpDeadline ? new Date(data.rsvpDeadline).toISOString() : null,
      additionalInfo: cleanValue(data.additionalInfo)
    }
    updateMutation.mutate(submitData)
  }

  const handleDelete = async () => {
    const ok = await confirmDialog({
      title: 'Supprimer l’événement',
      message: 'Êtes-vous sûr de vouloir supprimer cet événement ? Cette action est irréversible.',
      confirmText: 'Supprimer'
    })
    if (ok) deleteMutation.mutate()
  }

  if (isLoading) {
    return (
      <div className="py-12 text-center">
        <div className="mx-auto h-12 w-12 animate-spin rounded-full border-2 border-primary-500 border-t-transparent"></div>
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-8">
        <button onClick={() => navigate(`/weddings/${id}`)} className="flex items-center text-muted hover:text-content mb-4">
          <ArrowLeftIcon className="h-5 w-5 mr-1" /> Retour
        </button>
        <h1 className="text-3xl font-serif font-bold text-content">Modifier l'événement</h1>
        <p className="text-muted mt-2 flex items-center gap-2">
          {getEventDisplayTitle(wedding)}
          <span className="inline-flex items-center rounded-full bg-primary-500/10 px-2.5 py-1 text-xs font-semibold text-primary-600 dark:text-primary-400">{EVENT_TYPE_LABELS[wedding?.eventType] || 'Mariage'}</span>
        </p>
      </div>

      {locked && (
        <div className="mb-6 flex items-start gap-3 rounded-xl border border-amber-500/30 bg-amber-500/5 p-4">
          <ExclamationTriangleIcon className="h-6 w-6 shrink-0 text-amber-500 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-amber-700 dark:text-amber-400">Informations verrouillées</p>
            <p className="text-sm text-amber-700/90 dark:text-amber-400/80">
              Des invitations ont déjà été générées pour cet événement. Pour éviter toute fraude,
              les informations ne sont plus modifiables.
            </p>
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        {/* ==================== Section 1: Couple (Mariage / Mariage coutumier) ==================== */}
        {isCouple && (
        <div className="rounded-2xl border border-border bg-surface p-8 space-y-6">
          <h2 className="text-xl font-serif font-bold text-content flex items-center gap-2">
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
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="label">Date principale de l'événement *</label>
              <input type="date" className={`input ${errors.weddingDate ? 'input-error' : ''}`} {...register('weddingDate', { required: 'Requis' })} />
            </div>
            <div>
              <label className="label">Heure{isWedding ? ' (les heures détaillées se règlent dans le programme)' : ''}</label>
              <input type="time" className="input" {...register('ceremonyTime')} />
            </div>
          </div>

          {/* Adresse principale — seul lieu pour le mariage coutumier ;
              pour le mariage, le programme détaillé est plus bas. */}
          <div className="border-t border-border pt-6 space-y-4">
            <h3 className="font-medium text-content">Lieu principal{isWedding ? ' (facultatif si le programme est détaillé)' : ''}</h3>
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
            <div>
              <label className="label text-sm">Lien Google Maps <span className="text-muted font-normal">— pour la carte cliquable de l'invitation</span></label>
              <input type="url" className="input" placeholder="https://maps.google.com/..." {...register('venueMapUrl')} />
              <p className="text-xs text-muted mt-1">Facultatif — sinon l'itinéraire est calculé depuis le nom + l'adresse.</p>
            </div>
          </div>

          <div className="border-t border-border pt-6">
            <label className="label">Message personnalisé</label>
            <textarea className="input" rows={3} placeholder="Un message spécial..." {...register('customMessage')} />
          </div>

          {/* Photo des mariés 
          <div className="border-t border-border pt-6">
            <h3 className="font-medium text-content flex items-center mb-1">
              <PhotoIcon className="h-5 w-5 mr-2 text-primary-500" />
              Photo des mariés
            </h3>
            <p className="text-sm text-muted mb-3">
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
*/}
          {/* Per-placeholder images for multi-photo templates */}
          {photoPlaceholders.length > 1 && (
            <div className="border-t border-border pt-6">
              <h3 className="font-medium text-content flex items-center mb-1">
                <PhotoIcon className="h-5 w-5 mr-2 text-primary-500" />
                Photos de l'invitation
                <span className="ml-2 text-xs font-normal text-muted">
                  ({photoPlaceholders.length} emplacements)
                </span>
              </h3>
              <p className="text-sm text-muted mb-4">
                Ce template a plusieurs emplacements photo — chacun reçoit sa propre image.
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {photoPlaceholders.map((ph, i) => (
                  <div key={ph.id}>
                    <p className="text-xs font-medium text-muted mb-1 truncate">{ph.label || `Photo ${i + 1}`}</p>
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
          <div className="border-t border-border pt-6 space-y-4">
            <h3 className="font-medium text-content flex items-center">
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

        {/* ==================== Section 1bis: Infos (honoree / titre libre) ==================== */}
        {!isCouple && (
        <div className="rounded-2xl border border-border bg-surface p-8 space-y-6">
          <h2 className="text-xl font-serif font-bold text-content flex items-center gap-2">
            <CalendarDaysIcon className="h-6 w-6 text-primary-500" />
            Informations de l'événement
          </h2>
          {isHonoree ? (
            <div>
              <label className="label">{honoreeFieldLabel(wedding?.eventType)} *</label>
              <input type="text" className={`input ${errors.honoreeName ? 'input-error' : ''}`} placeholder={wedding?.eventType === 'BIRTHDAY' ? 'Fatou' : 'Jean'} {...register('honoreeName', { required: 'Requis' })} />
              <p className="mt-1 text-xs text-muted">
                Le titre s'affiche automatiquement : « {EVENT_TYPE_LABELS[wedding?.eventType]} de {watch('honoreeName') || '…'} »
              </p>
              {errors.honoreeName && <p className="text-red-500 text-sm mt-1">{errors.honoreeName.message}</p>}
            </div>
          ) : (
            <div>
              <label className="label">Titre / Nom de l'événement *</label>
              <input type="text" className={`input ${errors.eventTitle ? 'input-error' : ''}`} {...register('eventTitle', { required: 'Requis' })} />
              {errors.eventTitle && <p className="text-red-500 text-sm mt-1">{errors.eventTitle.message}</p>}
            </div>
          )}
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
          <div className="border-t border-border pt-6 space-y-4">
            <h3 className="font-medium text-content">Lieu</h3>
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
          <div className="border-t border-border pt-6">
            <label className="label">Message personnalisé</label>
            <textarea className="input" rows={3} placeholder="Un message spécial..." {...register('customMessage')} />
          </div>
          <div className="border-t border-border pt-6 space-y-4">
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

        {/* ==================== Tables (événements à places assises) ==================== */}
        {eventUsesTables(wedding?.eventType) && (
        <div className="rounded-2xl border border-border bg-surface p-8">
          <TablesEditor value={watch('tables') || []} onChange={(v) => setValue('tables', v)} />
        </div>
        )}

        {/* ==================== Section 2: Programme (Mariage uniquement) ==================== */}
        {isWedding && (
        <div className="rounded-2xl border border-border bg-surface p-8 space-y-8">
          <h2 className="text-xl font-serif font-bold text-content flex items-center gap-2">
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
        <div className="rounded-2xl border border-border bg-surface p-8 space-y-6">
          <h2 className="text-xl font-serif font-bold text-content flex items-center gap-2">
            <SwatchIcon className="h-6 w-6 text-primary-500" />
            Choix du template
          </h2>

          {/* Template Selection + Live Preview */}
          <div>
            <h3 className="font-medium text-content mb-3">Choisir un template</h3>
            {templates.length === 0 && myTemplates.length === 0 ? (
              <div className="text-center py-6 bg-bg rounded-xl">
                <HeartIcon className="h-10 w-10 text-gray-300 mx-auto mb-2" />
                <p className="text-muted text-sm">
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
                              <p className="font-medium text-sm text-content truncate">{tmpl.name}</p>
                              <p className="text-xs text-primary-500">Personnalisé</p>
                            </div>
                          </label>
                        ))}
                      </div>
                      <p className="text-xs font-semibold text-muted uppercase tracking-wider mt-4 mb-2">Templates globaux</p>
                    </div>
                  )}
                  <div className="grid grid-cols-2 gap-3">
                    {templates.map((tmpl) => (
                      <label key={tmpl.id} className={`cursor-pointer rounded-xl border-2 overflow-hidden transition-all ${
                        selectedTemplateId === tmpl.id ? 'border-primary-600 ring-2 ring-primary-200 shadow-md' : 'border-border hover:border-border hover:shadow-sm'
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
                          <p className="font-medium text-sm text-content truncate">{tmpl.name}</p>
                          <p className="text-xs text-muted">{TEMPLATE_CATEGORIES[tmpl.category] || tmpl.category}</p>
                        </div>
                      </label>
                    ))}
                  </div>
                </div>

                {/* Right: live preview panel */}
                <div className="w-52 flex-shrink-0">
                  <div className="sticky top-4">
                    <p className="text-xs font-semibold text-muted uppercase tracking-wider mb-2 flex items-center gap-1">
                      <EyeIcon className="h-3.5 w-3.5" /> Aperçu en direct
                    </p>
                    {selectedTemplateId ? (
                      (() => {
                        const selectedTmpl = [...myTemplates, ...templates].find(t => t.id === selectedTemplateId)
                        return selectedTmpl ? (
                          <div className="rounded-xl border-2 border-primary-200 overflow-hidden shadow-lg">
                            <div className="aspect-[3/4] relative bg-bg">
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
                      <div className="aspect-[3/4] rounded-xl border-2 border-dashed border-border flex flex-col items-center justify-center bg-bg text-center p-4">
                        <SwatchIcon className="h-8 w-8 text-gray-300 mb-2" />
                        <p className="text-xs text-muted">Sélectionnez un template pour voir l'aperçu</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* ==================== Section 6: Statut ==================== */}
        <div className="rounded-2xl border border-border bg-surface p-8 space-y-6">
          <h2 className="text-xl font-serif font-bold text-content">Statut</h2>
          <select className="input" {...register('status')}>
            <option value="DRAFT">Brouillon</option>
            <option value="ACTIVE">Actif</option>
            <option value="COMPLETED">Terminé</option>
            <option value="CANCELLED">Annulé</option>
          </select>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-between rounded-2xl border border-border bg-surface p-6">
          <button type="button" onClick={handleDelete} className="btn-danger flex items-center" disabled={deleteMutation.isLoading}>
            <TrashIcon className="h-5 w-5 mr-2" />
            {deleteMutation.isLoading ? 'Suppression...' : 'Supprimer'}
          </button>
          <div className="flex items-center gap-4">
            <button type="button" onClick={() => navigate(`/weddings/${id}`)} className="btn-secondary">Annuler</button>
            <button type="submit" disabled={locked || !isDirty || updateMutation.isLoading} className="btn-primary">
              {locked ? 'Verrouillé' : updateMutation.isLoading ? 'Enregistrement...' : 'Enregistrer'}
            </button>
          </div>
        </div>
      </form>
    </div>
  )
}
