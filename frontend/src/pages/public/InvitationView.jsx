import { useState } from 'react'
import { useParams } from 'react-router-dom'
import { useQuery, useMutation } from 'react-query'
import { publicAPI } from '../../services/api'
import { motion } from 'framer-motion'
import toast from 'react-hot-toast'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'
import { getClipPath } from '../../utils/imageShapes'
// Format date: JJ-MM-YYYY HH:mm
import {
  CalendarIcon,
  MapPinIcon,
  ClockIcon,
  HeartIcon,
  CheckCircleIcon,
  XCircleIcon,
  QuestionMarkCircleIcon,
  BuildingLibraryIcon,
  MusicalNoteIcon,
  QrCodeIcon,
  LinkIcon,
  GlobeAltIcon
} from '@heroicons/react/24/outline'

const ChurchIcon = ({ className }) => (
  <svg className={className} fill="currentColor" viewBox="0 0 24 24">
    <path d="M18 12.22V9l-5-2.5V5h1V3h-1V1h-2v2h-1v2h1v1.5L6 9v3.22l-2 1V22h8v-3c0-1.1.9-2 2-2s2 .9 2 2v3h8v-8.78l-2-1zM12 13.5c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2z" />
  </svg>
)

export default function InvitationView() {
  const { weddingSlug, invitationCode } = useParams()
  const [rsvpStatus, setRsvpStatus] = useState(null)
  const [numberOfGuests, setNumberOfGuests] = useState(1)
  const [showRsvpForm, setShowRsvpForm] = useState(false)

  // Fetch full invitation when both slug and code are present
  const { data: invitationData, isLoading: isLoadingInvitation, error: invitationError } = useQuery(
    ['invitation', weddingSlug, invitationCode],
    () => publicAPI.getInvitation(weddingSlug, invitationCode),
    { enabled: !!weddingSlug && !!invitationCode }
  )

  // Fetch wedding info only when no invitation code (public link)
  const { data: weddingData, isLoading: isLoadingWedding, error: weddingError } = useQuery(
    ['wedding-public', weddingSlug],
    () => publicAPI.getWeddingInfo(weddingSlug),
    { enabled: !!weddingSlug && !invitationCode }
  )

  const isLoading = isLoadingInvitation || isLoadingWedding
  const error = invitationError || weddingError

  const invitationResponse = invitationData?.data?.invitation
  const wedding = invitationResponse?.wedding || weddingData?.data?.wedding
  const guest = invitationResponse?.guest
  const template = invitationResponse?.template  // Template is at top level of invitation response
  const invitationInfo = invitationResponse?.invitation  // QR code, uniqueCode, etc.

  // Wedding gets the bride & groom name treatment; everything else uses
  // a single generic event title.
  const isWedding = !wedding?.eventType || wedding.eventType === 'WEDDING'
  const EVENT_TYPE_LABELS = { WEDDING: 'Mariage', BIRTHDAY: 'Anniversaire', DOT: 'Dot', CEREMONY: 'Cérémonie', CONFERENCE: 'Conférence', OTHER: 'Événement' }
  const EVENT_INTRO_LABELS = {
    WEDDING: 'Invitation au mariage de',
    BIRTHDAY: 'Invitation à l\'anniversaire de',
    DOT: 'Invitation à la dot de',
    CEREMONY: 'Invitation à la cérémonie de',
    CONFERENCE: 'Vous êtes invité(e) à',
    OTHER: 'Vous êtes invité(e) à'
  }
  const eventTypeLabel = EVENT_TYPE_LABELS[wedding?.eventType] || 'Mariage'
  const eventIntroLabel = EVENT_INTRO_LABELS[wedding?.eventType] || EVENT_INTRO_LABELS.WEDDING
  const eventDisplayTitle = isWedding
    ? `${wedding?.brideName || ''} & ${wedding?.groomName || ''}`
    : (wedding?.eventTitle || eventTypeLabel)

  // Extract template colors with fallbacks
  const getTemplateColors = () => {
    const config = template?.config || {}
    let colorScheme = template?.colorScheme || {}
    if (typeof colorScheme === 'string') {
      try { colorScheme = JSON.parse(colorScheme) }
      catch { colorScheme = {} }
    }
    return { ...colorScheme, ...(config.colors || {}) }
  }
  
  const templateColors = getTemplateColors()
  const templateFonts = template?.config?.fonts || {}
  const programConfig = template?.config?.program || {}
  const communeColor = programConfig.communeColor || '#3B82F6'
  const egliseColor = programConfig.egliseColor || '#8B5CF6'
  const receptionColor = programConfig.receptionColor || '#EC4899'

  // Helper: convert hex to rgba for light backgrounds
  const hexToRgba = (hex, alpha) => {
    const r = parseInt(hex.slice(1, 3), 16)
    const g = parseInt(hex.slice(3, 5), 16)
    const b = parseInt(hex.slice(5, 7), 16)
    return `rgba(${r},${g},${b},${alpha})`
  }

  const rsvpMutation = useMutation(
    (data) => publicAPI.submitRSVP(weddingSlug, invitationCode, data),
    {
      onSuccess: () => { toast.success('Votre réponse a été enregistrée !'); setShowRsvpForm(false) },
      onError: (err) => { toast.error(err.response?.data?.message || 'Erreur lors de l\'envoi') }
    }
  )

  const handleRSVPSubmit = () => {
    if (!rsvpStatus) return toast.error('Veuillez sélectionner une réponse')
    rsvpMutation.mutate({
      response: rsvpStatus,
      plusOnes: rsvpStatus === 'CONFIRMED' ? numberOfGuests : 0
    })
  }

  const formatDate = (date) => {
    if (!date) return null
    try { return format(new Date(date), 'd MMMM yyyy', { locale: fr }) }
    catch { return null }
  }

  const hasCommune = wedding?.communeDate || wedding?.communeVenue
  const hasEglise = wedding?.egliseDate || wedding?.egliseVenue
  const hasReception = wedding?.receptionDate || wedding?.receptionVenue
  const hasProgram = hasCommune || hasEglise || hasReception

  // Smart date logic: if all existing ceremony dates are the same, show a single date header
  const getUnifiedDate = () => {
    if (!wedding) return null
    const dates = [
      wedding.communeDate,
      wedding.egliseDate,
      wedding.receptionDate
    ].filter(Boolean).map(d => new Date(d).toDateString())
    const uniqueDates = [...new Set(dates)]
    if (uniqueDates.length === 1) return wedding.communeDate || wedding.egliseDate || wedding.receptionDate
    return null
  }
  const unifiedDate = getUnifiedDate()

  // Build background style from wedding settings
  const getBackgroundStyle = () => {
    if (!wedding) return {}
    const opacity = (wedding.backgroundOpacity || 100) / 100
    if (wedding.backgroundType === 'image' && wedding.backgroundImage) {
      return {
        backgroundImage: `url(${wedding.backgroundImage})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat'
      }
    }
    if (wedding.backgroundType === 'gradient' && wedding.backgroundGradient) {
      return { background: wedding.backgroundGradient }
    }
    return {}
  }

  const bgStyle = getBackgroundStyle()
  const hasCustomBg = wedding?.backgroundType !== 'color' && (wedding?.backgroundImage || wedding?.backgroundGradient)
  const socialLinks = wedding?.socialLinks || {}

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-rose-50 to-gold-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-primary-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Chargement de votre invitation...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-rose-50 to-gold-50">
        <div className="text-center bg-white rounded-2xl shadow-xl p-12 max-w-md">
          <XCircleIcon className="h-16 w-16 text-red-500 mx-auto mb-4" />
          <h1 className="text-2xl font-serif font-bold text-gray-900 mb-2">Invitation introuvable</h1>
          <p className="text-gray-600">Cette invitation n'existe pas ou a expiré.</p>
        </div>
      </div>
    )
  }

  // Public wedding landing page (no invitation code)
  if (!invitationCode && wedding && !invitationResponse) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-rose-50 via-white to-gold-50 p-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="bg-white rounded-2xl shadow-2xl overflow-hidden max-w-lg w-full"
        >
          {wedding.coverPhoto && (
            <div className="h-48 overflow-hidden">
              <img src={wedding.coverPhoto} alt="Cover" className="w-full h-full object-cover" />
            </div>
          )}
          {!wedding.coverPhoto && (
            <div className="h-48 bg-gradient-to-r from-rose-400 to-pink-500 flex items-center justify-center">
              <HeartIcon className="h-16 w-16 text-white/60" />
            </div>
          )}
          <div className="px-8 py-10 text-center">
            <p className="text-sm font-medium uppercase tracking-widest text-rose-500 mb-3">{eventTypeLabel}</p>
            {isWedding ? (
              <>
                <h1 className="text-4xl font-serif font-bold text-gray-900">{wedding.brideName}</h1>
                <p className="text-2xl font-serif text-rose-400 my-1">&</p>
                <h1 className="text-4xl font-serif font-bold text-gray-900">{wedding.groomName}</h1>
              </>
            ) : (
              <h1 className="text-4xl font-serif font-bold text-gray-900">{wedding.eventTitle}</h1>
            )}
            {wedding.weddingDate && (
              <div className="mt-6 flex items-center justify-center gap-2 text-gray-600">
                <CalendarIcon className="h-5 w-5 text-rose-500" />
                <span className="text-lg">{formatDate(wedding.weddingDate)}</span>
              </div>
            )}
            {wedding.venueName && (
              <div className="mt-2 flex items-center justify-center gap-2 text-gray-600">
                <MapPinIcon className="h-5 w-5 text-rose-500" />
                <span>{wedding.venueName}{wedding.venueCity ? `, ${wedding.venueCity}` : ''}</span>
              </div>
            )}
            <div className="mt-8 p-4 bg-rose-50 rounded-lg">
              <p className="text-gray-600 text-sm">
                Pour voir votre invitation personnelle, utilisez le lien unique qui vous a été envoyé.
              </p>
            </div>
          </div>
        </motion.div>
        <div className="text-center mt-5 text-gray-400 text-sm absolute bottom-4">
          <p>Créé avec ❤️ sur WeddingInvite Pro</p>
        </div>
      </div>
    )
  }

  if (!invitationResponse) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-rose-50 to-gold-50">
        <div className="text-center bg-white rounded-2xl shadow-xl p-12 max-w-md">
          <XCircleIcon className="h-16 w-16 text-red-500 mx-auto mb-4" />
          <h1 className="text-2xl font-serif font-bold text-gray-900 mb-2">Invitation introuvable</h1>
          <p className="text-gray-600">Cette invitation n'existe pas ou a expiré.</p>
        </div>
      </div>
    )
  }

  // Colors: Wedding custom > Template config > Wedding default > Fallback
  const primaryColor = wedding?.primaryColor || templateColors.primary || '#df6746'
  const secondaryColor = wedding?.secondaryColor || templateColors.secondary || '#f2b5a3'
  const backgroundColor = wedding?.bgColor || templateColors.background || '#ffffff'
  const textColor = wedding?.textColor || templateColors.text || '#1f2937'
  
  // Fonts from template
  const headingFont = templateFonts.heading || 'Playfair Display, serif'
  const bodyFont = templateFonts.body || 'Inter, sans-serif'

  // Check if template uses design-based layout (visual designer with absolute positioned elements)
  const templateConfig = template?.config || {}
  const designElements = templateConfig.designElements || []
  const hasDesignElements = designElements.length > 0

  // Canvas dimensions from template
  const canvasWidth = templateConfig.canvasWidth || template?.canvasWidth || 800
  const canvasHeight = templateConfig.canvasHeight || template?.canvasHeight || 1120
  const margins = templateConfig.margins || { top: 0, right: 0, bottom: 0, left: 0 }

  // Background for design-based templates
  const designBgImage = templateConfig.backgroundImage || template?.backgroundUrl || ''
  const designBgOpacity = (templateConfig.backgroundOpacity || template?.backgroundOpacity || 100) / 100

  // Build replacement data map for design elements
  const buildDataMap = () => {
    const formatDateSimple = (dateStr) => {
      if (!dateStr) return '';
      let d = typeof dateStr === 'string' && dateStr.includes('T') ? new Date(dateStr) : new Date((dateStr || '').replace(' ', 'T'));
      if (isNaN(d.getTime())) return dateStr;
      const pad = n => n.toString().padStart(2, '0');
      return `${pad(d.getDate())}-${pad(d.getMonth() + 1)}-${d.getFullYear()} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
    }
    return {
      bride_name: wedding?.brideName || '',
      groom_name: wedding?.groomName || '',
      event_title: eventDisplayTitle,
      event_type: eventTypeLabel,
      guest_name: guest ? `${guest.firstName} ${guest.lastName}` : '',
      invitation_type: guest ? (guest.plusOnes > 0 ? 'Couple' : 'Singleton') : '',
      custom_message: wedding?.customMessage || '',
      wedding_date: formatDateSimple(wedding?.weddingDate),
      ceremony_time: wedding?.ceremonyTime || wedding?.communeTime || '',
      venue_name: wedding?.venueName || wedding?.receptionVenue || '',
      venue_address: wedding?.venueAddress || wedding?.receptionAddress || '',
      table_number: guest?.tableNumber || '',
      rsvp_date: wedding?.rsvpDeadline ? formatDateSimple(wedding.rsvpDeadline) : '',
      // Programme — Commune
      commune_date: formatDateSimple(wedding?.communeDate),
      commune_time: wedding?.communeTime || '',
      commune_venue: wedding?.communeVenue || '',
      commune_address: wedding?.communeAddress || '',
      // Programme — Église
      eglise_date: formatDateSimple(wedding?.egliseDate),
      eglise_time: wedding?.egliseTime || '',
      eglise_venue: wedding?.egliseVenue || '',
      eglise_address: wedding?.egliseAddress || '',
      // Programme — Réception
      reception_date: formatDateSimple(wedding?.receptionDate),
      reception_time: wedding?.receptionStartTime || '',
      reception_venue: wedding?.receptionVenue || '',
      reception_address: wedding?.receptionAddress || '',
      // Combined program (legacy)
      program: [
        wedding?.communeVenue ? `Mairie ${wedding.communeTime || ''}` : '',
        wedding?.egliseVenue ? `Église ${wedding.egliseTime || ''}` : '',
        wedding?.receptionVenue ? `Réception ${wedding.receptionStartTime || ''}` : ''
      ].filter(Boolean).join(' • ')
    }
  }

  const dataMap = hasDesignElements ? buildDataMap() : {}

  // Render design-based template
  if (hasDesignElements) {
    const mTop = margins.top || 0
    const mLeft = margins.left || 0

    return (
      <div className="min-h-screen flex flex-col items-center justify-start bg-gray-100 py-6" style={{ fontFamily: bodyFont }}>
        {/* Google Fonts */}
        <link href="https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;600;700&family=Inter:wght@300;400;500;600&family=Great+Vibes&family=Cormorant+Garamond:wght@400;500;600;700&family=Lora:wght@400;500;600;700&family=Dancing+Script:wght@400;500;600;700&family=Tangerine:wght@400;700&family=Montserrat:wght@300;400;500;600;700&family=Poppins:wght@300;400;500;600;700&family=Raleway:wght@300;400;500;600;700&family=Roboto:wght@300;400;500;700&family=Open+Sans:wght@300;400;500;600;700&family=Merriweather:wght@300;400;700;900&family=Satisfy&family=Pacifico&family=Alex+Brush&family=Sacramento&display=swap" rel="stylesheet" />

        {/* Canvas container - matches template dimensions */}
        <div
          className="relative shadow-2xl overflow-hidden bg-white"
          style={{
            width: canvasWidth,
            height: canvasHeight,
            maxWidth: '100vw',
          }}
        >
          {/* Background image */}
          {designBgImage && (
            <img
              src={designBgImage}
              alt=""
              className="absolute inset-0 w-full h-full"
              style={{ objectFit: 'fill', opacity: designBgOpacity }}
            />
          )}

          {/* Design elements - absolutely positioned */}
          {designElements
            .filter(el => el.visible !== false)
            .map((el, idx) => {
              let content = el.content || ''
              // Replace template variables
              Object.entries(dataMap).forEach(([key, val]) => {
                content = content.replace(new RegExp(`\\{\\{${key}\\}\\}`, 'g'), val)
              })

              const elZIndex = el.zIndex ?? (10 + idx)
              const elLeft = el.x + mLeft
              const elTop = el.y + mTop

              // QR code element
              if (el.type === 'qrcode' && invitationInfo?.qrCodeData) {
                return (
                  <div
                    key={el.id || idx}
                    className="absolute flex items-center justify-center"
                    style={{
                      left: elLeft, top: elTop,
                      width: el.width, height: el.height,
                      zIndex: elZIndex
                    }}
                  >
                    <img
                      src={invitationInfo.qrCodeData}
                      alt="QR Code"
                      className="max-w-full max-h-full object-contain"
                    />
                  </div>
                )
              }

              // Photo element (ex: photo des mariés)
              if (el.type === 'photo') {
                const photoBorderColor = hexToRgba(el.borderColor || '#FFFFFF', (el.borderOpacity ?? 100) / 100)
                return (
                  <div
                    key={el.id || idx}
                    className="absolute overflow-hidden"
                    style={{
                      left: elLeft, top: elTop,
                      width: el.width, height: el.height,
                      zIndex: elZIndex,
                      boxSizing: 'border-box',
                      border: el.borderWidth ? `${el.borderWidth}px solid ${photoBorderColor}` : 'none',
                      borderRadius: el.borderRadius || 0,
                      background: '#f3f4f6'
                    }}
                  >
                    {wedding?.couplePhoto && (
                      <img
                        src={wedding.couplePhoto}
                        alt="Photo des mariés"
                        className="w-full h-full"
                        style={{ objectFit: el.objectFit || 'cover' }}
                      />
                    )}
                  </div>
                )
              }

              // Text element
              // Fallbacks for textShadow and shadowColor for old templates
              let textShadow = (typeof el.textShadow === 'string') ? el.textShadow : 'none';
              const shadowColor = (typeof el.shadowColor === 'string') ? el.shadowColor : '#000000';
              // Map friendly values to real CSS for visibility
              if (textShadow === '1px 1px 2px') textShadow = '2px 2px 4px'; // Douce → plus visible
              if (textShadow === '2px 2px 4px') textShadow = '3px 3px 8px'; // Moyenne → plus visible
              if (textShadow === '3px 3px 6px') textShadow = '4px 4px 12px'; // Forte → plus visible
              return (
                <div
                  key={el.id || idx}
                  className="absolute overflow-hidden break-words"
                  style={{
                    left: elLeft, top: elTop,
                    width: el.width, height: el.height,
                    zIndex: elZIndex,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: el.textAlign === 'center' ? 'center' : el.textAlign === 'right' ? 'flex-end' : 'flex-start',
                    fontFamily: `'${el.fontFamily}', serif`,
                    fontSize: el.fontSize,
                    fontWeight: el.fontWeight || 'normal',
                    fontStyle: el.fontStyle || 'normal',
                    color: el.color || '#000',
                    textAlign: el.textAlign || 'center',
                    letterSpacing: el.letterSpacing || 0,
                    textTransform: el.textTransform || 'none',
                    textShadow: textShadow !== 'none' ? `${textShadow} ${shadowColor}` : 'none',
                  }}
                >
                  <span className="w-full">{content}</span>
                </div>
              )
            })}
        </div>

        {/* RSVP section below the design canvas */}
        <div className="w-full max-w-lg mx-auto mt-6 px-4">
          {/* RSVP */}
          {!showRsvpForm ? (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.6 }} className="text-center">
              {guest?.rsvpStatus === 'PENDING' ? (
                <button onClick={() => setShowRsvpForm(true)} className="text-lg px-10 py-3 rounded-lg font-semibold text-white shadow-lg transition-transform hover:scale-105" style={{ backgroundColor: primaryColor }}>
                  Confirmer ma présence
                </button>
              ) : (
                <div className={`inline-flex items-center px-6 py-3 rounded-full text-lg ${
                  guest?.rsvpStatus === 'CONFIRMED' ? 'bg-green-100 text-green-700' :
                  guest?.rsvpStatus === 'DECLINED' ? 'bg-red-100 text-red-700' :
                  'bg-yellow-100 text-yellow-700'
                }`}>
                  {guest?.rsvpStatus === 'CONFIRMED' && <><CheckCircleIcon className="h-5 w-5 mr-2" />Présence confirmée</>}
                  {guest?.rsvpStatus === 'DECLINED' && <><XCircleIcon className="h-5 w-5 mr-2" />Absence confirmée</>}
                  {guest?.rsvpStatus === 'MAYBE' && <><QuestionMarkCircleIcon className="h-5 w-5 mr-2" />Peut-être</>}
                </div>
              )}
            </motion.div>
          ) : (
            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="bg-white rounded-xl shadow-lg p-6">
              <h3 className="text-lg font-bold mb-3" style={{ fontFamily: headingFont, color: textColor }}>Confirmez votre présence</h3>
              <div className="grid grid-cols-3 gap-2 mb-4">
                {[
                  { key: 'CONFIRMED', label: 'Je serai présent', Icon: CheckCircleIcon, bgColor: '#10b981', bgLight: '#f0fdf4' },
                  { key: 'MAYBE', label: 'Peut-être', Icon: QuestionMarkCircleIcon, bgColor: '#eab308', bgLight: '#fefce8' },
                  { key: 'DECLINED', label: 'Je ne pourrai pas', Icon: XCircleIcon, bgColor: '#ef4444', bgLight: '#fef2f2' }
                ].map(({ key, label, Icon, bgColor, bgLight }) => (
                  <button key={key} onClick={() => setRsvpStatus(key)}
                    className="p-3 rounded-lg border-2 transition-all"
                    style={{
                      borderColor: rsvpStatus === key ? bgColor : '#e5e7eb',
                      backgroundColor: rsvpStatus === key ? bgLight : 'transparent'
                    }}>
                    <Icon className="h-5 w-5 mx-auto mb-1" style={{
                      color: rsvpStatus === key ? bgColor : '#9ca3af'
                    }} />
                    <p className="text-xs font-medium">{label}</p>
                  </button>
                ))}
              </div>
              {rsvpStatus === 'CONFIRMED' && (
                <div className="mb-3">
                  <label className="block text-xs font-medium text-gray-700 mb-1">Nombre de personnes</label>
                  <div className="flex items-center justify-center gap-3">
                    <button onClick={() => setNumberOfGuests(Math.max(1, numberOfGuests - 1))} className="h-8 w-8 rounded-full bg-gray-200 hover:bg-gray-300 flex items-center justify-center">-</button>
                    <span className="text-lg font-bold text-gray-900 w-8 text-center">{numberOfGuests}</span>
                    <button onClick={() => setNumberOfGuests(Math.min(10, numberOfGuests + 1))} className="h-8 w-8 rounded-full bg-gray-200 hover:bg-gray-300 flex items-center justify-center">+</button>
                  </div>
                </div>
              )}
              <div className="flex gap-3">
                <button onClick={() => setShowRsvpForm(false)} className="flex-1 btn-secondary">Annuler</button>
                <button onClick={handleRSVPSubmit} disabled={!rsvpStatus || rsvpMutation.isLoading}
                  className="flex-1 text-white rounded-lg py-2 font-medium" style={{ backgroundColor: primaryColor }}>
                  {rsvpMutation.isLoading ? 'Envoi...' : 'Confirmer'}
                </button>
              </div>
            </motion.div>
          )}

          <div className="text-center mt-4 text-gray-400 text-sm">
            <p>Créé avec ❤️ sur WeddingInvite Pro</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div
      className="min-h-screen relative"
      style={{ 
        ...(hasCustomBg ? bgStyle : {}),
        fontFamily: bodyFont
      }}
    >
      {/* Default gradient BG if no custom */}
      {!hasCustomBg && (
        <div className="absolute inset-0 bg-gradient-to-br from-rose-50 via-white to-gold-50" />
      )}

      {/* Overlay for custom backgrounds */}
      {hasCustomBg && (
        <div
          className="absolute inset-0 bg-white"
          style={{ opacity: 1 - (wedding.backgroundOpacity || 100) / 100 }}
        />
      )}

      {/* Decorative elements */}
      <div className="absolute top-0 left-0 w-64 h-64 rounded-full -translate-x-1/2 -translate-y-1/2 opacity-30" style={{ backgroundColor: primaryColor }} />
      <div className="absolute bottom-0 right-0 w-96 h-96 rounded-full translate-x-1/2 translate-y-1/2 opacity-30" style={{ backgroundColor: secondaryColor }} />

      <div className="relative max-w-3xl mx-auto px-5 py-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="backdrop-blur-sm rounded-2xl shadow-2xl overflow-hidden"
          style={{ backgroundColor: `${backgroundColor}e6` }}
        >
          {/* Header with gradient or cover */}
          <div
            className="relative h-52"
            style={{ background: `linear-gradient(135deg, ${primaryColor}, ${secondaryColor})` }}
          >
            {wedding?.couplePhoto && (
              <img src={wedding.couplePhoto} alt="Couple" className="w-full h-full object-cover" />
            )}
            {!wedding?.couplePhoto && wedding?.coverPhoto && (
              <img src={wedding.coverPhoto} alt="Cover" className="w-full h-full object-cover" />
            )}
            <div className="absolute inset-0 bg-black/20" />
            <div className="absolute inset-0 flex items-center justify-center">
              <HeartIcon className="h-12 w-12 text-white/50" />
            </div>
            {/* Event Theme Badge */}
            {wedding?.eventTheme && (
              <div className="absolute top-2 right-2 bg-white/80 backdrop-blur-sm px-2 py-0.5 rounded-full text-sm font-medium text-gray-800">
                ✨ {wedding.eventTheme}
              </div>
            )}
          </div>

          {/* Content */}
          <div className="px-10 py-8 lg:px-14 lg:py-10 text-center">
            {/* Names */}
            <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.6, delay: 0.2 }}>
              <p className="text-lg font-medium uppercase tracking-widest mb-4" style={{ color: primaryColor }}>
                {eventIntroLabel}
              </p>
              {isWedding ? (
                <>
                  <h1 className="text-5xl lg:text-6xl font-bold" style={{ fontFamily: headingFont, color: textColor }}>{wedding?.brideName}</h1>
                  <p className="text-3xl my-1" style={{ fontFamily: headingFont, color: secondaryColor }}>&</p>
                  <h1 className="text-5xl lg:text-6xl font-bold" style={{ fontFamily: headingFont, color: textColor }}>{wedding?.groomName}</h1>
                </>
              ) : (
                <h1 className="text-5xl lg:text-6xl font-bold" style={{ fontFamily: headingFont, color: textColor }}>{eventDisplayTitle}</h1>
              )}
            </motion.div>

            {/* Divider */}
            <div className="my-5 flex items-center justify-center">
              <div className="w-20 h-px" style={{ backgroundColor: secondaryColor }} />
              <HeartIcon className="h-6 w-6 mx-5" style={{ color: primaryColor }} />
              <div className="w-20 h-px" style={{ backgroundColor: secondaryColor }} />
            </div>

            {/* Guest Name */}
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.6, delay: 0.4 }} className="mb-6">
              <p className="text-xl text-gray-600">Cher(e)</p>
              <p className="text-3xl font-bold" style={{ fontFamily: headingFont, color: primaryColor }}>
                {guest?.firstName} {guest?.lastName}
              </p>
              <p className="text-xl text-gray-600 mt-2">
                {isWedding ? 'Vous êtes cordialement invité(e) à célébrer notre union' : `Vous êtes cordialement invité(e) à : ${eventDisplayTitle}`}
              </p>
            </motion.div>

            {/* Custom Message */}
            {wedding?.customMessage && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.6, delay: 0.5 }}
                className="mb-5 italic text-xl text-gray-600 bg-gray-50 rounded-lg p-5"
              >
                <p>"{wedding.customMessage}"</p>
              </motion.div>
            )}

            {/* Dress Code */}
            {wedding?.dressCode && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.6, delay: 0.55 }}
                className="mb-3 inline-flex items-center px-3 py-1 bg-amber-50 border border-amber-200 rounded-full"
              >
                <span className="text-xl mr-2">👔</span>
                <span className="text-lg font-medium text-amber-800">Code vestimentaire : {wedding.dressCode}</span>
              </motion.div>
            )}

            {/* Programme du mariage */}
            {hasProgram && (
              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.6 }} className="mb-6">
                <h3 className="text-xl font-bold mb-3" style={{ fontFamily: headingFont, color: textColor }}>Programme de la célébration</h3>
                {/* Unified date header when all ceremonies share the same date */}
                {unifiedDate && (
                  <div className="flex items-center justify-center gap-2 mb-4 text-gray-700">
                    <CalendarIcon className="h-6 w-6" style={{ color: primaryColor }} />
                    <span className="text-xl font-semibold">{formatDate(unifiedDate)}</span>
                  </div>
                )}
                {!unifiedDate && <div className="mb-3" />}
                <div className="space-y-2">
                  {hasCommune && (
                    <div className="rounded-xl p-5 text-left border" style={{ backgroundColor: hexToRgba(communeColor, 0.08), borderColor: hexToRgba(communeColor, 0.15) }}>
                      <div className="flex items-start gap-4">
                        <div className="w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0" style={{ backgroundColor: communeColor }}>
                          <BuildingLibraryIcon className="h-6 w-6 text-white" />
                        </div>
                        <div className="flex-1">
                          <h4 className="font-semibold text-xl text-gray-900">Mariage Civil</h4>
                          <p className="text-lg font-medium" style={{ color: communeColor }}>Mairie</p>
                          <div className="mt-2 space-y-2 text-lg">
                            {!unifiedDate && wedding.communeDate && (
                              <div className="flex items-center text-gray-700">
                                <CalendarIcon className="h-5 w-5 mr-2" style={{ color: communeColor }} />
                                {formatDate(wedding.communeDate)}
                              </div>
                            )}
                            {wedding.communeTime && (
                              <div className="flex items-center text-gray-700">
                                <ClockIcon className="h-5 w-5 mr-2" style={{ color: communeColor }} />
                                {wedding.communeTime}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {hasEglise && (
                    <div className="rounded-xl p-5 text-left border" style={{ backgroundColor: hexToRgba(egliseColor, 0.08), borderColor: hexToRgba(egliseColor, 0.15) }}>
                      <div className="flex items-start gap-4">
                        <div className="w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0" style={{ backgroundColor: egliseColor }}>
                          <ChurchIcon className="h-6 w-6 text-white" />
                        </div>
                        <div className="flex-1">
                          <h4 className="font-semibold text-xl text-gray-900">Mariage Religieux</h4>
                          <p className="text-lg font-medium" style={{ color: egliseColor }}>Église</p>
                          <div className="mt-2 space-y-2 text-lg">
                            {!unifiedDate && wedding.egliseDate && (
                              <div className="flex items-center text-gray-700">
                                <CalendarIcon className="h-5 w-5 mr-2" style={{ color: egliseColor }} />
                                {formatDate(wedding.egliseDate)}
                              </div>
                            )}
                            {wedding.egliseTime && (
                              <div className="flex items-center text-gray-700">
                                <ClockIcon className="h-5 w-5 mr-2" style={{ color: egliseColor }} />
                                {wedding.egliseTime}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {hasReception && (
                    <div className="rounded-xl p-5 text-left border" style={{ backgroundColor: hexToRgba(receptionColor, 0.08), borderColor: hexToRgba(receptionColor, 0.15) }}>
                      <div className="flex items-start gap-4">
                        <div className="w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0" style={{ backgroundColor: receptionColor }}>
                          <MusicalNoteIcon className="h-6 w-6 text-white" />
                        </div>
                        <div className="flex-1">
                          <h4 className="font-semibold text-xl text-gray-900">Réception & Soirée Dansante</h4>
                          <p className="text-lg font-medium" style={{ color: receptionColor }}>Fête</p>
                          <div className="mt-2 space-y-2 text-lg">
                            {!unifiedDate && wedding.receptionDate && (
                              <div className="flex items-center text-gray-700">
                                <CalendarIcon className="h-5 w-5 mr-2" style={{ color: receptionColor }} />
                                {formatDate(wedding.receptionDate)}
                              </div>
                            )}
                            {wedding.receptionStartTime && (
                              <div className="flex items-center text-gray-700">
                                <ClockIcon className="h-5 w-5 mr-2" style={{ color: receptionColor }} />
                                à partir de {wedding.receptionStartTime}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </motion.div>
            )}

            {/* Lieu principal (if no programme) */}
            {!hasProgram && (wedding?.venueName || wedding?.weddingDate) && (
              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.6 }}
                className="bg-gray-50 rounded-xl p-6 mb-6"
              >
                <div className="grid grid-cols-3 gap-3">
                  <div className="flex flex-col items-center">
                    <div className="h-8 w-8 rounded-full flex items-center justify-center mb-1.5" style={{ backgroundColor: `${primaryColor}20` }}>
                      <CalendarIcon className="h-4 w-4" style={{ color: primaryColor }} />
                    </div>
                    <p className="text-lg text-gray-500">Date</p>
                    <p className="font-semibold text-xl text-gray-900">
                      {wedding?.weddingDate ? format(new Date(wedding.weddingDate), 'd MMMM yyyy', { locale: fr }) : '-'}
                    </p>
                  </div>
                  <div className="flex flex-col items-center">
                    <div className="h-8 w-8 rounded-full flex items-center justify-center mb-1.5" style={{ backgroundColor: `${primaryColor}20` }}>
                      <ClockIcon className="h-4 w-4" style={{ color: primaryColor }} />
                    </div>
                    <p className="text-lg text-gray-500">Heure</p>
                    <p className="font-semibold text-xl text-gray-900">{wedding?.ceremonyTime || '-'}</p>
                  </div>
                  <div className="flex flex-col items-center">
                    <div className="h-8 w-8 rounded-full flex items-center justify-center mb-1.5" style={{ backgroundColor: `${primaryColor}20` }}>
                      <MapPinIcon className="h-4 w-4" style={{ color: primaryColor }} />
                    </div>
                    <p className="text-lg text-gray-500">Lieu</p>
                    <p className="font-semibold text-xl text-gray-900">{wedding?.venueName || '-'}</p>
                  </div>
                </div>
                {wedding?.venueAddress && <p className="mt-3 text-lg text-gray-600">{wedding.venueAddress}</p>}
              </motion.div>
            )}

            {/* Google Maps */}
            {wedding?.venueMapUrl && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.6, delay: 0.7 }} className="mb-3">
                <a href={wedding.venueMapUrl} target="_blank" rel="noopener noreferrer"
                  className="inline-flex items-center text-xl hover:underline" style={{ color: primaryColor }}>
                  <MapPinIcon className="h-6 w-6 mr-1" />Voir l'itinéraire sur Google Maps
                </a>
              </motion.div>
            )}

            {/* Additional Info */}
            {wedding?.additionalInfo && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.6, delay: 0.75 }}
                className="mb-5 bg-amber-50 border border-amber-200 rounded-lg p-5 text-left"
              >
                <p className="text-lg font-medium text-amber-800 mb-1">📋 Informations pratiques</p>
                <p className="text-lg text-amber-700">{wedding.additionalInfo}</p>
              </motion.div>
            )}

            {/* RSVP Deadline */}
            {wedding?.rsvpDeadline && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.6, delay: 0.8 }}
                className="mb-5 text-lg text-gray-500"
              >
                Merci de confirmer votre présence avant le <strong className="text-gray-700">{formatDate(wedding.rsvpDeadline)}</strong>
              </motion.div>
            )}

            {/* RSVP Section */}
            {!showRsvpForm ? (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.6, delay: 1 }}>
                {guest?.rsvpStatus === 'PENDING' ? (
                  <button onClick={() => setShowRsvpForm(true)} className="text-xl px-10 py-3 rounded-lg font-semibold text-white shadow-lg transition-transform hover:scale-105" style={{ backgroundColor: primaryColor }}>
                    Confirmer ma présence
                  </button>
                ) : (
                  <div className={`inline-flex items-center px-6 py-3 rounded-full ${
                    guest?.rsvpStatus === 'CONFIRMED' ? 'bg-green-100 text-green-700' :
                    guest?.rsvpStatus === 'DECLINED' ? 'bg-red-100 text-red-700' :
                    'bg-yellow-100 text-yellow-700'
                  }`}>
                    {guest?.rsvpStatus === 'CONFIRMED' && <><CheckCircleIcon className="h-5 w-5 mr-2" />Présence confirmée</>}
                    {guest?.rsvpStatus === 'DECLINED' && <><XCircleIcon className="h-5 w-5 mr-2" />Absence confirmée</>}
                    {guest?.rsvpStatus === 'MAYBE' && <><QuestionMarkCircleIcon className="h-5 w-5 mr-2" />Peut-être</>}
                  </div>
                )}
              </motion.div>
            ) : (
              <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="bg-gray-50 rounded-xl p-4">
                <h3 className="text-sm font-bold mb-3" style={{ fontFamily: headingFont, color: textColor }}>Confirmez votre présence</h3>
                <div className="grid grid-cols-3 gap-2 mb-4">
                  {[
                    { key: 'CONFIRMED', label: 'Je serai présent', Icon: CheckCircleIcon, bgColor: '#10b981', bgLight: '#f0fdf4' },
                    { key: 'MAYBE', label: 'Peut-être', Icon: QuestionMarkCircleIcon, bgColor: '#eab308', bgLight: '#fefce8' },
                    { key: 'DECLINED', label: 'Je ne pourrai pas', Icon: XCircleIcon, bgColor: '#ef4444', bgLight: '#fef2f2' }
                  ].map(({ key, label, Icon, bgColor, bgLight }) => (
                    <button key={key} onClick={() => setRsvpStatus(key)}
                      className="p-2 rounded-lg border-2 transition-all"
                      style={{
                        borderColor: rsvpStatus === key ? bgColor : '#e5e7eb',
                        backgroundColor: rsvpStatus === key ? bgLight : 'transparent'
                      }}>
                      <Icon className="h-5 w-5 mx-auto mb-1" style={{
                        color: rsvpStatus === key ? bgColor : '#9ca3af'
                      }} />
                      <p className="text-xs font-medium">{label}</p>
                    </button>
                  ))}
                </div>
                {rsvpStatus === 'CONFIRMED' && (
                  <div className="mb-3">
                    <label className="block text-xs font-medium text-gray-700 mb-1">Nombre de personnes</label>
                    <div className="flex items-center justify-center gap-3">
                      <button onClick={() => setNumberOfGuests(Math.max(1, numberOfGuests - 1))} className="h-7 w-7 rounded-full bg-gray-200 hover:bg-gray-300 flex items-center justify-center text-sm">-</button>
                      <span className="text-lg font-bold text-gray-900 w-8 text-center">{numberOfGuests}</span>
                      <button onClick={() => setNumberOfGuests(Math.min(10, numberOfGuests + 1))} className="h-7 w-7 rounded-full bg-gray-200 hover:bg-gray-300 flex items-center justify-center text-sm">+</button>
                    </div>
                  </div>
                )}
                <div className="flex gap-3">
                  <button onClick={() => setShowRsvpForm(false)} className="flex-1 btn-secondary">Annuler</button>
                  <button onClick={handleRSVPSubmit} disabled={!rsvpStatus || rsvpMutation.isLoading}
                    className="flex-1 text-white rounded-lg py-2 font-medium" style={{ backgroundColor: primaryColor }}>
                    {rsvpMutation.isLoading ? 'Envoi...' : 'Confirmer'}
                  </button>
                </div>
              </motion.div>
            )}

            {/* QR Code - styled with wedding settings */}
            {invitationInfo?.qrCodeUrl && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.6, delay: 1.2 }} className="mt-4 pt-4 border-t">
                <p className="text-lg text-gray-500 mb-3">Présentez ce QR code à l'entrée</p>
                <div
                  className={`inline-block p-4 shadow-lg ${
                    wedding?.qrCodeStyle === 'elegant' ? 'rounded-2xl border-2' :
                    wedding?.qrCodeStyle === 'rounded' ? 'rounded-2xl' : 'rounded-xl'
                  }`}
                  style={{
                    backgroundColor: wedding?.qrCodeBgColor || '#FFFFFF',
                    borderColor: wedding?.qrCodeStyle === 'elegant' ? (wedding?.qrCodeColor || '#000') : 'transparent'
                  }}
                >
                  <img
                    src={invitationInfo?.qrCodeUrl}
                    alt="QR Code"
                    style={{
                      width: `${Math.min(wedding?.qrCodeSize || 100, 140)}px`,
                      height: `${Math.min(wedding?.qrCodeSize || 100, 140)}px`
                    }}
                  />
                  {wedding?.qrCodeStyle === 'elegant' && (
                    <p className="text-xs mt-2 text-center" style={{ fontFamily: headingFont, color: wedding?.qrCodeColor || '#000' }}>
                      Scannez-moi
                    </p>
                  )}
                </div>
                <p className="mt-2 text-xs text-gray-400 font-mono">{invitationInfo?.uniqueCode}</p>
              </motion.div>
            )}

            {/* Table Number */}
            {guest?.tableNumber && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.6, delay: 1.3 }}
                className="mt-3 rounded-lg p-2.5 border"
                style={{ backgroundColor: `${primaryColor}10`, borderColor: `${primaryColor}30` }}
              >
                <p className="text-lg" style={{ color: primaryColor }}>Votre table</p>
                <p className="text-2xl font-bold" style={{ fontFamily: headingFont, color: primaryColor }}>Table {guest.tableNumber}</p>
              </motion.div>
            )}

            {/* Social Links & Hashtag */}
            {(socialLinks.instagram || socialLinks.hashtag || socialLinks.website) && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.6, delay: 1.4 }}
                className="mt-4 pt-3 border-t flex flex-wrap items-center justify-center gap-3"
              >
                {socialLinks.hashtag && (
                  <span className="px-4 py-1.5 rounded-full text-base font-bold" style={{ backgroundColor: `${primaryColor}15`, color: primaryColor }}>
                    {socialLinks.hashtag}
                  </span>
                )}
                {socialLinks.instagram && (
                  <a href={`https://instagram.com/${socialLinks.instagram.replace('@', '')}`} target="_blank" rel="noopener noreferrer"
                    className="flex items-center text-base text-gray-600 hover:text-pink-600 transition-colors"
                  >
                    <svg className="h-5 w-5 mr-1" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z" /></svg>
                    {socialLinks.instagram}
                  </a>
                )}
                {socialLinks.website && (
                  <a href={socialLinks.website} target="_blank" rel="noopener noreferrer"
                    className="flex items-center text-base text-gray-600 hover:text-blue-600 transition-colors"
                  >
                    <GlobeAltIcon className="h-6 w-6 mr-1" />
                    Notre site
                  </a>
                )}
              </motion.div>
            )}
          </div>
        </motion.div>

        <div className="text-center mt-5 text-gray-400 text-base">
          <p>Créé avec ❤️ sur WeddingInvite Pro</p>
        </div>
      </div>
    </div>
  )
}
