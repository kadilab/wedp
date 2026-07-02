import {
  startOfMonth, endOfMonth, startOfWeek, endOfWeek,
  eachDayOfInterval, isSameDay, isSameMonth, format
} from 'date-fns'
import { fr } from 'date-fns/locale'

// A small month calendar rendered ON the invitation, with the event day
// highlighted — an alternative "format" for a date variable in the template
// editor. date-fns only, no extra dependency. Fills its element box and themes
// off the element's text colour (accent = highlighted day).
export default function MiniCalendar({ date, accent = '#df6746', textColor = '#1f2937', className = '' }) {
  const d = date instanceof Date ? date : new Date(String(date || '').replace(' ', 'T'))
  if (!d || isNaN(d.getTime())) return null

  const gridStart = startOfWeek(startOfMonth(d), { weekStartsOn: 1 }) // Monday
  const gridEnd = endOfWeek(endOfMonth(d), { weekStartsOn: 1 })
  const days = eachDayOfInterval({ start: gridStart, end: gridEnd })
  const weekdays = ['lun', 'mar', 'mer', 'jeu', 'ven', 'sam', 'dim']

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
          return (
            <div key={i} className="flex items-center justify-center">
              <span
                className="inline-flex items-center justify-center rounded-full leading-none"
                style={{
                  width: '1.7em', height: '1.7em',
                  backgroundColor: isDay ? accent : 'transparent',
                  color: isDay ? '#fff' : (inMonth ? textColor : textColor),
                  opacity: inMonth ? 1 : 0.28,
                  fontWeight: isDay ? 700 : 400
                }}
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
export function miniCalendarHTML(date, { accent = '#df6746', textColor = '#1f2937' } = {}) {
  const d = date instanceof Date ? date : new Date(String(date || '').replace(' ', 'T'))
  if (!d || isNaN(d.getTime())) return ''
  const gridStart = startOfWeek(startOfMonth(d), { weekStartsOn: 1 })
  const gridEnd = endOfWeek(endOfMonth(d), { weekStartsOn: 1 })
  const days = eachDayOfInterval({ start: gridStart, end: gridEnd })
  const weekdays = ['lun', 'mar', 'mer', 'jeu', 'ven', 'sam', 'dim']
  const cell = (inner, style = '') => `<div style="display:flex;align-items:center;justify-content:center;${style}">${inner}</div>`
  const head = weekdays.map((w) => cell(w, 'opacity:.6;font-size:.7em;text-transform:capitalize;font-weight:500')).join('')
  const body = days.map((day) => {
    const isDay = isSameDay(day, d)
    const inMonth = isSameMonth(day, d)
    const span = `<span style="display:inline-flex;align-items:center;justify-content:center;width:1.7em;height:1.7em;border-radius:9999px;${isDay ? `background:${accent};color:#fff;font-weight:700` : `color:${textColor};opacity:${inMonth ? 1 : 0.28}`}">${day.getDate()}</span>`
    return cell(span, 'font-size:.8em')
  }).join('')
  return `<div style="width:100%;height:100%;display:flex;flex-direction:column;color:${textColor};font-family:inherit">
    <div style="text-align:center;font-weight:600;font-size:1.1em;text-transform:capitalize">${format(d, 'MMMM yyyy', { locale: fr })}</div>
    <div style="display:grid;grid-template-columns:repeat(7,1fr);margin-top:4px">${head}</div>
    <div style="display:grid;grid-template-columns:repeat(7,1fr);flex:1;margin-top:2px">${body}</div>
  </div>`
}
