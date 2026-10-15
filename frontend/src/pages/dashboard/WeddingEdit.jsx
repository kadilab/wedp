import { useState, useRef, useEffect } from 'react'
import { useParams, useNavigate, useLocation } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { useQuery, useMutation, useQueryClient } from 'react-query'
import { weddingAPI, templateAPI } from '../../services/api'
import { confirmDialog } from '../../components/common/confirm'
import toast from 'react-hot-toast'
import TemplatePreview from '../../components/templates/TemplatePreview'
import ImageUpload from '../../components/common/ImageUpload'
import TablesEditor from '../../components/TablesEditor'
import DrinkOptionsEditor from '../../components/DrinkOptionsEditor'
import {
  Section, IdentityFields, VenueFields, ProgrammeFields, MessageFields, identityStepLabel
} from '../../components/events/EventFields'
import {
  EVENT_TYPE_LABELS, eventUsesCouple, eventUsesHonoree, eventUsesFreeTitle, eventUsesTables, getEventDisplayTitle
} from '../../utils/eventTypes'
import { getVisibleFields, templateUsesProgramme } from '../../utils/templateVariables'
import {
  ArrowLeftIcon, TrashIcon, MusicalNoteIcon, CalendarDaysIcon, HeartIcon,
  SwatchIcon, ExclamationTriangleIcon, EyeIcon, UserIcon, PhotoIcon, PaintBrushIcon,
  LockClosedIcon, GiftIcon, PrinterIcon, UserGroupIcon, AdjustmentsHorizontalIcon,
  CheckCircleIcon, MagnifyingGlassIcon, CheckIcon
} from '@heroicons/react/24/outline'

const TEMPLATE_CATEGORIES = {
  ELEGANT: 'Élégant',
  MODERN: 'Moderne',
  ROMANTIC: 'Romantique',
  MINIMALIST: 'Minimaliste',
  TRADITIONAL: 'Traditionnel'
}

const STATUS_OPTIONS = [
  { value: 'DRAFT', label: 'Brouillon', hint: 'En préparation' },
  { value: 'ACTIVE', label: 'Actif', hint: 'Invitations en cours' },
  { value: 'COMPLETED', label: 'Terminé', hint: 'L\'événement a eu lieu' },
  { value: 'CANCELLED', label: 'Annulé', hint: 'Événement annulé' }
]

const TEMPLATES_PER_PAGE = 9

const toDateInput = (v) => (v ? String(v).split('T')[0] : '')

