import { useRef, useState, useEffect } from 'react'
import { HeartIcon, CalendarIcon, PhotoIcon } from '@heroicons/react/24/outline'
import { getClipPath, getImageStyle } from '../../utils/imageShapes'
import CurvedText, { hasArc } from './CurvedText'
import AutoFitText from './AutoFitText'
import FontStyles from './FontStyles'
import { formatEventDate, DATE_VARIABLE_KEYS, DEFAULT_DATE_FORMAT, componentVars, formatEventTime, TIME_VARIABLE_KEYS, DEFAULT_TIME_FORMAT, timeComponentVars, getElementDateKey } from '../../utils/dateFormats'
import MiniCalendar from './MiniCalendar'
import ShapeElement from './ShapeElement'
import { getEventDisplayTitle } from '../../utils/eventTypes'

// Rich, realistic test data used when no real event is provided (template
// gallery / marketplace previews) so every variable renders with a believable
// value — guiding the client's choice instead of showing blanks.
const SAMPLE_WEDDING = {
  eventType: 'WEDDING',
  brideName: 'Marie', groomName: 'Jean', honoreeName: 'Sophie',
  eventTitle: 'Notre Événement',
  weddingDate: '2026-06-20 15:00',
  ceremonyTime: '15:00',
  venueName: 'Château des Roses', venueAddress: '12 Rue des Fleurs, Kinshasa',
  customMessage: 'Votre présence sera notre plus beau cadeau.',
  additionalInfo: 'Parking disponible · Tenue de soirée',
  rsvpDeadline: '2026-05-01 00:00',
  communeDate: '2026-06-20 10:00', communeTime: '10:00', communeVenue: 'Mairie de la Gombe', communeAddress: 'Av. du Commerce',
  egliseDate: '2026-06-20 14:00', egliseTime: '14:00', egliseVenue: 'Cathédrale Notre-Dame', egliseAddress: 'Bd du 30 Juin',
  receptionDate: '2026-06-20 18:00', receptionStartTime: '18:00', receptionVenue: 'Salle des Fêtes', receptionAddress: '12 Rue des Fleurs'
}

const hexToRgba = (hex, alpha = 1) => {
  const h = (hex || '#FFFFFF').replace('#', '')
  const r = parseInt(h.slice(0, 2), 16) || 0
  const g = parseInt(h.slice(2, 4), 16) || 0
  const b = parseInt(h.slice(4, 6), 16) || 0
  return `rgba(${r},${g},${b},${alpha})`
}

/**
 * TemplatePreview â€” renders a faithful scaled-down replica of the actual invitation.
 * For canvas-based templates (designElements), renders the real canvas layout scaled to fit.
 * For legacy templates, falls back to a simple colour-matched card.
 */
