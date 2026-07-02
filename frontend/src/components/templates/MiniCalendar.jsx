import {
  startOfMonth, endOfMonth, startOfWeek, endOfWeek,
  eachDayOfInterval, isSameDay, isSameMonth, format
} from 'date-fns'
import { fr } from 'date-fns/locale'

// Built-in marker shapes used to highlight the event day.
export const HEART_PATH = 'M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z'
export const STAR_PATH = 'M12 2l2.9 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l7.1-1.01L12 2z'

// Options offered in the editor for the visual calendar's highlighted day.
export const CALENDAR_MARKER_OPTIONS = [
  { value: 'circle', label: 'Cercle plein' },
  { value: 'ring', label: 'Contour (anneau)' },
  { value: 'heart', label: 'Cœur' },
  { value: 'star', label: 'Étoile' },
  { value: 'image', label: 'Image personnalisée' }
]

function resolveMarkerUrl(url) {
  if (!url) return url
  if (url.startsWith('data:') || url.startsWith('http')) return url
  return `${import.meta.env.VITE_API_URL?.replace('/api', '') || ''}${url}`
}

// A small month calendar rendered ON the invitation, with the event day
// highlighted — an alternative "format" for a date variable in the template
// editor. date-fns only, no extra dependency. Fills its element box and themes
// off the element's text colour (accent = highlighted day). The highlight can be
// a filled circle, a ring, a heart/star, or a creator-supplied image (PNG/SVG).
export default function MiniCalendar({
  date, accent = '#df6746', textColor = '#1f2937',
  marker = 'circle', markerUrl = '', markerSize = 1, className = ''
}) {
  const d = date instanceof Date ? date : new Date(String(date || '').replace(' ', 'T'))
  if (!d || isNaN(d.getTime())) return null

  const gridStart = startOfWeek(startOfMonth(d), { weekStartsOn: 1 }) // Monday
  const gridEnd = endOfWeek(endOfMonth(d), { weekStartsOn: 1 })
  const days = eachDayOfInterval({ start: gridStart, end: gridEnd })
  const weekdays = ['lun', 'mar', 'mer', 'jeu', 'ven', 'sam', 'dim']

  const useImage = marker === 'image' && markerUrl
  const shape = useImage ? 'image' : marker
  const numColor = shape === 'ring' ? accent : '#fff'
  const numShadow = shape === 'image' ? '0 1px 2px rgba(0,0,0,.55)' : 'none'

  const renderMarker = () => {
    if (shape === 'image') {
      return <img src={resolveMarkerUrl(markerUrl)} alt="" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
    }
    if (shape === 'heart' || shape === 'star') {
      return (
        <svg viewBox="0 0 24 24" style={{ width: '100%', height: '100%', display: 'block' }}>
          <path d={shape === 'heart' ? HEART_PATH : STAR_PATH} fill={accent} />
        </svg>
      )
    }
    if (shape === 'ring') {
      return <span style={{ width: '100%', height: '100%', borderRadius: '9999px', border: `0.13em solid ${accent}` }} />
    }
    return <span style={{ width: '100%', height: '100%', borderRadius: '9999px', background: accent }} />
  }

  return (
    <div className={`w-full h-full flex flex-col ${className}`} style={{ color: textColor, fontFamily: 'inherit' }}>
      {/* Month title */}
      <div className="text-center font-semibold capitalize" style={{ fontSize: '1.1em', lineHeight: 1.1 }}>
        {format(d, 'MMMM yyyy', { locale: fr })}
      </div>
      {/* Weekday headers */}
      <div className="grid grid-cols-7 mt-1" style={{ fontSize: '0.7em' }}>
        {weekdays.map((w) => (
          <div key={w} className="text-center font-medium capitalize" style={{ opacity: 0.6 }}>{w}</div>
        ))}
      </div>
      {/* Days grid */}
      <div className="grid grid-cols-7 flex-1 mt-0.5" style={{ fontSize: '0.8em' }}>
        {days.map((day, i) => {
          const isDay = isSameDay(day, d)
          const inMonth = isSameMonth(day, d)
          if (isDay) {
            return (
              <div key={i} className="flex items-center justify-center">
                <span className="relative inline-flex items-center justify-center leading-none" style={{ width: '1.9em', height: '1.9em' }}>
                  <span className="absolute inset-0 flex items-center justify-center" style={{ transform: markerSize && markerSize !== 1 ? `scale(${markerSize})` : undefined }}>{renderMarker()}</span>
                  <span className="relative" style={{ color: numColor, fontWeight: 700, textShadow: numShadow }}>{day.getDate()}</span>
                </span>
              </div>
            )
          }
          return (
            <div key={i} className="flex items-center justify-center">
              <span
                className="inline-flex items-center justify-center leading-none"
                style={{ width: '1.7em', height: '1.7em', color: textColor, opacity: inMonth ? 1 : 0.28 }}
              >
                {day.getDate()}
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// Server-side HTML string version (for generated PDF/image via Puppeteer).
export function miniCalendarHTML(date, { accent = '#df6746', textColor = '#1f2937', marker = 'circle', markerUrl = '', markerSize = 1 } = {}) {
  const d = date instanceof Date ? date : new Date(String(date || '').replace(' ', 'T'))
  if (!d || isNaN(d.getTime())) return ''
  const gridStart = startOfWeek(startOfMonth(d), { weekStartsOn: 1 })
  const gridEnd = endOfWeek(endOfMonth(d), { weekStartsOn: 1 })
  const days = eachDayOfInterval({ start: gridStart, end: gridEnd })
  const weekdays = ['lun', 'mar', 'mer', 'jeu', 'ven', 'sam', 'dim']
  const cell = (inner, style = '') => `<div style="display:flex;align-items:center;justify-content:center;${style}">${inner}</div>`
  const head = weekdays.map((w) => cell(w, 'opacity:.6;font-size:.7em;text-transform:capitalize;font-weight:500')).join('')

  const useImage = marker === 'image' && markerUrl
  const shape = useImage ? 'image' : marker
  const numColor = shape === 'ring' ? accent : '#fff'
  const numShadow = shape === 'image' ? 'text-shadow:0 1px 2px rgba(0,0,0,.55);' : ''
  const markerLayer = shape === 'image'
    ? `<img src="${resolveMarkerUrl(markerUrl)}" style="width:100%;height:100%;object-fit:contain" />`
    : shape === 'heart' || shape === 'star'
    ? `<svg viewBox="0 0 24 24" style="width:100%;height:100%;display:block"><path d="${shape === 'heart' ? HEART_PATH : STAR_PATH}" fill="${accent}"/></svg>`
    : shape === 'ring'
    ? `<span style="width:100%;height:100%;border-radius:9999px;border:0.13em solid ${accent}"></span>`
    : `<span style="width:100%;height:100%;border-radius:9999px;background:${accent}"></span>`

  const body = days.map((day) => {
    const isDay = isSameDay(day, d)
    const inMonth = isSameMonth(day, d)
    if (isDay) {
      const scale = markerSize && markerSize !== 1 ? `transform:scale(${markerSize});` : ''
      const span = `<span style="position:relative;display:inline-flex;align-items:center;justify-content:center;width:1.9em;height:1.9em">`
        + `<span style="position:absolute;inset:0;display:flex;align-items:center;justify-content:center;${scale}">${markerLayer}</span>`
        + `<span style="position:relative;color:${numColor};font-weight:700;${numShadow}">${day.getDate()}</span></span>`
      return cell(span, 'font-size:.8em')
    }
    const span = `<span style="display:inline-flex;align-items:center;justify-content:center;width:1.7em;height:1.7em;color:${textColor};opacity:${inMonth ? 1 : 0.28}">${day.getDate()}</span>`
    return cell(span, 'font-size:.8em')
  }).join('')
  return `<div style="width:100%;height:100%;display:flex;flex-direction:column;color:${textColor};font-family:inherit">
    <div style="text-align:center;font-weight:600;font-size:1.1em;text-transform:capitalize">${format(d, 'MMMM yyyy', { locale: fr })}</div>
    <div style="display:grid;grid-template-columns:repeat(7,1fr);margin-top:4px">${head}</div>
    <div style="display:grid;grid-template-columns:repeat(7,1fr);flex:1;margin-top:2px">${body}</div>
  </div>`
}
