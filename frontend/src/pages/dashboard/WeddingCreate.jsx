import { useState, useEffect } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { useMutation, useQuery } from 'react-query'
import { weddingAPI, templateAPI } from '../../services/api'
import toast from 'react-hot-toast'
import TemplatePreview from '../../components/templates/TemplatePreview'
import TablesEditor from '../../components/TablesEditor'
import DrinkOptionsEditor from '../../components/DrinkOptionsEditor'
import {
  ChurchIcon, IdentityFields, VenueFields, ProgrammeFields, MessageFields, EventSummary,
  PROGRAMME_FIELDS, identityFieldNames, identityStepLabel
} from '../../components/events/EventFields'
import { eventUsesCouple, eventUsesHonoree, eventUsesFreeTitle, eventUsesTables } from '../../utils/eventTypes'
import { getVisibleFields, templateUsesProgramme } from '../../utils/templateVariables'
import { processImage } from '../../utils/imageProcessor'
import {
  ArrowLeftIcon,
  ArrowRightIcon,
  HeartIcon,
  CalendarDaysIcon,
  SparklesIcon,
  SwatchIcon,
  ExclamationTriangleIcon,
  EyeIcon,
  UserIcon,
  PhotoIcon,
  CakeIcon,
  GiftIcon,
  UserGroupIcon,
  CheckIcon,
  MagnifyingGlassIcon,
  ClipboardDocumentCheckIcon,
  InformationCircleIcon
} from '@heroicons/react/24/outline'

// Event types — WEDDING gets the full programme (mairie/église/réception),
// everything else is a simple date/heure/lieu event.
const EVENT_TYPES_META = [
  { id: 'WEDDING', label: 'Mariage', icon: HeartIcon, desc: 'Civil, religieux, réception…' },
  { id: 'DOT', label: 'Mariage coutumier', icon: GiftIcon, desc: 'Dot, cérémonie traditionnelle' },
  { id: 'BIRTHDAY', label: 'Anniversaire', icon: CakeIcon, desc: 'Date, heure et lieu' },
  { id: 'CEREMONY', label: 'Cérémonie', icon: ChurchIcon, desc: 'Baptême, communion, action de grâce…' },
  { id: 'CONFERENCE', label: 'Conférence', icon: UserGroupIcon, desc: 'Séminaire, forum, lancement…' },
  { id: 'OTHER', label: 'Autre événement', icon: CalendarDaysIcon, desc: 'Fiançailles, soirée, baby shower…' }
]

const TEMPLATE_CATEGORIES = {
  ELEGANT: 'Élégant',
  MODERN: 'Moderne',
  ROMANTIC: 'Romantique',
  MINIMALIST: 'Minimaliste',
  TRADITIONAL: 'Traditionnel'
}

const VALID_EVENT_TYPES = EVENT_TYPES_META.map(t => t.id)
const TEMPLATES_PER_PAGE = 6

const priceLabel = (tmpl) => parseFloat(tmpl.pricePerInvitation) > 0
  ? `${parseFloat(tmpl.pricePerInvitation).toLocaleString('fr-FR')} FC/inv.`
  : 'Gratuit'