export default function TemplatePreview({ template, className = '', weddingData = null, adaptive = false, fit = 'width' }) {
  const containerRef = useRef(null)
  const [scale, setScale] = useState(null)

  const config = template?.config || {}
  const designElements = config.designElements || []
  const hasDesignElements = designElements.length > 0

  const canvasWidth = config.canvasWidth || template?.canvasWidth || 800
  const canvasHeight = config.canvasHeight || template?.canvasHeight || 1120
  const margins = config.margins || { top: 0, right: 0, bottom: 0, left: 0 }

  const designBgImage = config.backgroundImage || template?.backgroundUrl || ''
  const designBgOpacity = (config.backgroundOpacity != null ? config.backgroundOpacity : (template?.backgroundOpacity ?? 100)) / 100

  // Compute scale from container width
  useEffect(() => {
    if (!hasDesignElements || !containerRef.current) return
    const update = () => {
      const { width, height } = containerRef.current.getBoundingClientRect()
      if (width > 0) {
        // 'cover' fills the box (cropping overflow) → uniform thumbnails.
        // 'width' fits to width (used with adaptive height → full preview).
        const s = fit === 'cover' && height > 0
          ? Math.max(width / canvasWidth, height / canvasHeight)
          : width / canvasWidth
        setScale(s)
      }
    }
    update()
    const ro = new ResizeObserver(update)
    ro.observe(containerRef.current)
    return () => ro.disconnect()
  }, [hasDesignElements, canvasWidth, canvasHeight, fit])

  // Real event data when provided (live form preview), otherwise the rich
  // sample so gallery/marketplace previews look like a finished invitation.
  const wd = weddingData || SAMPLE_WEDDING

  // Build variable replacement map (same keys as InvitationView)
  const buildDataMap = () => {
    const fmt = (dateStr) => {
      if (!dateStr) return ''
      try {
        const d = new Date(dateStr)
        const pad = n => n.toString().padStart(2, '0')
        return `${pad(d.getDate())}-${pad(d.getMonth() + 1)}-${d.getFullYear()} ${pad(d.getHours())}:${pad(d.getMinutes())}`
      } catch { return String(dateStr) }
    }
    const EVENT_TYPE_LABELS = { WEDDING: 'Mariage', BIRTHDAY: 'Anniversaire', DOT: 'Mariage coutumier', CEREMONY: 'Cérémonie', CONFERENCE: 'Conférence', OTHER: 'Événement' }
    // Sample fallbacks keep the preview populated even before the form is filled.
    const sampleEv = {
      eventType: wd?.eventType,
      brideName: wd?.brideName || 'Marie',
      groomName: wd?.groomName || 'Jean',
      honoreeName: wd?.honoreeName || 'Sophie',
      eventTitle: wd?.eventTitle
    }
    return {
      bride_name: wd?.brideName || 'Marie',
      groom_name: wd?.groomName || 'Jean',
      honoree_name: wd?.honoreeName || 'Sophie',
      event_title: getEventDisplayTitle(sampleEv),
      event_type: EVENT_TYPE_LABELS[wd?.eventType] || 'Mariage',
      guest_name: 'Prénom Nom',
      invitation_type: template?.config?.invitationType === 'couple' ? 'Couple' : 'Singleton',
      custom_message: wd?.customMessage || '',
      additional_info: wd?.additionalInfo || '',
      wedding_date: fmt(wd?.weddingDate) || '25-12-2026 00:00',
      ceremony_time: wd?.ceremonyTime || wd?.communeTime || '',
      venue_name: wd?.venueName || wd?.receptionVenue || wd?.communeVenue || 'Château des Roses',
      venue_address: wd?.venueAddress || wd?.receptionAddress || wd?.communeAddress || '',
      table_number: '',
      rsvp_date: fmt(wd?.rsvpDeadline) || '',
      commune_date: fmt(wd?.communeDate) || '',
      commune_time: wd?.communeTime || '',
      commune_venue: wd?.communeVenue || '',
      commune_address: wd?.communeAddress || '',
      eglise_date: fmt(wd?.egliseDate) || '',
      eglise_time: wd?.egliseTime || '',
      eglise_venue: wd?.egliseVenue || '',
      eglise_address: wd?.egliseAddress || '',
      reception_date: fmt(wd?.receptionDate) || '',
      reception_time: wd?.receptionStartTime || '',
      reception_venue: wd?.receptionVenue || '',
      reception_address: wd?.receptionAddress || '',
      program: [
        wd?.communeVenue ? `Mairie ${wd.communeTime || ''}` : '',
        wd?.egliseVenue ? `Église ${wd.egliseTime || ''}` : '',
        wd?.receptionVenue ? `Réception ${wd.receptionStartTime || ''}` : '',
      ].filter(Boolean).join(' • '),
      // Separated date components (day name/number, month name, year)
      ...componentVars({
        wedding: wd?.weddingDate,
        commune: wd?.communeDate,
        eglise: wd?.egliseDate,
        reception: wd?.receptionDate,
        rsvp: wd?.rsvpDeadline
      }),
      // Separated time components (hour / minute)
      ...timeComponentVars({
        ceremony: wd?.ceremonyTime || wd?.communeTime,
        commune: wd?.communeTime,
        eglise: wd?.egliseTime,
        reception: wd?.receptionStartTime
      }),
    }
  }

  // â”€â”€ Canvas-based rendering (TemplateDesigner-created templates) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  if (hasDesignElements) {
    const dataMap = buildDataMap()
    // Raw (unformatted) date values so each element can render its own format.
    const rawDateMap = {
      wedding_date: wd?.weddingDate || '25-12-2026 00:00',
      rsvp_date: wd?.rsvpDeadline || '',
      commune_date: wd?.communeDate || '',
      eglise_date: wd?.egliseDate || '',
      reception_date: wd?.receptionDate || ''
    }
    const rawTimeMap = {
      ceremony_time: wd?.ceremonyTime || wd?.communeTime || '',
      commune_time: wd?.communeTime || '',
      eglise_time: wd?.egliseTime || '',
      reception_time: wd?.receptionStartTime || ''
    }
    const mLeft = margins.left || 0
    const mTop = margins.top || 0

    return (
      <div
        ref={containerRef}
        className={`w-full overflow-hidden relative bg-white ${adaptive ? '' : 'h-full'} ${className}`}
        style={adaptive ? { aspectRatio: `${canvasWidth} / ${canvasHeight}` } : undefined}
      >
        {/* Google Fonts + custom uploaded fonts (shared source of truth) */}
        <FontStyles />
        {scale !== null && (
          <div
            style={{
              position: 'absolute',
              top: '50%',
              left: '50%',
              width: canvasWidth,
              height: canvasHeight,
              transform: `translate(-50%, -50%) scale(${scale})`,
              transformOrigin: 'center center',
            }}
          >
            {/* Background image */}
            {designBgImage && (
              <img
                src={designBgImage}
                alt=""
                loading="lazy"
                style={{
                  position: 'absolute',
                  inset: 0,
                  width: '100%',
                  height: '100%',
                  objectFit: 'fill',
                  opacity: designBgOpacity,
                  pointerEvents: 'none',
                }}
              />
            )}

            {/* Design elements â€” absolutely positioned, same as InvitationView */}
            {designElements
              .filter(el => el.visible !== false)
              .map((el, idx) => {
                let content = el.content || ''
                // Date variables first, using this element's chosen format.
                DATE_VARIABLE_KEYS.forEach((key) => {
                  if (content.includes(`{{${key}}}`)) {
                    content = content.replace(
                      new RegExp(`\\{\\{${key}\\}\\}`, 'g'),
                      formatEventDate(rawDateMap[key], el.dateFormat || DEFAULT_DATE_FORMAT)
                    )
                  }
                })
                // Time variables, using this element's chosen time format.
                TIME_VARIABLE_KEYS.forEach((key) => {
                  if (content.includes(`{{${key}}}`)) {
                    content = content.replace(
                      new RegExp(`\\{\\{${key}\\}\\}`, 'g'),
                      formatEventTime(rawTimeMap[key], el.timeFormat || DEFAULT_TIME_FORMAT)
                    )
                  }
                })
                Object.entries(dataMap).forEach(([key, val]) => {
                  content = content.replace(new RegExp(`\\{\\{${key}\\}\\}`, 'g'), val)
                })

                // Raw canvas coords (the editor doesn't offset by margins —
                // they're only a visual guide). Keep WYSIWYG.
                const elLeft = el.x
                const elTop = el.y
                const zIdx = el.zIndex ?? (10 + idx)

                // QR placeholder
                if (el.type === 'qrcode') {
                  return (
                    <div
                      key={el.id || idx}
                      style={{
                        position: 'absolute',
                        left: elLeft, top: elTop,
                        width: el.width, height: el.height,
                        zIndex: zIdx,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        background: '#f3f4f6',
                        borderRadius: 4,
                      }}
                    >
                      <svg width="60%" height="60%" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="1.5">
                        <rect x="3" y="3" width="7" height="7" rx="1" fill="#9ca3af" stroke="none"/>
                        <rect x="14" y="3" width="7" height="7" rx="1" fill="#9ca3af" stroke="none"/>
                        <rect x="3" y="14" width="7" height="7" rx="1" fill="#9ca3af" stroke="none"/>
                        <rect x="5" y="5" width="3" height="3" rx="0.5" fill="white" stroke="none"/>
                        <rect x="16" y="5" width="3" height="3" rx="0.5" fill="white" stroke="none"/>
                        <rect x="5" y="16" width="3" height="3" rx="0.5" fill="white" stroke="none"/>
                        <rect x="14" y="14" width="2" height="2" fill="#9ca3af" stroke="none"/>
                        <rect x="18" y="14" width="2" height="2" fill="#9ca3af" stroke="none"/>
                        <rect x="14" y="18" width="2" height="2" fill="#9ca3af" stroke="none"/>
                        <rect x="18" y="18" width="2" height="2" fill="#9ca3af" stroke="none"/>
                      </svg>
                    </div>
                  )
                }

                // Decorative shape (rectangle / circle / line)
                if (el.type === 'shape') {
                  return (
                    <div key={el.id || idx} style={{ position: 'absolute', left: elLeft, top: elTop, width: el.width, height: el.height, zIndex: zIdx }}>
                      <ShapeElement el={el} />
                    </div>
                  )
                }

                // Photo element (ex: photo des mariés, fournie par le client) or a
                // fixed decorative "image" uploaded by the admin - both support
                // shapes (rectangle/cercle/hexagone/losange/octogone/étoile).
                if (el.type === 'photo' || el.type === 'image') {
                  const isDecorative = el.type === 'image'
                  const photoBorderColor = hexToRgba(el.borderColor || '#FFFFFF', (el.borderOpacity ?? 100) / 100)
                  const clipPath = getClipPath(el.shape, el.customClipPath)
                  const apiBase = import.meta.env.VITE_API_URL?.replace('/api', '') || ''
                  // Client photo placeholders each bind to their own image by
                  // element id (multi-image templates), falling back to the
                  // legacy single couplePhoto field.
                  const imgSrc = isDecorative
                    ? (el.iconUrl ? (el.iconUrl.startsWith('data:') || el.iconUrl.startsWith('http') ? el.iconUrl : `${apiBase}${el.iconUrl}`) : null)
                    : (wd?.templateImages?.[el.id] || wd?.couplePhoto)
                  // No gray placeholder fill once a real image is set - many
                  // decorative uploads (PNG logos, ornaments) rely on transparency.
                  const placeholderBg = imgSrc ? 'transparent' : '#f3f4f6'
                  const outerStyle = clipPath
                    ? { clipPath, background: el.borderWidth ? photoBorderColor : 'transparent', padding: el.borderWidth || 0 }
                    : { border: el.borderWidth ? `${el.borderWidth}px solid ${photoBorderColor}` : 'none', borderRadius: el.borderRadius || 0 }
                  return (
                    <div
                      key={el.id || idx}
                      style={{
                        position: 'absolute',
                        left: elLeft, top: elTop,
                        width: el.width, height: el.height,
                        zIndex: zIdx,
                        boxSizing: 'border-box',
                        overflow: 'hidden',
                        background: clipPath && el.borderWidth ? undefined : placeholderBg,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        ...outerStyle
                      }}
                    >
                      <div style={{ width: '100%', height: '100%', overflow: 'hidden', background: placeholderBg, display: 'flex', alignItems: 'center', justifyContent: 'center', clipPath: clipPath || undefined }}>
                        {imgSrc ? (
                          <img src={imgSrc} alt="" loading="lazy" style={getImageStyle(el)} />
                        ) : (
                          <PhotoIcon className="w-1/3 h-1/3 text-gray-300" />
                        )}
                      </div>
                    </div>
                  )
                }

                // Calendar (visual) date format — mini month calendar.
                if (el.dateFormat === 'calendar') {
                  const dk = getElementDateKey(el.content)
                  if (dk && rawDateMap[dk]) {
                    const base = Math.max(6, Math.round((el.width || 220) / 18))
                    return (
                      <div key={el.id || idx} style={{ position: 'absolute', left: elLeft, top: elTop, width: el.width, height: el.height, zIndex: zIdx, fontSize: base, fontFamily: `'${el.fontFamily}', serif` }}>
                        <MiniCalendar date={rawDateMap[dk]} accent={el.color || '#df6746'} textColor={el.color || '#1f2937'} marker={el.calendarMarker || 'circle'} markerUrl={el.calendarMarkerUrl || ''} markerSize={el.calendarMarkerSize || 1} />
                      </div>
                    )
                  }
                }

                // Text / names / other elements
                let textShadow = typeof el.textShadow === 'string' ? el.textShadow : 'none'
                const shadowColor = typeof el.shadowColor === 'string' ? el.shadowColor : '#000000'
                if (textShadow === '1px 1px 2px') textShadow = '2px 2px 4px'
                if (textShadow === '2px 2px 4px') textShadow = '3px 3px 8px'
                if (textShadow === '3px 3px 6px') textShadow = '4px 4px 12px'

                return (
                  <div
                    key={el.id || idx}
                    style={{
                      position: 'absolute',
                      left: elLeft, top: elTop,
                      width: el.width, height: el.height,
                      zIndex: zIdx,
                      display: 'flex',
                      alignItems: el.verticalAlign === 'top' ? 'flex-start' : el.verticalAlign === 'bottom' ? 'flex-end' : 'center',
                      justifyContent: el.textAlign === 'center' ? 'center' : el.textAlign === 'right' ? 'flex-end' : 'flex-start',
                      fontFamily: `'${el.fontFamily}', serif`,
                      fontSize: el.fontSize,
                      fontWeight: el.fontWeight || 'normal',
                      fontStyle: el.fontStyle || 'normal',
                      color: el.color || '#000',
                      textAlign: el.textAlign || 'center',
                      letterSpacing: el.letterSpacing != null ? `${el.letterSpacing}px` : undefined,
                      textTransform: el.textTransform || 'none',
                      textShadow: textShadow !== 'none' ? `${textShadow} ${shadowColor}` : 'none',
                      overflow: hasArc(el) ? 'visible' : 'hidden',
                      wordBreak: 'break-words',
                      lineHeight: el.lineHeight || 1.2,
                      transform: el.rotation ? `rotate(${el.rotation}deg)` : undefined,
                      transformOrigin: 'center center',
                    }}
                  >
                    {hasArc(el)
                      ? <CurvedText el={el} text={content} />
                      : el.autoFit
                        ? <AutoFitText
                            text={content}
                            fontSize={el.fontSize}
                            style={{
                              width: '100%', height: '100%', display: 'flex',
                              alignItems: el.verticalAlign === 'top' ? 'flex-start' : el.verticalAlign === 'bottom' ? 'flex-end' : 'center',
                              justifyContent: el.textAlign === 'center' ? 'center' : el.textAlign === 'right' ? 'flex-end' : 'flex-start',
                              textAlign: el.textAlign || 'center',
                              overflow: 'hidden', whiteSpace: 'normal', wordBreak: 'break-word',
                              lineHeight: el.lineHeight || 1.2
                            }}
                          />
                        : <span style={{ width: '100%' }}>{content}</span>}
                  </div>
                )
              })}
          </div>
        )}
      </div>
    )
  }

  // â”€â”€ Legacy / classic rendering â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  let colorScheme = template?.colorScheme || {}
  if (typeof colorScheme === 'string') {
    try { colorScheme = JSON.parse(colorScheme) } catch { colorScheme = {} }
  }
  const colors = { ...colorScheme, ...(config.colors || {}) }
  const primaryColor = colors.primary || '#df6746'
  const secondaryColor = colors.secondary || '#f2b5a3'
  const bgColor = colors.background || '#ffffff'
  const textColor = colors.text || '#1f2937'
  const headingFont = config.fonts?.heading || 'Playfair Display, serif'

  const brideName = wd?.brideName || 'Marie'
  const groomName = wd?.groomName || 'Jean'
  const weddingDate = wd?.weddingDate
    ? (() => { try { return new Date(wd.weddingDate).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' }) } catch { return '25 décembre 2026' } })()
    : '25 décembre 2026'

  return (
    <div
      className={`w-full overflow-hidden flex flex-col ${adaptive ? '' : 'h-full'} ${className}`}
      style={{ background: bgColor, fontFamily: headingFont, ...(adaptive ? { aspectRatio: '3 / 4' } : {}) }}
    >
      {/* Header gradient */}
      <div
        className="flex-shrink-0 flex items-center justify-center"
        style={{ height: '35%', background: `linear-gradient(135deg, ${primaryColor}, ${secondaryColor})` }}
      >
        <HeartIcon className="h-8 w-8 text-white/60" />
      </div>
      {/* Body */}
      <div className="flex-1 flex flex-col items-center justify-center text-center px-3 py-2 overflow-hidden">
        <p style={{ fontSize: '5px', color: primaryColor, letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: 4 }}>
          Invitation au mariage de
        </p>
        <p style={{ fontSize: 13, fontWeight: 700, color: textColor, lineHeight: 1.1 }}>{brideName}</p>
        <p style={{ fontSize: 9, color: secondaryColor }}>&amp;</p>
        <p style={{ fontSize: 13, fontWeight: 700, color: textColor, lineHeight: 1.1, marginBottom: 6 }}>{groomName}</p>
        <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginBottom: 6 }}>
          <div style={{ width: 20, height: 1, backgroundColor: secondaryColor }} />
          <HeartIcon style={{ width: 8, height: 8, color: primaryColor }} />
          <div style={{ width: 20, height: 1, backgroundColor: secondaryColor }} />
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
          <CalendarIcon style={{ width: 8, height: 8, color: primaryColor }} />
          <p style={{ fontSize: 6, fontWeight: 600, color: textColor }}>{weddingDate}</p>
        </div>
      </div>
    </div>
  )
}