export default function WeddingEdit() {
  const { id } = useParams()
  const navigate = useNavigate()
  const location = useLocation()
  const queryClient = useQueryClient()
  const [previewOpen, setPreviewOpen] = useState(false)
  const [templateSearch, setTemplateSearch] = useState('')
  const [templatePage, setTemplatePage] = useState(1)

  const { data: weddingData, isLoading } = useQuery(['wedding', id], () => weddingAPI.getOne(id))
  const wedding = weddingData?.data?.wedding
  // The event type is fixed at creation — the page adapts its fields to it.
  const eventType = wedding?.eventType || 'WEDDING'
  const isWedding = eventType === 'WEDDING'
  const isCouple = eventUsesCouple(eventType)
  const isHonoree = eventUsesHonoree(eventType)
  const isFreeTitle = eventUsesFreeTitle(eventType)

  const { data: templatesData } = useQuery(
    ['templates', eventType],
    () => templateAPI.getAll({ eventType }),
    { enabled: !!wedding }
  )
  const { data: myTemplatesData } = useQuery('my-templates', () => templateAPI.getMyTemplates())
  const templates = templatesData?.data?.templates || []
  const myTemplates = (myTemplatesData?.data?.templates || []).filter(t => (t.eventType || 'WEDDING') === eventType)

  const {
    register, handleSubmit, watch, setValue, reset,
    formState: { errors, isDirty }
  } = useForm({
    values: wedding ? {
      brideName: wedding.brideName || '',
      groomName: wedding.groomName || '',
      eventTitle: wedding.eventTitle || '',
      honoreeName: wedding.honoreeName || '',
      tables: Array.isArray(wedding.tables) ? wedding.tables : [],
      drinkOptions: Array.isArray(wedding.drinkOptions) ? wedding.drinkOptions : [],
      giftRegistryEnabled: wedding.giftRegistryEnabled || false,
      giftRegistryGoal: wedding.giftRegistryGoal || '',
      giftRegistryMessage: wedding.giftRegistryMessage || '',
      printBackEnabled: wedding.printBackEnabled || false,
      printBackText: wedding.printBackText || '',
      weddingDate: toDateInput(wedding.weddingDate),
      ceremonyTime: wedding.ceremonyTime || '',
      venueName: wedding.venueName || '',
      venueAddress: wedding.venueAddress || '',
      venueCity: wedding.venueCity || '',
      venueMapUrl: wedding.venueMapUrl || '',
      customMessage: wedding.customMessage || '',
      templateId: wedding.templateId || '',
      status: wedding.status,
      communeDate: toDateInput(wedding.communeDate),
      communeTime: wedding.communeTime || '',
      communeVenue: wedding.communeVenue || '',
      communeAddress: wedding.communeAddress || '',
      egliseDate: toDateInput(wedding.egliseDate),
      egliseTime: wedding.egliseTime || '',
      egliseVenue: wedding.egliseVenue || '',
      egliseAddress: wedding.egliseAddress || '',
      receptionDate: toDateInput(wedding.receptionDate),
      receptionStartTime: wedding.receptionStartTime || '',
      receptionVenue: wedding.receptionVenue || '',
      receptionAddress: wedding.receptionAddress || '',
      rsvpDeadline: toDateInput(wedding.rsvpDeadline),
      additionalInfo: wedding.additionalInfo || ''
    } : undefined
  })

  const values = watch()
  const selectedTemplateId = values.templateId
  const selectedTemplate = [...myTemplates, ...templates].find(t => t.id === selectedTemplateId)
  const isOwnTemplate = myTemplates.some(t => t.id === selectedTemplateId)

  // Same rule as the creation wizard: only the fields the template uses.
  const visibleFields = selectedTemplate ? getVisibleFields(selectedTemplate) : null
  const showField = (name) => !visibleFields || visibleFields.has(name)
  const hasProgramme = isWedding && (!selectedTemplate || templateUsesProgramme(selectedTemplate))

  const photoPlaceholders = (selectedTemplate?.config?.designElements || []).filter(el => el.type === 'photo')
  const weddingTemplateImages = (wedding?.templateImages && typeof wedding.templateImages === 'object')
    ? wedding.templateImages : {}

  const previewWeddingData = {
    eventType,
    templateImages: weddingTemplateImages,
    eventTitle: values.eventTitle,
    honoreeName: values.honoreeName,
    brideName: values.brideName,
    groomName: values.groomName,
    weddingDate: values.weddingDate,
    ceremonyTime: values.ceremonyTime,
    venueName: values.venueName,
    venueAddress: values.venueAddress,
    customMessage: values.customMessage,
    additionalInfo: values.additionalInfo,
    communeTime: values.communeTime,
    communeVenue: values.communeVenue,
    egliseTime: values.egliseTime,
    egliseVenue: values.egliseVenue,
    receptionStartTime: values.receptionStartTime,
    receptionVenue: values.receptionVenue,
    receptionDate: values.receptionDate
  }

  // Deep link (e.g. /edit#photos from the "photo manquante" warning): scroll
  // once the section exists (it depends on the template being loaded).
  const scrolledToHash = useRef(false)
  useEffect(() => {
    const target = location.hash?.slice(1)
    if (!target || scrolledToHash.current || !wedding || !templatesData) return
    const el = document.getElementById(target)
    if (el) {
      scrolledToHash.current = true
      setTimeout(() => el.scrollIntoView({ behavior: 'smooth', block: 'start' }), 100)
    }
  })

  // Warn before leaving with unsaved changes.
  useEffect(() => {
    if (!isDirty) return
    const onBeforeUnload = (e) => { e.preventDefault(); e.returnValue = '' }
    window.addEventListener('beforeunload', onBeforeUnload)
    return () => window.removeEventListener('beforeunload', onBeforeUnload)
  }, [isDirty])

  const updateMutation = useMutation(
    (data) => weddingAPI.update(id, data),
    {
      onSuccess: () => {
        toast.success('Modifications enregistrées')
        queryClient.invalidateQueries(['wedding', id])
      },
      onError: (error) => {
        toast.error(error.response?.data?.details?.[0]?.message || error.response?.data?.error || 'Erreur lors de la mise à jour')
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

  // Clone a shared/marketplace template into the client's own copy and open
  // it in the visual editor (the original creator keeps their commission).
  const forkTemplateMutation = useMutation(
    (templateId) => templateAPI.fork(templateId, id),
    {
      onSuccess: (res) => {
        const forkedId = res.data?.template?.id
        queryClient.invalidateQueries('my-templates')
        queryClient.invalidateQueries(['wedding', id])
        toast.success('Modèle dupliqué — personnalisez-le à votre goût')
        if (forkedId) navigate(`/templates/${forkedId}/design?wedding=${id}`)
      },
      onError: (error) => toast.error(error.response?.data?.error || 'Erreur lors de la duplication du modèle')
    }
  )

  const confirmLeaveIfDirty = async () => {
    if (!isDirty) return true
    return confirmDialog({
      title: 'Modifications non enregistrées',
      message: 'Vos modifications seront perdues si vous quittez cette page.',
      confirmText: 'Quitter sans enregistrer'
    })
  }

  const handlePersonalize = async (e, templateId) => {
    e.preventDefault()
    e.stopPropagation()
    if (await confirmLeaveIfDirty()) forkTemplateMutation.mutate(templateId)
  }

  const musicInputRef = useRef(null)
  const [musicUploadProgress, setMusicUploadProgress] = useState(null)
  const uploadMusicMutation = useMutation(
    ({ file, onProgress }) => weddingAPI.uploadMusic(id, file, onProgress),
    {
      onSuccess: () => {
        toast.success('Musique mise à jour')
        queryClient.invalidateQueries(['wedding', id])
      },
      onError: (error) => toast.error(error.response?.data?.error || "Erreur lors de l'upload"),
      onSettled: () => setMusicUploadProgress(null)
    }
  )
  const removeMusicMutation = useMutation(() => weddingAPI.removeMusic(id), {
    onSuccess: () => {
      toast.success('Musique supprimée')
      queryClient.invalidateQueries(['wedding', id])
    },
    onError: () => toast.error('Erreur lors de la suppression')
  })
  const handleMusicFileChange = (e) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    uploadMusicMutation.mutate({ file, onProgress: setMusicUploadProgress })
  }

  // One upload handler per template photo placeholder
  const makeTemplateImageUpload = (placeholderId) => async (file, filename, onProgress) => {
    const res = await weddingAPI.uploadTemplateImage(id, placeholderId, file, onProgress)
    queryClient.invalidateQueries(['wedding', id])
    if ((wedding?._count?.invitations || 0) > 0) {
      // Files already generated don't contain the new photo yet.
      toast.success('Photo enregistrée. Régénérez vos invitations (page Invitations › Générer) pour l’y inclure.', { duration: 7000 })
    } else {
      toast.success('Photo enregistrée')
    }
    return res
  }

  const cleanValue = (val) => (val === '' || val === undefined) ? null : val

  // Once invitations exist, only the template is frozen (its layout/QR are
  // baked into invitations already issued) — everything else stays editable.
  const templateLocked = (wedding?._count?.invitations || 0) > 0

  const onSubmit = (data) => {
    const submitData = {
      weddingDate: new Date(data.weddingDate).toISOString(),
      customMessage: cleanValue(data.customMessage),
      templateId: cleanValue(data.templateId),
      status: data.status,
      ceremonyTime: cleanValue(data.ceremonyTime),
      venueName: cleanValue(data.venueName),
      venueAddress: cleanValue(data.venueAddress),
      venueCity: cleanValue(data.venueCity),
      venueMapUrl: cleanValue(data.venueMapUrl),
      ...(isCouple ? { brideName: data.brideName, groomName: data.groomName } : {}),
      ...(isHonoree ? { honoreeName: data.honoreeName } : {}),
      ...(isFreeTitle ? { eventTitle: data.eventTitle } : {}),
      ...(eventUsesTables(eventType) ? { tables: data.tables || [] } : {}),
      drinkOptions: data.drinkOptions || [],
      giftRegistryEnabled: !!data.giftRegistryEnabled,
      giftRegistryGoal: data.giftRegistryGoal === '' ? null : parseFloat(data.giftRegistryGoal),
      giftRegistryMessage: cleanValue(data.giftRegistryMessage),
      printBackEnabled: !!data.printBackEnabled,
      printBackText: cleanValue(data.printBackText),
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
      rsvpDeadline: data.rsvpDeadline ? new Date(data.rsvpDeadline).toISOString() : null,
      additionalInfo: cleanValue(data.additionalInfo)
    }
    updateMutation.mutate(submitData)
  }

  const onInvalid = (errs) => {
    const first = Object.keys(errs)[0]
    document.getElementById(first)?.scrollIntoView({ behavior: 'smooth', block: 'center' })
    toast.error('Certains champs obligatoires sont vides')
  }

  const handleDelete = async () => {
    const ok = await confirmDialog({
      title: 'Supprimer l’événement',
      message: 'Les invités, invitations et réponses de cet événement seront supprimés. Cette action est irréversible.',
      confirmText: 'Supprimer définitivement'
    })
    if (ok) deleteMutation.mutate()
  }

  const goBack = async () => {
    if (await confirmLeaveIfDirty()) navigate(`/weddings/${id}`)
  }

  // Template list: search + pagination (the whole catalogue is loaded).
  const q = templateSearch.trim().toLowerCase()
  const matches = (t) => !q || (t.name || '').toLowerCase().includes(q) ||
    (TEMPLATE_CATEGORIES[t.category] || '').toLowerCase().includes(q)
  const filteredTemplates = templates.filter(matches)
  const totalTemplatePages = Math.max(1, Math.ceil(filteredTemplates.length / TEMPLATES_PER_PAGE))
  const safeTemplatePage = Math.min(templatePage, totalTemplatePages)
  const pagedTemplates = filteredTemplates.slice((safeTemplatePage - 1) * TEMPLATES_PER_PAGE, safeTemplatePage * TEMPLATES_PER_PAGE)

  if (isLoading || !wedding) {
    return (
      <div className="py-12 text-center">
        <div className="mx-auto h-12 w-12 animate-spin rounded-full border-2 border-primary-500 border-t-transparent"></div>
      </div>
    )
  }

  const NAV = [
    { id: 'info', label: identityStepLabel(eventType) === 'Événement' ? 'Informations' : identityStepLabel(eventType) },
    ...(hasProgramme ? [{ id: 'programme', label: 'Programme' }] : []),
    ...(photoPlaceholders.length > 0 ? [{ id: 'photos', label: 'Photos' }] : []),
    { id: 'guests', label: 'Invités' },
    { id: 'options', label: 'Options' },
    { id: 'design', label: 'Modèle' },
    { id: 'status', label: 'Statut' }
  ]
  const scrollTo = (sectionId) => document.getElementById(sectionId)?.scrollIntoView({ behavior: 'smooth', block: 'start' })

  const templateCard = (tmpl, mine = false) => {
    const selected = selectedTemplateId === tmpl.id
    return (
      <label key={tmpl.id} className={`group relative rounded-xl border-2 overflow-hidden transition-all ${templateLocked ? 'cursor-not-allowed opacity-60' : 'cursor-pointer'} ${
        selected ? 'border-primary-600 ring-2 ring-primary-200 shadow-md' : 'border-border hover:border-primary-300 hover:shadow-sm'
      }`}>
        <input type="radio" value={tmpl.id} className="sr-only" disabled={templateLocked} {...register('templateId')} />
        <div className="aspect-[3/4] bg-gradient-wedding flex items-center justify-center relative">
          <TemplatePreview template={tmpl} weddingData={previewWeddingData} />
          {selected && (
            <span className="absolute top-2 left-2 inline-flex items-center gap-1 rounded-full bg-primary-600 px-2 py-0.5 text-[11px] font-semibold text-white shadow">
              <CheckIcon className="h-3 w-3" /> Actuel
            </span>
          )}
          {mine && !selected && (
            <span className="absolute top-2 left-2 bg-primary-600 text-white text-[10px] px-1.5 py-0.5 rounded-full font-medium flex items-center gap-0.5">
              <UserIcon className="h-2.5 w-2.5" /> Mon modèle
            </span>
          )}
          {tmpl.isPremium && (
            <span className="absolute top-2 right-2 bg-amber-500 text-white text-xs px-2 py-0.5 rounded-full font-medium">Premium</span>
          )}
          {!templateLocked && (
            mine ? (
              <button
                type="button"
                onClick={async (e) => { e.preventDefault(); e.stopPropagation(); if (await confirmLeaveIfDirty()) navigate(`/templates/${tmpl.id}/design?wedding=${id}`) }}
                className="absolute bottom-2 left-1/2 -translate-x-1/2 flex items-center gap-1.5 rounded-full bg-white/95 px-3 py-1.5 text-xs font-medium text-primary-700 opacity-0 shadow-sm transition-opacity group-hover:opacity-100 focus:opacity-100 hover:bg-white whitespace-nowrap"
              >
                <PaintBrushIcon className="h-3.5 w-3.5" /> Modifier le design
              </button>
            ) : (
              <button
                type="button"
                disabled={forkTemplateMutation.isLoading}
                onClick={(e) => handlePersonalize(e, tmpl.id)}
                className="absolute bottom-2 left-1/2 -translate-x-1/2 flex items-center gap-1.5 rounded-full bg-white/95 px-3 py-1.5 text-xs font-medium text-primary-700 opacity-0 shadow-sm transition-opacity group-hover:opacity-100 focus:opacity-100 hover:bg-white disabled:opacity-60 whitespace-nowrap"
              >
                <PaintBrushIcon className="h-3.5 w-3.5" />
                {forkTemplateMutation.isLoading && forkTemplateMutation.variables === tmpl.id ? 'Duplication…' : 'Personnaliser'}
              </button>
            )
          )}
        </div>
        <div className="p-2">
          <p className="font-medium text-sm text-content truncate">{tmpl.name}</p>
          <p className="text-xs text-muted truncate">{mine ? 'Personnalisé' : (TEMPLATE_CATEGORIES[tmpl.category] || tmpl.category)}</p>
        </div>
      </label>
    )
  }

  return (
    <div className="max-w-6xl mx-auto pb-24">
      {/* Header */}
      <div className="mb-6">
        <button type="button" onClick={goBack} className="flex items-center text-muted hover:text-content mb-4">
          <ArrowLeftIcon className="h-5 w-5 mr-1" /> Retour à l'événement
        </button>
        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
          <div className="min-w-0">
            <h1 className="text-2xl sm:text-3xl font-serif font-bold text-content">Modifier l'événement</h1>
            <p className="text-muted mt-1 flex items-center gap-2 flex-wrap">
              <span className="truncate">{getEventDisplayTitle({ ...wedding, ...values, eventType })}</span>
              <span className="inline-flex items-center rounded-full bg-primary-500/10 px-2.5 py-0.5 text-xs font-semibold text-primary-600 dark:text-primary-400">
                {EVENT_TYPE_LABELS[eventType]}
              </span>
            </p>
          </div>
        </div>
      </div>

      {/* Section shortcuts */}
      <nav className="sticky top-16 z-20 -mx-4 sm:mx-0 mb-6 bg-bg/90 backdrop-blur px-4 sm:px-0 py-2" aria-label="Sections">
        <div className="flex gap-2 overflow-x-auto">
          {NAV.map((n) => (
            <button key={n.id} type="button" onClick={() => scrollTo(n.id)}
              className="shrink-0 rounded-full border border-border bg-surface px-3.5 py-1.5 text-sm font-medium text-muted hover:text-content hover:border-primary-300">
              {n.label}
            </button>
          ))}
        </div>
      </nav>

      {templateLocked && (
        <div className="mb-6 flex items-start gap-3 rounded-xl border border-amber-500/30 bg-amber-500/5 p-4">
          <LockClosedIcon className="h-6 w-6 shrink-0 text-amber-500 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-amber-700 dark:text-amber-400">Modèle verrouillé</p>
            <p className="text-sm text-amber-700/90 dark:text-amber-400/80">
              Des invitations ont déjà été générées : le modèle ne peut plus être changé. Les autres informations restent modifiables.
            </p>
          </div>
        </div>
      )}

      <form
        onSubmit={handleSubmit(onSubmit, onInvalid)}
        onKeyDown={(e) => { if (e.key === 'Enter' && e.target.tagName !== 'TEXTAREA' && e.target.type !== 'submit') e.preventDefault() }}
        noValidate
      >
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_260px] gap-6 items-start">
          <div className="space-y-6 min-w-0">
            {/* ========== Informations ========== */}
            <Section
              id="info"
              icon={isCouple ? HeartIcon : CalendarDaysIcon}
              title={isCouple ? 'Les mariés' : 'Informations de l\'événement'}
              description="Les champs marqués * sont obligatoires."
            >
              <IdentityFields eventType={eventType} register={register} errors={errors} watch={watch} />
              <div className="border-t border-border pt-6">
                <VenueFields eventType={eventType} register={register} showField={showField} />
              </div>
              <div className="border-t border-border pt-6">
                <MessageFields eventType={eventType} register={register} showField={showField} />
              </div>
            </Section>

            {/* ========== Programme (weddings) ========== */}
            {hasProgramme && (
              <Section id="programme" icon={CalendarDaysIcon} title="Programme du mariage" description="Toutes les étapes sont facultatives.">
                <ProgrammeFields register={register} showField={showField} />
              </Section>
            )}

            {/* ========== Template photos ========== */}
            {photoPlaceholders.length > 0 && (
              <Section
                id="photos"
                icon={PhotoIcon}
                title="Photos de l'invitation"
                description={`Votre modèle a ${photoPlaceholders.length} emplacement${photoPlaceholders.length > 1 ? 's' : ''} photo. Enregistré dès l'envoi.`}
              >
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
              </Section>
            )}

            {/* ========== Guests: tables & drinks ========== */}
            <Section id="guests" icon={UserGroupIcon} title="Accueil des invités">
              {eventUsesTables(eventType) && (
                <TablesEditor value={values.tables || []} onChange={(v) => setValue('tables', v, { shouldDirty: true })} />
              )}
              <div className={eventUsesTables(eventType) ? 'border-t border-border pt-6' : ''}>
                <DrinkOptionsEditor value={values.drinkOptions || []} onChange={(v) => setValue('drinkOptions', v, { shouldDirty: true })} />
              </div>
            </Section>

            {/* ========== Options ========== */}
            <Section id="options" icon={AdjustmentsHorizontalIcon} title="Options">
              {/* Background music — saved on upload */}
              <div className="space-y-3">
                <h3 className="font-medium text-content flex items-center gap-2">
                  <MusicalNoteIcon className="h-5 w-5 text-primary-500" /> Musique de fond
                </h3>
                <p className="text-sm text-muted">Jouée sur la page d'invitation (avec un bouton pour couper le son). Enregistrée dès l'envoi.</p>
                {wedding.musicUrl ? (
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                    <audio controls src={wedding.musicUrl} className="h-10 w-full sm:max-w-xs" />
                    <div className="flex shrink-0 gap-2">
                      <button type="button" onClick={() => musicInputRef.current?.click()} disabled={uploadMusicMutation.isLoading} className="btn-outline btn-sm">Remplacer</button>
                      <button type="button" onClick={() => removeMusicMutation.mutate()} disabled={removeMusicMutation.isLoading} className="btn-ghost btn-sm text-red-500">Retirer</button>
                    </div>
                  </div>
                ) : (
                  <button type="button" onClick={() => musicInputRef.current?.click()} disabled={uploadMusicMutation.isLoading} className="btn-outline btn-sm inline-flex items-center gap-1.5">
                    <MusicalNoteIcon className="h-4 w-4" />
                    {uploadMusicMutation.isLoading ? `Envoi…${musicUploadProgress != null ? ` ${musicUploadProgress}%` : ''}` : 'Ajouter une musique'}
                  </button>
                )}
                <input
                  ref={musicInputRef}
                  type="file"
                  accept="audio/mpeg,audio/wav,audio/ogg,audio/mp4,audio/x-m4a,audio/aac,.mp3,.wav,.ogg,.m4a,.aac"
                  className="sr-only"
                  onChange={handleMusicFileChange}
                />
                <p className="text-xs text-muted">MP3, WAV, OGG, M4A ou AAC — 10 Mo max.</p>
              </div>

              {/* Gift registry */}
              <div className="border-t border-border pt-6 space-y-4">
                <label className="flex items-start gap-3 cursor-pointer">
                  <input type="checkbox" className="mt-1 h-4 w-4 rounded" {...register('giftRegistryEnabled')} />
                  <span>
                    <span className="font-medium text-content flex items-center gap-2">
                      <GiftIcon className="h-5 w-5 text-primary-500" /> Cagnotte en ligne
                    </span>
                    <span className="block text-sm text-muted mt-0.5">
                      Vos invités peuvent envoyer un cadeau en argent (Mobile Money) depuis leur invitation.
                    </span>
                  </span>
                </label>
                {values.giftRegistryEnabled && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pl-7">
                    <div>
                      <label htmlFor="giftRegistryGoal" className="label text-sm">Objectif en FC (facultatif)</label>
                      <input id="giftRegistryGoal" type="number" min="0" step="1" className="input" placeholder="Ex : 500 000" {...register('giftRegistryGoal')} />
                    </div>
                    <div className="sm:col-span-2">
                      <label htmlFor="giftRegistryMessage" className="label text-sm">Message pour vos invités (facultatif)</label>
                      <textarea id="giftRegistryMessage" className="input" rows={2} placeholder="Ex : Aidez-nous à préparer notre nouvelle vie !" {...register('giftRegistryMessage')} />
                    </div>
                  </div>
                )}
              </div>

              {/* Double-sided print */}
              <div className="border-t border-border pt-6 space-y-4">
                <label className="flex items-start gap-3 cursor-pointer">
                  <input type="checkbox" className="mt-1 h-4 w-4 rounded" {...register('printBackEnabled')} />
                  <span>
                    <span className="font-medium text-content flex items-center gap-2">
                      <PrinterIcon className="h-5 w-5 text-primary-500" /> Impression recto-verso
                    </span>
                    <span className="block text-sm text-muted mt-0.5">
                      Ajoute un verso identique sur chaque carte imprimée : un cadre élégant avec votre message.
                    </span>
                  </span>
                </label>
                {values.printBackEnabled && (
                  <div className="pl-7">
                    <label htmlFor="printBackText" className="label text-sm">Message au verso</label>
                    <textarea id="printBackText" className="input" rows={3} placeholder="Ex : Merci de partager ce moment avec nous ❤️" {...register('printBackText')} />
                  </div>
                )}
              </div>
            </Section>

            {/* ========== Template ========== */}
            <Section id="design" icon={SwatchIcon} title="Modèle d'invitation"
              description={templateLocked ? 'Verrouillé : des invitations ont déjà été générées.' : 'Survolez un modèle pour le personnaliser (couleurs, fond, mise en page).'}>
              {templates.length === 0 && myTemplates.length === 0 ? (
                <div className="text-center py-6 bg-surface-2 rounded-xl">
                  <SwatchIcon className="h-10 w-10 text-muted mx-auto mb-2" />
                  <p className="text-muted text-sm">Aucun modèle « {EVENT_TYPE_LABELS[eventType]} » disponible pour le moment.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {myTemplates.length > 0 && (
                    <div>
                      <p className="text-xs font-semibold text-primary-600 uppercase tracking-wider mb-2 flex items-center gap-1">
                        <UserIcon className="h-3.5 w-3.5" /> Mes modèles personnalisés
                      </p>
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                        {myTemplates.map((tmpl) => templateCard(tmpl, true))}
                      </div>
                    </div>
                  )}
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                    <p className="text-xs font-semibold text-muted uppercase tracking-wider">Catalogue</p>
                    <div className="relative w-full sm:w-60">
                      <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted" />
                      <input type="search" value={templateSearch} onChange={(e) => { setTemplateSearch(e.target.value); setTemplatePage(1) }}
                        placeholder="Rechercher un modèle…" aria-label="Rechercher un modèle" className="input pl-9 py-2 text-sm w-full" />
                    </div>
                  </div>
                  {filteredTemplates.length === 0 ? (
                    <p className="text-sm text-muted text-center py-6">Aucun modèle ne correspond à « {templateSearch} ».</p>
                  ) : (
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                      {pagedTemplates.map((tmpl) => templateCard(tmpl))}
                    </div>
                  )}
                  {totalTemplatePages > 1 && (
                    <div className="flex items-center justify-center gap-2 pt-1">
                      <button type="button" onClick={() => setTemplatePage(p => Math.max(1, p - 1))} disabled={safeTemplatePage <= 1}
                        className="px-3 py-1.5 text-sm rounded-lg border border-border text-muted hover:bg-surface-2 disabled:opacity-40">‹ Précédent</button>
                      <span className="text-sm text-muted">Page {safeTemplatePage} / {totalTemplatePages}</span>
                      <button type="button" onClick={() => setTemplatePage(p => Math.min(totalTemplatePages, p + 1))} disabled={safeTemplatePage >= totalTemplatePages}
                        className="px-3 py-1.5 text-sm rounded-lg border border-border text-muted hover:bg-surface-2 disabled:opacity-40">Suivant ›</button>
                    </div>
                  )}
                </div>
              )}
            </Section>

            {/* ========== Status + danger zone ========== */}
            <Section id="status" icon={CheckCircleIcon} title="Statut">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2" role="radiogroup" aria-label="Statut de l'événement">
                {STATUS_OPTIONS.map((s) => (
                  <label key={s.value} className={`cursor-pointer rounded-xl border-2 p-3 transition ${values.status === s.value ? 'border-primary-500 bg-primary-50 dark:bg-primary-500/10' : 'border-border hover:border-primary-300'}`}>
                    <input type="radio" value={s.value} className="sr-only" {...register('status')} />
                    <span className="block text-sm font-semibold text-content">{s.label}</span>
                    <span className="block text-xs text-muted">{s.hint}</span>
                  </label>
                ))}
              </div>
              <div className="border-t border-border pt-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-red-600 flex items-center gap-1.5"><ExclamationTriangleIcon className="h-4 w-4" /> Zone dangereuse</p>
                  <p className="text-xs text-muted">Supprime l'événement, ses invités et ses invitations.</p>
                </div>
                <button type="button" onClick={handleDelete} className="btn-danger inline-flex items-center justify-center" disabled={deleteMutation.isLoading}>
                  <TrashIcon className="h-5 w-5 mr-2" />
                  {deleteMutation.isLoading ? 'Suppression…' : 'Supprimer l\'événement'}
                </button>
              </div>
            </Section>
          </div>

          {/* Live preview (desktop sidebar) */}
          <aside className="hidden lg:block sticky top-32">
            <p className="text-xs font-semibold text-muted uppercase tracking-wider mb-2 flex items-center gap-1">
              <EyeIcon className="h-3.5 w-3.5" /> Aperçu en direct
            </p>
            {selectedTemplate ? (
              <div className="rounded-xl border border-border overflow-hidden shadow-lg bg-surface">
                <button type="button" onClick={() => setPreviewOpen(true)} className="block w-full aspect-[3/4] relative bg-surface-2" title="Agrandir">
                  <TemplatePreview template={selectedTemplate} weddingData={previewWeddingData} />
                </button>
                <div className="p-3 border-t border-border space-y-2">
                  <p className="text-xs font-semibold text-content truncate">{selectedTemplate.name}</p>
                  <button type="button" onClick={() => setPreviewOpen(true)} className="btn-secondary btn-sm w-full inline-flex items-center justify-center gap-1">
                    <EyeIcon className="h-4 w-4" /> Agrandir
                  </button>
                  {isOwnTemplate && !templateLocked && (
                    <button type="button" onClick={async () => { if (await confirmLeaveIfDirty()) navigate(`/templates/${selectedTemplate.id}/design?wedding=${id}`) }}
                      className="btn-ghost btn-sm w-full inline-flex items-center justify-center gap-1 text-primary-700">
                      <PaintBrushIcon className="h-4 w-4" /> Modifier le design
                    </button>
                  )}
                </div>
              </div>
            ) : (
              <div className="aspect-[3/4] rounded-xl border-2 border-dashed border-border flex flex-col items-center justify-center bg-surface-2 text-center p-4">
                <SwatchIcon className="h-8 w-8 text-muted mb-2" />
                <p className="text-xs text-muted">Choisissez un modèle pour voir l'aperçu</p>
              </div>
            )}
          </aside>
        </div>

        {/* Sticky save bar */}
        <div className="sticky bottom-4 z-30 mt-6">
          <div className={`flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-2xl border px-4 py-3 shadow-lg transition-colors ${
            isDirty ? 'bg-gray-900 border-gray-900 text-white' : 'bg-surface/95 backdrop-blur border-border text-muted'
          }`}>
            <p className="text-sm flex items-center gap-2">
              {isDirty
                ? <><span className="h-2 w-2 rounded-full bg-amber-400 animate-pulse" /> Modifications non enregistrées</>
                : <><CheckCircleIcon className="h-4 w-4 text-green-600" /> Tout est enregistré</>}
            </p>
            <div className="flex gap-2">
              {selectedTemplate && (
                <button type="button" onClick={() => setPreviewOpen(true)} className={`lg:hidden px-3 py-2 rounded-lg text-sm font-medium ${isDirty ? 'text-gray-300 hover:bg-white/10' : 'text-muted hover:bg-surface-2'}`}>
                  Aperçu
                </button>
              )}
              {isDirty && (
                <button type="button" onClick={() => reset()} className="px-4 py-2 rounded-lg text-sm font-medium text-gray-300 hover:text-white hover:bg-white/10">
                  Annuler
                </button>
              )}
              <button type="submit" disabled={!isDirty || updateMutation.isLoading} className="btn-primary text-sm disabled:opacity-50">
                {updateMutation.isLoading ? 'Enregistrement…' : 'Enregistrer'}
              </button>
            </div>
          </div>
        </div>
      </form>

      {/* Full-size preview */}
      {previewOpen && selectedTemplate && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4 backdrop-blur-sm" onClick={() => setPreviewOpen(false)} role="dialog" aria-modal="true">
          <div className="bg-surface rounded-2xl shadow-2xl max-w-lg w-full max-h-[92vh] overflow-auto" onClick={(e) => e.stopPropagation()}>
            <div className="sticky top-0 bg-surface p-4 border-b border-border flex items-center justify-between z-10">
              <h3 className="text-lg font-serif font-bold text-content truncate">{selectedTemplate.name}</h3>
              <button type="button" onClick={() => setPreviewOpen(false)} className="text-muted hover:text-content text-xl leading-none" aria-label="Fermer">✕</button>
            </div>
            <div className="p-6 flex justify-center">
              <div className="w-full max-w-sm shadow-lg rounded-lg overflow-hidden">
                <TemplatePreview template={selectedTemplate} adaptive weddingData={previewWeddingData} />
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
