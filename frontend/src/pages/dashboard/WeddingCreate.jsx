import { useState, useRef } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { useMutation, useQuery } from 'react-query'
import { weddingAPI, templateAPI } from '../../services/api'
import toast from 'react-hot-toast'
import TemplatePreview from '../../components/templates/TemplatePreview'
import {
  ArrowLeftIcon,
  HeartIcon,
  BuildingLibraryIcon,
  MusicalNoteIcon,
  CalendarDaysIcon,
  QrCodeIcon,
  PrinterIcon,
  SparklesIcon,
  SwatchIcon,
  ExclamationTriangleIcon,
  EyeIcon,
  UserIcon,
  PhotoIcon,
  CakeIcon,
  GiftIcon,
  UserGroupIcon,
  MapPinIcon,
  CheckIcon
} from '@heroicons/react/24/outline'

const ChurchIcon = ({ className }) => (
  <svg className={className} fill="currentColor" viewBox="0 0 24 24">
    <path d="M18 12.22V9l-5-2.5V5h1V3h-1V1h-2v2h-1v2h1v1.5L6 9v3.22l-2 1V22h8v-3c0-1.1.9-2 2-2s2 .9 2 2v3h8v-8.78l-2-1zM12 13.5c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2z" />
  </svg>
)

// Event types - WEDDING gets the full programme (mairie/église/réception),
// everything else is a simple date/heure/lieu/titre event.
const EVENT_TYPES_META = [
  { id: 'WEDDING', label: 'Mariage', icon: HeartIcon, desc: 'Cérémonie civile, religieuse, réception...' },
  { id: 'BIRTHDAY', label: 'Anniversaire', icon: CakeIcon, desc: 'Date, heure et lieu' },
  { id: 'DOT', label: 'Dot', icon: GiftIcon, desc: 'Cérémonie traditionnelle' },
  { id: 'CEREMONY', label: 'Cérémonie', icon: ChurchIcon, desc: 'Baptême, communion...' },
  { id: 'CONFERENCE', label: 'Conférence', icon: UserGroupIcon, desc: 'Séminaire, conférence...' },
  { id: 'OTHER', label: 'Autre événement', icon: CalendarDaysIcon, desc: 'Tout autre type d\'événement' }
]

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