export default function WeddingCreate() {
  const navigate = useNavigate()
  const location = useLocation()

  // Template can be preselected via router state or a ?templateId= query param
  // (the gallery / marketplace "Utiliser ce modèle" CTA).
  const query = new URLSearchParams(location.search)
  const preselectedTemplateId = location.state?.templateId || query.get('templateId') || ''
  const preselectedRaw = location.state?.eventType || query.get('eventType') || ''
  const preselectedEventType = VALID_EVENT_TYPES.includes(preselectedRaw) ? preselectedRaw : ''

  // Coming from the gallery with a template already picked → open on the
  // "Modèle" step (type and template preselected) instead of asking again.
  const [step, setStep] = useState(preselectedTemplateId && preselectedEventType ? 1 : 0)
  const [serverErrors, setServerErrors] = useState([])
  const [previewTmpl, setPreviewTmpl] = useState(null)
  const [templateSearch, setTemplateSearch] = useState('')
  const [templatePage, setTemplatePage] = useState(1)

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    trigger,
    formState: { errors }
  } = useForm({
    defaultValues: {
      eventType: preselectedEventType || 'WEDDING',
      tables: [],
      drinkOptions: [],
      templateId: preselectedTemplateId || ''
    }
  })

  const eventType = watch('eventType')
  const templateId = watch('templateId')
  const isWedding = eventType === 'WEDDING'
  const isCouple = eventUsesCouple(eventType)
  const isHonoree = eventUsesHonoree(eventType)
  const isFreeTitle = eventUsesFreeTitle(eventType)
  const selectedEventMeta = EVENT_TYPES_META.find(t => t.id === eventType) || EVENT_TYPES_META[0]

  // Only templates designed for the selected event type.
  const { data: templatesData, isFetched: templatesLoaded } = useQuery(
    ['templates', eventType],
    () => templateAPI.getAll({ eventType }),
    { enabled: !!eventType }
  )
  const templates = templatesData?.data?.templates || []

  const { data: myTemplatesData, isFetched: myTemplatesLoaded } = useQuery('my-templates', () => templateAPI.getMyTemplates())
  const myTemplates = (myTemplatesData?.data?.templates || []).filter(t => (t.eventType || 'WEDDING') === eventType)
  const hasTemplates = templates.length > 0 || myTemplates.length > 0

  const selectedTemplate = [...myTemplates, ...templates].find(t => t.id === templateId)

  // Changing the event type invalidates a template made for another type.
  useEffect(() => {
    if (!templateId || !templatesLoaded || !myTemplatesLoaded) return
    if (!selectedTemplate) setValue('templateId', '')
  }, [eventType, templatesLoaded, myTemplatesLoaded]) // eslint-disable-line react-hooks/exhaustive-deps

  // Multi-image templates: one File + preview per photo placeholder
  const [templateImageFiles, setTemplateImageFiles] = useState({})   // { [elementId]: File }
  const [templateImagePreviews, setTemplateImagePreviews] = useState({}) // { [elementId]: objectURL }
  const photoPlaceholders = (selectedTemplate?.config?.designElements || []).filter(el => el.type === 'photo')

  // Only ask for the fields the chosen template actually uses (identity and
  // date always). No template yet → show everything.
  const visibleFields = selectedTemplate ? getVisibleFields(selectedTemplate) : null
  const showField = (name) => !visibleFields || visibleFields.has(name)

  // Programme step only when it makes sense: weddings whose template shows
  // the commune/église/réception blocks (or no template chosen yet).
  const hasProgramme = isWedding && (!selectedTemplate || templateUsesProgramme(selectedTemplate))

  const STEPS = [
    { key: 'type', label: 'Type' },
    { key: 'design', label: 'Modèle' },
    { key: 'info', label: identityStepLabel(eventType) },
    ...(hasProgramme ? [{ key: 'programme', label: 'Programme' }] : []),
    { key: 'review', label: 'Récapitulatif' }
  ]
  const stepIndex = (key) => STEPS.findIndex(s => s.key === key)
  const safeStep = Math.min(step, STEPS.length - 1)
  const stepKey = STEPS[safeStep].key
  const isLastStep = stepKey === 'review'

  const FIELD_STEP = (field) => {
    if (field === 'templateId') return 'design'
    if (PROGRAMME_FIELDS.includes(field)) return hasProgramme ? 'programme' : 'info'
    if (field === 'eventType') return 'type'
    return 'info'
  }

  // Template search + pagination (design step)
  const tplMatches = (t) => {
    const q = templateSearch.trim().toLowerCase()
    if (!q) return true
    return (t.name || '').toLowerCase().includes(q) ||
      (TEMPLATE_CATEGORIES[t.category] || t.category || '').toLowerCase().includes(q)
  }
  const filteredMyTemplates = myTemplates.filter(tplMatches)
  const filteredTemplates = templates.filter(tplMatches)
  const totalTemplatePages = Math.max(1, Math.ceil(filteredTemplates.length / TEMPLATES_PER_PAGE))
  const safeTemplatePage = Math.min(templatePage, totalTemplatePages)
  const pagedTemplates = filteredTemplates.slice(
    (safeTemplatePage - 1) * TEMPLATES_PER_PAGE,
    safeTemplatePage * TEMPLATES_PER_PAGE
  )

  // Live preview data so canvas tokens reflect what has been typed so far.
  const values = watch()
  const hasTypedInfo = !!(values.brideName || values.groomName || values.honoreeName || values.eventTitle || values.weddingDate)
  const previewWeddingData = hasTypedInfo ? {
    templateImages: templateImagePreviews,
    eventType,
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
    rsvpDeadline: values.rsvpDeadline,
    communeTime: values.communeTime,
    egliseTime: values.egliseTime,
    receptionStartTime: values.receptionStartTime,
    communeVenue: values.communeVenue,
    egliseVenue: values.egliseVenue,
    receptionVenue: values.receptionVenue,
    receptionDate: values.receptionDate
  } : null // before anything is typed, previews use the template's rich sample

  // Same client-side pipeline as the edit page (ImageUpload): validate,
  // resize and re-encode to WebP/JPEG before upload, so phone photos (large,
  // HEIC…) never get rejected by the server after the event is created.
  const [processingPhoto, setProcessingPhoto] = useState(null)
  const handleTemplateImageChange = async (placeholderId, e) => {
    const file = e.target.files[0]
    e.target.value = ''
    if (!file) return
    setProcessingPhoto(placeholderId)
    try {
      const result = await processImage(file, 'couplePhoto', { maxSizeMB: 15 })
      setTemplateImageFiles(prev => ({ ...prev, [placeholderId]: result.upload }))
      setTemplateImagePreviews(prev => ({ ...prev, [placeholderId]: URL.createObjectURL(result.preview) }))
    } catch (err) {
      toast.error(err.message || 'Image non valide')
    } finally {
      setProcessingPhoto(null)
    }
  }

  const goTo = (index) => {
    setStep(Math.max(0, Math.min(index, STEPS.length - 1)))
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  // Validate the current step before moving on, so the recap never shows
  // (and the server never receives) an incomplete event.
  const goNext = async () => {
    if (stepKey === 'design' && !templateId && hasTemplates) {
      toast.error('Choisissez un modèle pour continuer')
      return
    }
    if (stepKey === 'info') {
      const ok = await trigger(identityFieldNames(eventType))
      if (!ok) {
        toast.error('Complétez les champs obligatoires')
        return
      }
    }
    goTo(safeStep + 1)
  }

  const createMutation = useMutation(
    (data) => weddingAPI.create(data),
    {
      onSuccess: async (response) => {
        setServerErrors([])
        const newWeddingId = response.data.wedding.id

        // Sequential: each upload merges into the wedding's templateImages
        // map server-side — parallel requests could overwrite each other.
        let failed = 0
        for (const [placeholderId, file] of Object.entries(templateImageFiles)) {
          try {
            await weddingAPI.uploadTemplateImage(newWeddingId, placeholderId, file)
          } catch {
            failed++
          }
        }
        if (failed > 0) {
          toast.error(
            failed > 1
              ? `Événement créé, mais ${failed} photos n’ont pas pu être envoyées. Ajoutez-les ici.`
              : 'Événement créé, mais une photo n’a pas pu être envoyée. Ajoutez-la ici.',
            { duration: 8000 }
          )
          navigate(`/weddings/${newWeddingId}/edit#photos`)
          return
        }
        toast.success('Événement créé avec succès !')
        navigate(`/weddings/${newWeddingId}`)
      },
      onError: (error) => {
        const responseData = error.response?.data
        if (Array.isArray(responseData?.details) && responseData.details.length) {
          setServerErrors(responseData.details)
          const first = responseData.details[0]
          if (first?.field) goTo(stepIndex(FIELD_STEP(first.field)))
          toast.error(first?.message || responseData.error || 'Erreur de validation')
        } else {
          setServerErrors([])
          toast.error(responseData?.error || 'Erreur lors de la création')
        }
      }
    }
  )

  const cleanValue = (val) => (val === '' || val === undefined) ? null : val

  const onSubmit = (data) => {
    const base = {
      eventType: data.eventType || 'WEDDING',
      weddingDate: new Date(data.weddingDate).toISOString(),
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
      templateId: cleanValue(data.templateId),
      customMessage: cleanValue(data.customMessage),
      rsvpDeadline: data.rsvpDeadline ? new Date(data.rsvpDeadline).toISOString() : null,
      additionalInfo: cleanValue(data.additionalInfo)
    }

    // Only weddings carry the programme (commune/église/réception).
    const formattedData = isWedding ? {
      ...base,
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
    } : base

    createMutation.mutate(formattedData)
  }

  // Client-side validation failed at the final click → jump to the field.
  const onInvalid = (errs) => {
    const first = Object.keys(errs)[0]
    if (first) goTo(stepIndex(FIELD_STEP(first)))
    toast.error('Certains champs obligatoires sont vides')
  }

  // Creation is ONLY triggered by the explicit "Créer l'événement" click on
  // the recap (never by a form submit / Enter key — that used to create the
  // event the instant the recap appeared).
  const createEvent = handleSubmit(onSubmit, onInvalid)

  const getServerError = (fieldName) => serverErrors.find(e => e.field === fieldName)
  const stepHasErrors = (key) => serverErrors.some(e => FIELD_STEP(e.field) === key)

  const templateCard = (tmpl, mine = false) => {
    const selected = templateId === tmpl.id
    return (
      <label
        key={tmpl.id}
        className={`group cursor-pointer rounded-xl border-2 overflow-hidden transition-all ${
          selected ? 'border-primary-600 ring-2 ring-primary-200 shadow-md' : 'border-border hover:border-primary-300 hover:shadow-sm'
        }`}
      >
        <input type="radio" value={tmpl.id} className="sr-only" {...register('templateId')} />
        <div className="aspect-[3/4] bg-gradient-wedding flex items-center justify-center relative">
          <TemplatePreview template={tmpl} weddingData={previewWeddingData} />
          {selected && (
            <span className="absolute top-2 left-2 inline-flex items-center gap-1 rounded-full bg-primary-600 px-2 py-0.5 text-[11px] font-semibold text-white shadow">
              <CheckIcon className="h-3 w-3" /> Choisi
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
          <button
            type="button"
            onClick={(e) => { e.preventDefault(); e.stopPropagation(); setPreviewTmpl(tmpl) }}
            className="absolute bottom-2 right-2 inline-flex items-center gap-1 bg-white/90 hover:bg-white text-gray-800 text-[11px] font-semibold px-2 py-1 rounded-full shadow"
          >
            <EyeIcon className="h-3 w-3" /> Aperçu
          </button>
        </div>
        <div className="p-2">
          <p className="font-medium text-sm text-content truncate">{tmpl.name}</p>
          <div className="flex items-center justify-between gap-2">
            <p className="text-xs text-muted truncate">{mine ? 'Personnalisé' : (TEMPLATE_CATEGORIES[tmpl.category] || tmpl.category)}</p>
            <p className="text-xs font-bold text-primary-600 shrink-0">{priceLabel(tmpl)}</p>
          </div>
        </div>
      </label>
    )
  }

  return (
    <div className="max-w-4xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <button type="button" onClick={() => navigate('/weddings')} className="flex items-center text-muted hover:text-content mb-4">
          <ArrowLeftIcon className="h-5 w-5 mr-1" /> Mes événements
        </button>
        <h1 className="text-2xl sm:text-3xl font-serif font-bold text-content">Créer un événement</h1>
        <p className="text-muted mt-1">
          {safeStep === 0 ? 'Commencez par le type d\'événement.' : `${selectedEventMeta.label} · étape ${safeStep + 1} sur ${STEPS.length}`}
        </p>
      </div>

      {/* Progress — numbered from 1, completed steps are clickable */}
      <ol className="flex items-start justify-between sm:justify-center gap-1 sm:gap-0 mb-8 overflow-x-auto pb-2" aria-label="Étapes">
        {STEPS.map((s, idx) => {
          const done = idx < safeStep
          const current = idx === safeStep
          const hasErr = stepHasErrors(s.key)
          return (
            <li key={s.key} className="flex items-center">
              <button
                type="button"
                onClick={() => done && goTo(idx)}
                disabled={!done}
                aria-current={current ? 'step' : undefined}
                className="flex flex-col items-center min-w-[3.5rem] disabled:cursor-default"
              >
                <span className={`w-9 h-9 rounded-full flex items-center justify-center font-semibold text-sm transition-colors ${
                  hasErr ? 'bg-red-500 text-white ring-2 ring-red-200'
                    : current ? 'bg-primary-600 text-white ring-4 ring-primary-100'
                      : done ? 'bg-primary-600 text-white' : 'bg-surface-2 text-muted border border-border'
                }`}>
                  {hasErr ? '!' : done ? <CheckIcon className="h-4 w-4" /> : idx + 1}
                </span>
                <span className={`text-[11px] sm:text-xs mt-1 whitespace-nowrap ${
                  hasErr ? 'text-red-600 font-medium' : current ? 'text-primary-700 font-semibold' : done ? 'text-primary-600' : 'text-muted'
                }`}>
                  {s.label}
                </span>
              </button>
              {idx < STEPS.length - 1 && (
                <span className={`hidden sm:block w-10 h-0.5 mx-1 mb-5 ${idx < safeStep ? 'bg-primary-600' : 'bg-border'}`} />
              )}
            </li>
          )
        })}
      </ol>

      {/* Server-side validation summary */}
      {serverErrors.length > 0 && (
        <div className="mb-6 bg-red-50 border border-red-200 rounded-xl p-4" role="alert">
          <div className="flex items-start">
            <ExclamationTriangleIcon className="h-5 w-5 text-red-500 mr-3 mt-0.5 flex-shrink-0" />
            <div className="flex-1">
              <h3 className="text-sm font-medium text-red-800">Quelques informations sont à corriger</h3>
              <ul className="mt-2 space-y-1">
                {serverErrors.map((err, idx) => (
                  <li key={idx} className="text-sm text-red-700 flex items-center justify-between gap-2">
                    <span>{err.message}</span>
                    {err.field && FIELD_STEP(err.field) !== stepKey && (
                      <button type="button" onClick={() => goTo(stepIndex(FIELD_STEP(err.field)))} className="text-xs text-red-600 underline hover:text-red-800 shrink-0">
                        Corriger
                      </button>
                    )}
                  </li>
                ))}
              </ul>
            </div>
            <button type="button" onClick={() => setServerErrors([])} className="ml-2 text-red-500 hover:text-red-700" aria-label="Fermer">×</button>
          </div>
        </div>
      )}

      {/* No native submit: Enter never creates the event by accident. */}
      <form
        onSubmit={(e) => e.preventDefault()}
        onKeyDown={(e) => {
          if (e.key === 'Enter' && e.target.tagName !== 'TEXTAREA' && e.target.type !== 'button') e.preventDefault()
        }}
        noValidate
      >
        <div className="bg-surface border border-border rounded-2xl shadow-sm p-5 sm:p-8">

          {/* ===================== Type ===================== */}
          {stepKey === 'type' && (
            <div className="space-y-6">
              <div>
                <h2 className="text-xl font-serif font-bold text-content flex items-center">
                  <SparklesIcon className="h-6 w-6 mr-2 text-primary-500" />
                  Quel type d'événement organisez-vous ?
                </h2>
                <p className="text-muted mt-1 text-sm">
                  Le formulaire s'adapte : programme complet pour un mariage, date et lieu uniques pour les autres.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4" role="radiogroup">
                {EVENT_TYPES_META.map((type) => {
                  const Icon = type.icon
                  const isSelected = eventType === type.id
                  return (
                    <label
                      key={type.id}
                      className={`cursor-pointer p-5 rounded-xl border-2 transition-all hover:shadow-md ${
                        isSelected ? 'border-primary-500 bg-primary-50 dark:bg-primary-500/10 shadow-md ring-1 ring-primary-200' : 'border-border hover:border-primary-300'
                      }`}
                    >
                      <input type="radio" value={type.id} className="sr-only" {...register('eventType')} />
                      <div className={`w-12 h-12 rounded-full flex items-center justify-center mb-3 ${isSelected ? 'bg-primary-600 text-white' : 'bg-surface-2 text-muted'}`}>
                        <Icon className="h-6 w-6" />
                      </div>
                      <p className="font-semibold text-content">{type.label}</p>
                      <p className="text-xs text-muted mt-1">{type.desc}</p>
                      {isSelected && (
                        <div className="mt-2 inline-flex items-center gap-1 text-xs text-primary-600 font-medium">
                          <CheckIcon className="h-3.5 w-3.5" /> Sélectionné
                        </div>
                      )}
                    </label>
                  )
                })}
              </div>
            </div>
          )}

          {/* ===================== Modèle ===================== */}
          {stepKey === 'design' && (
            <div className="space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
                <div>
                  <h2 className="text-xl font-serif font-bold text-content flex items-center">
                    <SwatchIcon className="h-6 w-6 mr-2 text-primary-500" />
                    Choisissez votre modèle
                  </h2>
                  <p className="text-muted mt-1 text-sm">Modèles « {selectedEventMeta.label} ». Les champs à remplir s'adaptent au modèle choisi.</p>
                </div>
                {hasTemplates && (
                  <div className="relative w-full sm:w-64">
                    <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted" />
                    <input
                      type="search"
                      value={templateSearch}
                      onChange={(e) => { setTemplateSearch(e.target.value); setTemplatePage(1) }}
                      placeholder="Rechercher un modèle…"
                      aria-label="Rechercher un modèle"
                      className="input pl-9 py-2 text-sm w-full"
                    />
                  </div>
                )}
              </div>

              {!templatesLoaded ? (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {Array.from({ length: 6 }).map((_, i) => (
                    <div key={i} className="aspect-[3/4] rounded-xl bg-surface-2 animate-pulse" />
                  ))}
                </div>
              ) : !hasTemplates ? (
                <div className="text-center py-10 bg-surface-2 rounded-xl">
                  <SwatchIcon className="h-10 w-10 text-muted mx-auto mb-2" />
                  <p className="text-muted text-sm">
                    Aucun modèle « {selectedEventMeta.label} » pour le moment — vous pourrez en choisir un plus tard.
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {filteredMyTemplates.length > 0 && (
                    <div>
                      <p className="text-xs font-semibold text-primary-600 uppercase tracking-wider mb-2 flex items-center gap-1">
                        <UserIcon className="h-3.5 w-3.5" /> Mes modèles personnalisés
                      </p>
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                        {filteredMyTemplates.map((tmpl) => templateCard(tmpl, true))}
                      </div>
                      <p className="text-xs font-semibold text-muted uppercase tracking-wider mt-5 mb-2">Catalogue</p>
                    </div>
                  )}
                  {filteredMyTemplates.length === 0 && filteredTemplates.length === 0 && (
                    <div className="text-center py-8 bg-surface-2 rounded-xl">
                      <MagnifyingGlassIcon className="h-8 w-8 text-muted mx-auto mb-2" />
                      <p className="text-sm text-muted">Aucun modèle ne correspond à « {templateSearch} »</p>
                    </div>
                  )}
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    {pagedTemplates.map((tmpl) => templateCard(tmpl))}
                  </div>

                  {totalTemplatePages > 1 && (
                    <div className="flex items-center justify-center gap-2 pt-2">
                      <button type="button" onClick={() => setTemplatePage(p => Math.max(1, p - 1))} disabled={safeTemplatePage <= 1}
                        className="px-3 py-1.5 text-sm rounded-lg border border-border text-muted hover:bg-surface-2 disabled:opacity-40">
                        ‹ Précédent
                      </button>
                      <span className="text-sm text-muted">Page {safeTemplatePage} / {totalTemplatePages}</span>
                      <button type="button" onClick={() => setTemplatePage(p => Math.min(totalTemplatePages, p + 1))} disabled={safeTemplatePage >= totalTemplatePages}
                        className="px-3 py-1.5 text-sm rounded-lg border border-border text-muted hover:bg-surface-2 disabled:opacity-40">
                        Suivant ›
                      </button>
                    </div>
                  )}
                </div>
              )}

              {/* Per-placeholder photos (multi-image templates) */}
              {templateId && photoPlaceholders.length > 0 && (
                <div className="border-t border-border pt-6">
                  <h3 className="font-medium text-content mb-1 flex items-center gap-2">
                    <PhotoIcon className="h-5 w-5 text-primary-500" />
                    Photos de l'invitation
                    <span className="text-xs font-normal text-muted">({photoPlaceholders.length} emplacement{photoPlaceholders.length > 1 ? 's' : ''})</span>
                  </h3>
                  <p className="text-sm text-muted mb-4">Facultatif — vous pourrez aussi les ajouter plus tard.</p>
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                    {photoPlaceholders.map((ph, i) => {
                      const preview = templateImagePreviews[ph.id]
                      return (
                        <div key={ph.id} className="space-y-1">
                          <label className="block cursor-pointer">
                            <div className={`aspect-square rounded-xl border-2 ${preview ? 'border-primary-300' : 'border-dashed border-border'} overflow-hidden bg-surface-2 flex items-center justify-center hover:border-primary-400 transition-colors`}>
                              {processingPhoto === ph.id ? (
                                <span className="h-7 w-7 animate-spin rounded-full border-2 border-primary-500 border-t-transparent" aria-label="Préparation" />
                              ) : preview ? (
                                <img src={preview} alt={ph.label || `Photo ${i + 1}`} className="w-full h-full object-cover" />
                              ) : (
                                <div className="text-center text-muted p-2">
                                  <PhotoIcon className="h-7 w-7 mx-auto mb-1" />
                                  <span className="text-[11px]">Ajouter</span>
                                </div>
                              )}
                            </div>
                            <input type="file" accept="image/jpeg,image/png,image/webp,image/heic,image/heif" className="sr-only" disabled={!!processingPhoto} onChange={(e) => handleTemplateImageChange(ph.id, e)} />
                          </label>
                          <p className="text-xs text-center text-muted truncate">{ph.label || `Photo ${i + 1}`}</p>
                          {preview && (
                            <button
                              type="button"
                              onClick={() => {
                                setTemplateImageFiles(prev => { const n = { ...prev }; delete n[ph.id]; return n })
                                setTemplateImagePreviews(prev => { const n = { ...prev }; delete n[ph.id]; return n })
                              }}
                              className="block mx-auto text-[11px] text-red-500 hover:text-red-700"
                            >
                              Retirer
                            </button>
                          )}
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ===================== Infos (per type) ===================== */}
          {stepKey === 'info' && (
            <div className="space-y-8">
              <div>
                <h2 className="text-xl font-serif font-bold text-content flex items-center">
                  <selectedEventMeta.icon className="h-6 w-6 mr-2 text-primary-500" />
                  {isCouple ? 'Les mariés' : isHonoree ? identityStepLabel(eventType) : 'Votre événement'}
                </h2>
                <p className="text-muted mt-1 text-sm">
                  Les champs marqués * sont obligatoires.{selectedTemplate ? ' Seuls les champs utilisés par votre modèle sont affichés.' : ''}
                </p>
              </div>

              <div className="space-y-6">
                <IdentityFields eventType={eventType} register={register} errors={errors} watch={watch} serverError={getServerError} />
              </div>
              <div className="border-t border-border pt-6">
                <VenueFields eventType={eventType} register={register} showField={showField} />
              </div>
              <div className="border-t border-border pt-6">
                <MessageFields eventType={eventType} register={register} showField={showField} />
              </div>
              {eventUsesTables(eventType) && (
                <div className="border-t border-border pt-6">
                  <TablesEditor value={values.tables || []} onChange={(v) => setValue('tables', v)} />
                </div>
              )}
              <div className="border-t border-border pt-6">
                <DrinkOptionsEditor value={values.drinkOptions || []} onChange={(v) => setValue('drinkOptions', v)} />
              </div>
            </div>
          )}

          {/* ===================== Programme (weddings) ===================== */}
          {stepKey === 'programme' && (
            <div className="space-y-6">
              <div>
                <h2 className="text-xl font-serif font-bold text-content flex items-center">
                  <CalendarDaysIcon className="h-6 w-6 mr-2 text-primary-500" />
                  Programme du mariage
                </h2>
                <p className="text-muted mt-1 text-sm">Renseignez les étapes de votre journée — toutes sont facultatives.</p>
              </div>
              <ProgrammeFields register={register} showField={showField} />
            </div>
          )}

          {/* ===================== Récapitulatif ===================== */}
          {stepKey === 'review' && (
            <div className="space-y-6">
              <div>
                <h2 className="text-xl font-serif font-bold text-content flex items-center">
                  <ClipboardDocumentCheckIcon className="h-6 w-6 mr-2 text-primary-500" />
                  Vérifiez avant de créer
                </h2>
                <p className="text-muted mt-1 text-sm">
                  Relisez votre invitation et vos informations. Rien n'est créé tant que vous n'avez pas cliqué sur « Créer l'événement ».
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-[minmax(0,300px)_1fr] gap-6 items-start">
                {/* Invitation preview */}
                <div>
                  {selectedTemplate ? (
                    <button
                      type="button"
                      onClick={() => setPreviewTmpl(selectedTemplate)}
                      className="group relative block w-full max-w-xs mx-auto rounded-xl overflow-hidden shadow-lg border border-border hover:shadow-xl transition-shadow"
                      title="Agrandir l'aperçu"
                    >
                      <TemplatePreview template={selectedTemplate} adaptive weddingData={previewWeddingData} />
                      <span className="absolute inset-x-0 bottom-0 flex justify-center p-3 bg-gradient-to-t from-black/50 to-transparent">
                        <span className="inline-flex items-center gap-1 px-3 py-1.5 bg-white/95 rounded-full text-xs font-semibold text-gray-800">
                          <EyeIcon className="h-4 w-4" /> Agrandir
                        </span>
                      </span>
                    </button>
                  ) : (
                    <div className="aspect-[3/4] max-w-xs mx-auto rounded-xl border-2 border-dashed border-border flex flex-col items-center justify-center text-center p-6 bg-surface-2">
                      <SwatchIcon className="h-10 w-10 text-muted mb-2" />
                      <p className="text-sm text-muted">Aucun modèle choisi</p>
                      {hasTemplates && (
                        <button type="button" onClick={() => goTo(stepIndex('design'))} className="btn-secondary btn-sm mt-3">
                          Choisir un modèle
                        </button>
                      )}
                    </div>
                  )}
                </div>

                {/* Recap */}
                <div className="rounded-xl border border-border p-4 sm:p-5">
                  <EventSummary
                    eventType={eventType}
                    values={values}
                    template={selectedTemplate}
                    showProgramme={hasProgramme}
                    onEdit={(section) => goTo(stepIndex(section === 'programme' && !hasProgramme ? 'info' : section))}
                  />
                </div>
              </div>

              <div className="flex items-start gap-2 rounded-lg border border-blue-200 bg-blue-50 p-4 text-sm text-blue-800 dark:bg-blue-500/10 dark:border-blue-500/30 dark:text-blue-300">
                <InformationCircleIcon className="h-5 w-5 shrink-0 mt-0.5" />
                <p>
                  Après la création, vous ajouterez vos invités puis générerez les invitations (une par invité, avec son QR code)
                  depuis la page <strong>Invitations</strong>. Tout reste modifiable ensuite.
                </p>
              </div>
            </div>
          )}

          {/* Navigation — Next and Create are distinct elements (keys) and
              neither is a native submit button. */}
          <div className="flex items-center justify-between gap-3 mt-8 pt-6 border-t border-border">
            {safeStep > 0 ? (
              <button key="prev" type="button" onClick={() => goTo(safeStep - 1)} className="btn-secondary inline-flex items-center gap-1">
                <ArrowLeftIcon className="h-4 w-4" /> Précédent
              </button>
            ) : <span />}

            {!isLastStep ? (
              <button key="next" type="button" onClick={goNext} className="btn-primary inline-flex items-center gap-1">
                {STEPS[safeStep + 1]?.key === 'review' ? 'Voir le récapitulatif' : 'Suivant'} <ArrowRightIcon className="h-4 w-4" />
              </button>
            ) : (
              <button key="create" type="button" onClick={createEvent} disabled={createMutation.isLoading} className="btn-primary inline-flex items-center gap-2">
                {createMutation.isLoading ? (
                  <>
                    <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24" aria-hidden="true">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    Création…
                  </>
                ) : (
                  <><CheckIcon className="h-5 w-5" /> Créer l'événement</>
                )}
              </button>
            )}
          </div>
        </div>
      </form>

      {/* Large template preview */}
      {previewTmpl && (
        <div
          className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4 backdrop-blur-sm"
          onClick={() => setPreviewTmpl(null)}
          role="dialog"
          aria-modal="true"
        >
          <div className="bg-surface rounded-2xl shadow-2xl max-w-lg w-full max-h-[92vh] overflow-auto" onClick={(e) => e.stopPropagation()}>
            <div className="sticky top-0 bg-surface p-4 border-b border-border flex items-center justify-between z-10">
              <div>
                <h3 className="text-lg font-serif font-bold text-content">{previewTmpl.name}</h3>
                <p className="text-xs font-semibold text-primary-600">{priceLabel(previewTmpl)}</p>
              </div>
              <button type="button" onClick={() => setPreviewTmpl(null)} className="text-muted hover:text-content text-xl leading-none" aria-label="Fermer">✕</button>
            </div>
            <div className="p-6 flex justify-center">
              <div className="w-full max-w-sm shadow-lg rounded-lg overflow-hidden">
                <TemplatePreview template={previewTmpl} adaptive weddingData={previewWeddingData} />
              </div>
            </div>
            <div className="p-4 border-t border-border flex justify-center">
              {stepKey === 'review' ? (
                <button type="button" onClick={() => setPreviewTmpl(null)} className="btn-secondary">Fermer</button>
              ) : (
                <button
                  type="button"
                  onClick={() => { setValue('templateId', previewTmpl.id); setPreviewTmpl(null) }}
                  className="btn-primary"
                >
                  {templateId === previewTmpl.id ? 'Modèle choisi ✓' : 'Choisir ce modèle'}
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