export default function WeddingCreate() {
  const [step, setStep] = useState(0)
  const [serverErrors, setServerErrors] = useState([])
  const navigate = useNavigate()
  const location = useLocation()
  const preselectedTemplateId = location.state?.templateId

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors }
  } = useForm({
    defaultValues: {
      eventType: 'WEDDING',
      templateId: preselectedTemplateId || '',
      qrCodeStyle: 'classic',
      qrCodeColor: '#000000',
      qrCodeBgColor: '#FFFFFF',
      qrCodeSize: 300,
      qrCodeTransparentBg: false,
      wantsPrintService: false,
      printPaperType: 'premium',
      printFinish: 'mat',
      printSize: 'A5',
      printQuantity: 50
    }
  })

  const eventType = watch('eventType')
  const isWedding = eventType === 'WEDDING'
  const selectedEventMeta = EVENT_TYPES_META.find(t => t.id === eventType) || EVENT_TYPES_META[0]

  // Only show templates designed for the selected event type - a Mariage
  // event shouldn't be offered a Conférence layout and vice-versa.
  const { data: templatesData } = useQuery(
    ['templates', eventType],
    () => templateAPI.getAll({ eventType }),
    { enabled: !!eventType }
  )
  const templates = templatesData?.data?.templates || []

  const { data: myTemplatesData } = useQuery('my-templates', () => templateAPI.getMyTemplates())
  const myTemplates = (myTemplatesData?.data?.templates || []).filter(t => (t.eventType || 'WEDDING') === eventType)

  // Step numbers shift depending on whether the full wedding programme
  // step is needed - everything downstream (design/QR/print) just slides up.
  const STEP_TYPE = 0
  const STEP_INFO = 1
  const STEP_PROGRAMME = 2
  const STEP_DESIGN = isWedding ? 3 : 2
  const STEP_QR = isWedding ? 4 : 3
  const STEP_PRINT = isWedding ? 5 : 4
  const totalSteps = STEP_PRINT

  const STEPS = [
    { num: STEP_TYPE, label: 'Type' },
    ...(isWedding ? [
      { num: STEP_INFO, label: 'Mariés' },
      { num: STEP_PROGRAMME, label: 'Programme' },
      { num: STEP_DESIGN, label: 'Design' },
      { num: STEP_QR, label: 'QR Code' },
      { num: STEP_PRINT, label: 'Impression' }
    ] : [
      { num: STEP_INFO, label: 'Infos' },
      { num: STEP_DESIGN, label: 'Design' },
      { num: STEP_QR, label: 'QR Code' },
      { num: STEP_PRINT, label: 'Impression' }
    ])
  ]

  const FIELD_TO_STEP = isWedding ? {
    brideName: STEP_INFO, groomName: STEP_INFO, weddingDate: STEP_INFO, customMessage: STEP_INFO,
    rsvpDeadline: STEP_INFO, additionalInfo: STEP_INFO,
    communeDate: STEP_PROGRAMME, communeTime: STEP_PROGRAMME, communeVenue: STEP_PROGRAMME, communeAddress: STEP_PROGRAMME,
    egliseDate: STEP_PROGRAMME, egliseTime: STEP_PROGRAMME, egliseVenue: STEP_PROGRAMME, egliseAddress: STEP_PROGRAMME,
    receptionDate: STEP_PROGRAMME, receptionStartTime: STEP_PROGRAMME, receptionVenue: STEP_PROGRAMME, receptionAddress: STEP_PROGRAMME,
    templateId: STEP_DESIGN,
    qrCodeStyle: STEP_QR, qrCodeColor: STEP_QR, qrCodeBgColor: STEP_QR, qrCodeSize: STEP_QR, qrCodeTransparentBg: STEP_QR,
    printQuantity: STEP_PRINT, printPaperType: STEP_PRINT, printFinish: STEP_PRINT, printSize: STEP_PRINT, printNotes: STEP_PRINT
  } : {
    eventTitle: STEP_INFO, weddingDate: STEP_INFO, ceremonyTime: STEP_INFO,
    venueName: STEP_INFO, venueAddress: STEP_INFO, venueCity: STEP_INFO,
    customMessage: STEP_INFO, rsvpDeadline: STEP_INFO, additionalInfo: STEP_INFO,
    templateId: STEP_DESIGN,
    qrCodeStyle: STEP_QR, qrCodeColor: STEP_QR, qrCodeBgColor: STEP_QR, qrCodeSize: STEP_QR, qrCodeTransparentBg: STEP_QR,
    printQuantity: STEP_PRINT, printPaperType: STEP_PRINT, printFinish: STEP_PRINT, printSize: STEP_PRINT, printNotes: STEP_PRINT
  }

  const [couplePhotoFile, setCouplePhotoFile] = useState(null)
  const [couplePhotoPreview, setCouplePhotoPreview] = useState('')
  const photoInputRef = useRef(null)

  const handlePhotoChange = (e) => {
    const file = e.target.files[0]
    if (!file) return
    if (!file.type.startsWith('image/')) { toast.error('Veuillez sélectionner une image'); return }
    if (file.size > 5 * 1024 * 1024) { toast.error('Image trop volumineuse (max 5 Mo)'); return }
    setCouplePhotoFile(file)
    setCouplePhotoPreview(URL.createObjectURL(file))
    e.target.value = ''
  }

  const createMutation = useMutation(
    (data) => weddingAPI.create(data),
    {
      onSuccess: async (response) => {
        setServerErrors([])
        const newWeddingId = response.data.wedding.id
        if (couplePhotoFile) {
          try {
            await weddingAPI.uploadCouplePhoto(newWeddingId, couplePhotoFile)
          } catch (e) {
            toast.error("Événement créé, mais l'envoi de la photo a échoué. Vous pourrez la rajouter depuis la page de l'événement.")
          }
        }
        toast.success('Événement créé avec succès !')
        navigate(`/weddings/${newWeddingId}`)
      },
      onError: (error) => {
        const responseData = error.response?.data
        if (responseData?.details && Array.isArray(responseData.details)) {
          // Server validation errors with details
          setServerErrors(responseData.details)
          const firstError = responseData.details[0]
          if (firstError?.field) {
            const targetStep = FIELD_TO_STEP[firstError.field]
            if (targetStep && targetStep !== step) {
              setStep(targetStep)
              toast.error(`Erreur à l'étape ${targetStep}: ${firstError.message}`)
            } else {
              toast.error(firstError.message)
            }
          } else {
            toast.error(responseData.error || 'Erreur de validation')
          }
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
      templateId: cleanValue(data.templateId),
      customMessage: cleanValue(data.customMessage),
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

    const formattedData = isWedding ? {
      ...base,
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
      ...base,
      eventTitle: data.eventTitle,
      ceremonyTime: cleanValue(data.ceremonyTime),
      venueName: cleanValue(data.venueName),
      venueAddress: cleanValue(data.venueAddress),
      venueCity: cleanValue(data.venueCity)
    }

    createMutation.mutate(formattedData)
  }

  const wantsPrint = watch('wantsPrintService')

  // Helper to check if a field has a server error
  const getServerError = (fieldName) => serverErrors.find(e => e.field === fieldName)

  // Check if a step has server errors
  const stepHasErrors = (stepNum) => serverErrors.some(e => FIELD_TO_STEP[e.field] === stepNum)

  return (
    <div className="max-w-4xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <button onClick={() => navigate('/weddings')} className="flex items-center text-gray-600 hover:text-gray-900 mb-4">
          <ArrowLeftIcon className="h-5 w-5 mr-1" /> Retour
        </button>
        <h1 className="text-3xl font-serif font-bold text-gray-900">Créer un nouvel événement</h1>
        <p className="text-gray-600 mt-1">Remplissez les informations de votre événement</p>
      </div>

      {/* Progress Steps */}
      <div className="flex items-center justify-center mb-8 overflow-x-auto pb-2">
        {STEPS.map((s, idx) => (
          <div key={s.num} className="flex items-center">
            <div className="flex flex-col items-center relative">
              <div className={`w-9 h-9 rounded-full flex items-center justify-center font-medium text-sm transition-colors ${
                stepHasErrors(s.num)
                  ? 'bg-red-500 text-white ring-2 ring-red-200'
                  : step >= s.num ? 'bg-primary-600 text-white' : 'bg-gray-200 text-gray-500'
              }`}>
                {stepHasErrors(s.num) ? '!' : s.num}
              </div>
              <span className={`text-xs mt-1 whitespace-nowrap ${
                stepHasErrors(s.num) ? 'text-red-600 font-medium' : step >= s.num ? 'text-primary-600' : 'text-gray-400'
              }`}>
                {s.label}
              </span>
            </div>
            {idx < STEPS.length - 1 && (
              <div className={`w-10 h-1 mx-1 mb-4 ${step > s.num ? 'bg-primary-600' : 'bg-gray-200'}`} />
            )}
          </div>
        ))}
      </div>

      {/* Error Summary */}
      {serverErrors.length > 0 && (
        <div className="mb-6 bg-red-50 border border-red-200 rounded-xl p-4">
          <div className="flex items-start">
            <ExclamationTriangleIcon className="h-5 w-5 text-red-500 mr-3 mt-0.5 flex-shrink-0" />
            <div className="flex-1">
              <h3 className="text-sm font-medium text-red-800">Erreur de validation</h3>
              <ul className="mt-2 space-y-1">
                {serverErrors.map((err, idx) => (
                  <li key={idx} className="text-sm text-red-700 flex items-center justify-between">
                    <span>
                      <strong className="capitalize">{err.field}</strong>: {err.message}
                    </span>
                    {FIELD_TO_STEP[err.field] !== undefined && FIELD_TO_STEP[err.field] !== step && (
                      <button
                        type="button"
                        onClick={() => setStep(FIELD_TO_STEP[err.field])}
                        className="ml-2 text-xs text-red-600 underline hover:text-red-800"
                      >
                        Aller à l'étape {FIELD_TO_STEP[err.field]}
                      </button>
                    )}
                  </li>
                ))}
              </ul>
            </div>
            <button
              type="button"
              onClick={() => setServerErrors([])}
              className="ml-2 text-red-500 hover:text-red-700"
            >
              ×
            </button>
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit(onSubmit)}>
        <div className="bg-white rounded-xl shadow-lg p-8">

          {/* ===================== STEP 0: Type d'événement ===================== */}
          {step === STEP_TYPE && (
            <div className="space-y-6">
              <h2 className="text-xl font-serif font-bold text-gray-900 mb-2 flex items-center">
                <SparklesIcon className="h-6 w-6 mr-2 text-primary-500" />
                Quel type d'événement organisez-vous ?
              </h2>
              <p className="text-gray-600">
                Le mariage propose un programme complet (mairie, église, réception). Les autres types restent simples : date, heure, lieu et message.
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {EVENT_TYPES_META.map((type) => {
                  const Icon = type.icon
                  const isSelected = eventType === type.id
                  return (
                    <label
                      key={type.id}
                      className={`cursor-pointer p-5 rounded-xl border-2 transition-all hover:shadow-md ${
                        isSelected ? 'border-primary-500 bg-primary-50 shadow-md ring-1 ring-primary-200' : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <input type="radio" value={type.id} className="hidden" {...register('eventType')} />
                      <div className={`w-12 h-12 rounded-full flex items-center justify-center mb-3 ${
                        isSelected ? 'bg-primary-600 text-white' : 'bg-gray-100 text-gray-500'
                      }`}>
                        <Icon className="h-6 w-6" />
                      </div>
                      <p className="font-semibold text-gray-900">{type.label}</p>
                      <p className="text-xs text-gray-500 mt-1">{type.desc}</p>
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

          {/* ===================== STEP INFO (Mariage): Mariés ===================== */}
          {step === STEP_INFO && isWedding && (
            <div className="space-y-6">
              <h2 className="text-xl font-serif font-bold text-gray-900 mb-6 flex items-center">
                <HeartIcon className="h-6 w-6 mr-2 text-primary-500" />
                Informations des mariés
              </h2>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="label">Prénom de la mariée *</label>
                  <input type="text" className={`input ${errors.brideName || getServerError('brideName') ? 'input-error' : ''}`} placeholder="Sophie" {...register('brideName', { required: 'Ce champ est requis' })} />
                  {(errors.brideName || getServerError('brideName')) && (
                    <p className="mt-1 text-sm text-red-600">{errors.brideName?.message || getServerError('brideName')?.message}</p>
                  )}
                </div>
                <div>
                  <label className="label">Prénom du marié *</label>
                  <input type="text" className={`input ${errors.groomName || getServerError('groomName') ? 'input-error' : ''}`} placeholder="Thomas" {...register('groomName', { required: 'Ce champ est requis' })} />
                  {(errors.groomName || getServerError('groomName')) && (
                    <p className="mt-1 text-sm text-red-600">{errors.groomName?.message || getServerError('groomName')?.message}</p>
                  )}
                </div>
              </div>

              <div>
                <label className="label">Date principale du mariage *</label>
                <input type="date" className={`input ${errors.weddingDate || getServerError('weddingDate') ? 'input-error' : ''}`} {...register('weddingDate', { required: 'Ce champ est requis' })} />
                {(errors.weddingDate || getServerError('weddingDate')) && (
                  <p className="mt-1 text-sm text-red-600">{errors.weddingDate?.message || getServerError('weddingDate')?.message}</p>
                )}
              </div>

              <div>
                <label className="label">Message personnalisé</label>
                <textarea className="input" rows={3} placeholder="Nous avons le plaisir de vous inviter à célébrer notre union..." {...register('customMessage')} />
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
                <div className="flex items-center gap-4">
                  <div className="w-24 h-24 rounded-xl overflow-hidden bg-gray-100 border flex items-center justify-center flex-shrink-0">
                    {couplePhotoPreview ? (
                      <img src={couplePhotoPreview} alt="Photo des mariés" className="w-full h-full object-cover" />
                    ) : (
                      <PhotoIcon className="h-8 w-8 text-gray-300" />
                    )}
                  </div>
                  <div>
                    <button type="button" onClick={() => photoInputRef.current?.click()} className="btn-secondary text-sm">
                      {couplePhotoPreview ? 'Changer la photo' : 'Ajouter une photo'}
                    </button>
                    <p className="text-xs text-gray-400 mt-1">JPG, PNG, WEBP (max 5 Mo)</p>
                  </div>
                  <input ref={photoInputRef} type="file" accept="image/*" onChange={handlePhotoChange} className="hidden" />
                </div>
              </div>

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
                  <textarea className="input" rows={2} placeholder="Parking disponible, allergies alimentaires à signaler..." {...register('additionalInfo')} />
                </div>
              </div>
            </div>
          )}

          {/* ===================== STEP INFO (simple): titre/date/heure/lieu ===================== */}
          {step === STEP_INFO && !isWedding && (
            <div className="space-y-6">
              <h2 className="text-xl font-serif font-bold text-gray-900 mb-2 flex items-center">
                <selectedEventMeta.icon className="h-6 w-6 mr-2 text-primary-500" />
                Informations de l'événement
              </h2>
              <p className="text-gray-600 mb-2">{selectedEventMeta.label} — date, heure, lieu et message suffisent.</p>

              <div>
                <label className="label">Titre / Nom de l'événement *</label>
                <input
                  type="text"
                  className={`input ${errors.eventTitle || getServerError('eventTitle') ? 'input-error' : ''}`}
                  placeholder={
                    eventType === 'BIRTHDAY' ? 'Anniversaire de Fatou' :
                    eventType === 'DOT' ? 'Dot de Awa & Moussa' :
                    eventType === 'CONFERENCE' ? 'Conférence Tech 2026' :
                    'Cérémonie de Jean'
                  }
                  {...register('eventTitle', { required: 'Ce champ est requis' })}
                />
                {(errors.eventTitle || getServerError('eventTitle')) && (
                  <p className="mt-1 text-sm text-red-600">{errors.eventTitle?.message || getServerError('eventTitle')?.message}</p>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="label">Date *</label>
                  <input type="date" className={`input ${errors.weddingDate || getServerError('weddingDate') ? 'input-error' : ''}`} {...register('weddingDate', { required: 'Ce champ est requis' })} />
                  {(errors.weddingDate || getServerError('weddingDate')) && (
                    <p className="mt-1 text-sm text-red-600">{errors.weddingDate?.message || getServerError('weddingDate')?.message}</p>
                  )}
                </div>
                <div>
                  <label className="label">Heure</label>
                  <input type="time" className="input" {...register('ceremonyTime')} />
                </div>
              </div>

              <div className="border-t pt-6 space-y-4">
                <h3 className="font-medium text-gray-900 flex items-center">
                  <MapPinIcon className="h-5 w-5 mr-2 text-primary-500" />
                  Lieu
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="label text-sm">Nom du lieu</label>
                    <input type="text" className="input" placeholder="Salle des fêtes, Hôtel..." {...register('venueName')} />
                  </div>
                  <div>
                    <label className="label text-sm">Ville</label>
                    <input type="text" className="input" placeholder="Dakar" {...register('venueCity')} />
                  </div>
                </div>
                <div>
                  <label className="label text-sm">Adresse</label>
                  <input type="text" className="input" placeholder="Adresse complète" {...register('venueAddress')} />
                </div>
              </div>

              <div className="border-t pt-6">
                <label className="label">Message personnalisé</label>
                <textarea className="input" rows={3} placeholder="Nous avons le plaisir de vous inviter..." {...register('customMessage')} />
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
                  <textarea className="input" rows={2} placeholder="Parking disponible, dress code..." {...register('additionalInfo')} />
                </div>
              </div>
            </div>
          )}

          {/* ===================== STEP PROGRAMME (Mariage uniquement) ===================== */}
          {step === STEP_PROGRAMME && isWedding && (
            <div className="space-y-8">
              <div>
                <h2 className="text-xl font-serif font-bold text-gray-900 mb-2 flex items-center">
                  <CalendarDaysIcon className="h-6 w-6 mr-2 text-primary-500" />
                  Programme du mariage
                </h2>
                <p className="text-gray-600">Définissez les différentes étapes de votre journée</p>
              </div>

              {/* Mairie */}
              <div className="bg-blue-50 rounded-xl p-6 border border-blue-200">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 bg-blue-500 rounded-full flex items-center justify-center">
                    <BuildingLibraryIcon className="h-5 w-5 text-white" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900">Mariage Civil (Mairie)</h3>
                    <p className="text-sm text-gray-600">Cérémonie à la commune</p>
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div><label className="label text-sm">Date</label><input type="date" className="input" {...register('communeDate')} /></div>
                  <div><label className="label text-sm">Heure</label><input type="time" className="input" {...register('communeTime')} /></div>
                  <div><label className="label text-sm">Nom de la mairie</label><input type="text" className="input" placeholder="Mairie de Paris 8ème" {...register('communeVenue')} /></div>
                  <div><label className="label text-sm">Adresse</label><input type="text" className="input" placeholder="3 Rue de Lisbonne, 75008 Paris" {...register('communeAddress')} /></div>
                </div>
              </div>

              {/* Église */}
              <div className="bg-purple-50 rounded-xl p-6 border border-purple-200">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 bg-purple-500 rounded-full flex items-center justify-center">
                    <ChurchIcon className="h-5 w-5 text-white" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900">Mariage Religieux (Église)</h3>
                    <p className="text-sm text-gray-600">Cérémonie religieuse</p>
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div><label className="label text-sm">Date</label><input type="date" className="input" {...register('egliseDate')} /></div>
                  <div><label className="label text-sm">Heure</label><input type="time" className="input" {...register('egliseTime')} /></div>
                  <div><label className="label text-sm">Nom de l'église</label><input type="text" className="input" placeholder="Église Saint-Augustin" {...register('egliseVenue')} /></div>
                  <div><label className="label text-sm">Adresse</label><input type="text" className="input" placeholder="46 Bd Malesherbes, 75008 Paris" {...register('egliseAddress')} /></div>
                </div>
              </div>

              {/* Réception */}
              <div className="bg-pink-50 rounded-xl p-6 border border-pink-200">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 bg-pink-500 rounded-full flex items-center justify-center">
                    <MusicalNoteIcon className="h-5 w-5 text-white" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900">Réception & Soirée Dansante</h3>
                    <p className="text-sm text-gray-600">Fête et célébration</p>
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div><label className="label text-sm">Date</label><input type="date" className="input" {...register('receptionDate')} /></div>
                  <div><label className="label text-sm">Heure de début</label><input type="time" className="input" {...register('receptionStartTime')} /></div>
                  <div><label className="label text-sm">Nom du lieu</label><input type="text" className="input" placeholder="Château de Versailles" {...register('receptionVenue')} /></div>
                  <div><label className="label text-sm">Adresse</label><input type="text" className="input" placeholder="Place d'Armes, 78000 Versailles" {...register('receptionAddress')} /></div>
                </div>
              </div>

              <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                <p className="text-sm text-amber-800">
                  <strong>💡 Astuce :</strong> Seules les étapes renseignées apparaîtront sur vos invitations.
                </p>
              </div>
            </div>
          )}

          {/* ===================== STEP DESIGN ===================== */}
          {step === STEP_DESIGN && (
            <div className="space-y-6">
              <h2 className="text-xl font-serif font-bold text-gray-900 mb-6 flex items-center">
                <SwatchIcon className="h-6 w-6 mr-2 text-primary-500" />
                Choix du template
              </h2>

              {/* Template Selection + Live Preview */}
              <div>
                <h3 className="font-medium text-gray-900 mb-3">Choisir un template</h3>
                {templates.length === 0 && myTemplates.length === 0 ? (
                  <div className="text-center py-6 bg-gray-50 rounded-xl">
                    <HeartIcon className="h-10 w-10 text-gray-300 mx-auto mb-2" />
                    <p className="text-gray-500 text-sm">
                      Aucun template disponible pour le type « {selectedEventMeta.label} » pour le moment
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
                                watch('templateId') === tmpl.id ? 'border-primary-600 ring-2 ring-primary-200 shadow-md' : 'border-primary-100 hover:border-primary-300 hover:shadow-sm'
                              }`}>
                                <input type="radio" value={tmpl.id} className="hidden" {...register('templateId')} />
                                <div className="aspect-[3/4] bg-gradient-wedding flex items-center justify-center relative">
                                  <TemplatePreview template={tmpl} weddingData={{ brideName: watch('brideName'), groomName: watch('groomName'), weddingDate: watch('weddingDate'), communeTime: watch('communeTime'), egliseTime: watch('egliseTime'), receptionStartTime: watch('receptionStartTime'), communeVenue: watch('communeVenue'), egliseVenue: watch('egliseVenue'), receptionVenue: watch('receptionVenue') }} />
                                  {watch('templateId') === tmpl.id && (
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
                            watch('templateId') === tmpl.id ? 'border-primary-600 ring-2 ring-primary-200 shadow-md' : 'border-gray-200 hover:border-gray-300 hover:shadow-sm'
                          }`}>
                            <input type="radio" value={tmpl.id} className="hidden" {...register('templateId')} />
                            <div className="aspect-[3/4] bg-gradient-wedding flex items-center justify-center relative">
                              <TemplatePreview template={tmpl} weddingData={{ brideName: watch('brideName'), groomName: watch('groomName'), weddingDate: watch('weddingDate'), communeTime: watch('communeTime'), egliseTime: watch('egliseTime'), receptionStartTime: watch('receptionStartTime'), communeVenue: watch('communeVenue'), egliseVenue: watch('egliseVenue'), receptionVenue: watch('receptionVenue') }} />
                              {watch('templateId') === tmpl.id && (
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
                    <div className="w-56 flex-shrink-0">
                      <div className="sticky top-4">
                        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2 flex items-center gap-1">
                          <EyeIcon className="h-3.5 w-3.5" /> Aperçu en direct
                        </p>
                        {watch('templateId') ? (
                          (() => {
                            const selectedTmpl = [...myTemplates, ...templates].find(t => t.id === watch('templateId'))
                            return selectedTmpl ? (
                              <div className="rounded-xl border-2 border-primary-200 overflow-hidden shadow-lg">
                                <div className="aspect-[3/4] relative bg-gray-50">
                                  <TemplatePreview
                                    template={selectedTmpl}
                                    weddingData={{
                                      brideName: watch('brideName') || 'Mariée',
                                      groomName: watch('groomName') || 'Marié',
                                      weddingDate: watch('weddingDate'),
                                      communeTime: watch('communeTime'),
                                      communeVenue: watch('communeVenue'),
                                      egliseTime: watch('egliseTime'),
                                      egliseVenue: watch('egliseVenue'),
                                      receptionStartTime: watch('receptionStartTime'),
                                      receptionVenue: watch('receptionVenue'),
                                      receptionDate: watch('receptionDate')
                                    }}
                                  />
                                </div>
                                <div className="p-2 bg-primary-50 border-t border-primary-200">
                                  <p className="text-xs font-semibold text-primary-700 truncate">{selectedTmpl.name}</p>
                                  <p className="text-[10px] text-primary-500 mt-0.5">
                                    {isWedding ? `${(watch('brideName') || 'Mariée')} & ${(watch('groomName') || 'Marié')}` : (watch('eventTitle') || selectedEventMeta.label)}
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
          )}

          {/* ===================== STEP QR CODE ===================== */}
          {step === STEP_QR && (
            <div className="space-y-6">
              <h2 className="text-xl font-serif font-bold text-gray-900 mb-6 flex items-center">
                <QrCodeIcon className="h-6 w-6 mr-2 text-primary-500" />
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
                  <div className={`p-8 rounded-2xl border-2 border-gray-200 inline-block ${watch('qrCodeTransparentBg') ? '' : ''}`}
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
          )}

          {/* ===================== STEP PRINT ===================== */}
          {step === STEP_PRINT && (
            <div className="space-y-6">
              <h2 className="text-xl font-serif font-bold text-gray-900 mb-2 flex items-center">
                <PrinterIcon className="h-6 w-6 mr-2 text-primary-500" />
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
          )}

          {/* Navigation */}
          <div className="flex items-center justify-between mt-8 pt-6 border-t">
            {step > STEP_TYPE ? (
              <button type="button" onClick={() => setStep(step - 1)} className="btn-secondary">Précédent</button>
            ) : <div />}

            {step < totalSteps ? (
              <button type="button" onClick={() => setStep(step + 1)} className="btn-primary">Suivant</button>
            ) : (
              <button type="submit" disabled={createMutation.isLoading} className="btn-primary">
                {createMutation.isLoading ? (
                  <span className="flex items-center">
                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    Création...
                  </span>
                ) : 'Créer l\'événement'}
              </button>
            )}
          </div>
        </div>
      </form>
    </div>
  )
}
