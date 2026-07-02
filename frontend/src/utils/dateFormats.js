// Shared date/time formatting for template date variables. Lets each template
// element choose how a date variable (e.g. {{wedding_date}}) is rendered, so a
// creator can show "20 juin 2026" instead of the default "20-06-2026 10:30".

// Variables that hold a date and therefore support a format choice.
export const DATE_VARIABLE_KEYS = [
  'wedding_date',
  'rsvp_date',
  'commune_date',
  'eglise_date',
  'reception_date'
]

export const DATE_FORMAT_OPTIONS = [
  { value: 'datetime', label: 'Date + heure', example: '20-06-2026 10:30' },
  { value: 'date', label: 'Date (JJ-MM-AAAA)', example: '20-06-2026' },
  { value: 'date_slash', label: 'Date (JJ/MM/AAAA)', example: '20/06/2026' },
  { value: 'date_long', label: 'Date longue', example: '20 juin 2026' },
  { value: 'date_full', label: 'Date complète', example: 'samedi 20 juin 2026' },
  { value: 'date_long_time', label: 'Date longue + heure', example: '20 juin 2026 à 10:30' },
  { value: 'time', label: 'Heure seule', example: '10:30' },
  { value: 'calendar', label: 'Calendrier (visuel)', example: '📅 mini-calendrier' }
]

// The first date variable used in a text (drives the calendar rendering).
export function getElementDateKey(text) {
  if (!text) return null
  return DATE_VARIABLE_KEYS.find((k) => text.includes(`{{${k}}}`)) || null
}

export const DEFAULT_DATE_FORMAT = 'datetime'

// Variables that hold a standalone time (stored as "HH:mm" strings) and support
// a format choice, e.g. show "16h30" instead of "16:30".
export const TIME_VARIABLE_KEYS = [
  'ceremony_time',
  'commune_time',
  'eglise_time',
  'reception_time'
]

export const TIME_FORMAT_OPTIONS = [
  { value: 'colon', label: 'Heure (12:00)', example: '16:30' },
  { value: 'h', label: 'Heure (12h00)', example: '16h30' },
  { value: 'ampm', label: 'Heure (4:30 PM)', example: '4:30 PM' }
]

export const DEFAULT_TIME_FORMAT = 'colon'

// Parse a time string in any of "16:30", "16h30", "16 h 30", "16", "16h".
function parseTime(value) {
  if (!value) return null
  const s = String(value).trim()
  const m = s.match(/^(\d{1,2})\s*[:hH]\s*(\d{1,2})/)
  if (m) {
    const h = parseInt(m[1], 10)
    const min = parseInt(m[2], 10)
    if (!isNaN(h) && !isNaN(min)) return { h, min }
  }
  const m2 = s.match(/^(\d{1,2})\s*[hH]?$/)
  if (m2) { const h = parseInt(m2[1], 10); if (!isNaN(h)) return { h, min: 0 } }
  return null
}

/**
 * Format a raw time value according to one of TIME_FORMAT_OPTIONS.
 * Falls back to the raw value if it cannot be parsed.
 */
export function formatEventTime(value, format = DEFAULT_TIME_FORMAT) {
  const t = parseTime(value)
  if (!t) return value || ''
  const pad = (n) => n.toString().padStart(2, '0')
  const hh = pad(t.h)
  const mm = pad(t.min)
  switch (format) {
    case 'h':
      return `${hh}h${mm}`
    case 'ampm': {
      const period = t.h >= 12 ? 'PM' : 'AM'
      const h12 = t.h % 12 === 0 ? 12 : t.h % 12
      return `${h12}:${mm} ${period}`
    }
    case 'colon':
    default:
      return `${hh}:${mm}`
  }
}

/** Does this text contain at least one time variable? */
export function containsTimeVariable(text) {
  if (!text) return false
  return TIME_VARIABLE_KEYS.some((k) => text.includes(`{{${k}}}`))
}

// Separate zero-padded hour / minute components for variables like
// {{ceremony_hour}} / {{ceremony_minute}} (so a design can style them apart).
export function timeComponents(value) {
  const t = parseTime(value)
  if (!t) return { hour: '', minute: '' }
  const pad = (n) => n.toString().padStart(2, '0')
  return { hour: pad(t.h), minute: pad(t.min) }
}

// Build {prefix}_hour / {prefix}_minute for a set of named times, e.g.
// timeComponentVars({ ceremony: '15:30', commune: '10:00' }).
export function timeComponentVars(named) {
  const out = {}
  for (const [prefix, value] of Object.entries(named)) {
    const c = timeComponents(value)
    out[`${prefix}_hour`] = c.hour
    out[`${prefix}_minute`] = c.minute
  }
  return out
}

function parseDate(value) {
  if (!value) return null
  // Date object (e.g. SSR / Prisma) or ISO string from the API — handle both.
  if (value instanceof Date) return isNaN(value.getTime()) ? null : value
  let d = new Date(value) // ISO / RFC strings parse directly
  if (isNaN(d.getTime()) && typeof value === 'string') {
    d = new Date(value.replace(' ', 'T')) // fallback for "YYYY-MM-DD HH:mm"
  }
  return isNaN(d.getTime()) ? null : d
}

/**
 * Format a raw date value according to one of DATE_FORMAT_OPTIONS.
 * Falls back to the raw value if it cannot be parsed.
 */
export function formatEventDate(value, format = DEFAULT_DATE_FORMAT) {
  const d = parseDate(value)
  if (!d) return value || ''
  const pad = (n) => n.toString().padStart(2, '0')
  const day = pad(d.getDate())
  const month = pad(d.getMonth() + 1)
  const year = d.getFullYear()
  const time = `${pad(d.getHours())}:${pad(d.getMinutes())}`

  switch (format) {
    case 'date':
      return `${day}-${month}-${year}`
    case 'date_slash':
      return `${day}/${month}/${year}`
    case 'date_long':
      return d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })
    case 'date_full':
      return d.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
    case 'date_long_time':
      return `${d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })} à ${time}`
    case 'time':
      return time
    case 'datetime':
    default:
      return `${day}-${month}-${year} ${time}`
  }
}

// Separated, uppercase French date components for variables like
// {{wedding_day_name}} / {{commune_month_name}} / {{rsvp_year}}.
export function dateComponents(value) {
  const d = parseDate(value)
  if (!d) return { day_name: '', day_num: '', month_name: '', year: '' }
  return {
    day_name: d.toLocaleDateString('fr-FR', { weekday: 'long' }).toUpperCase(),
    day_num: String(d.getDate()),
    month_name: d.toLocaleDateString('fr-FR', { month: 'long' }).toUpperCase(),
    year: String(d.getFullYear())
  }
}

// Build the full {prefix}_day_name / _day_num / _month_name / _year map for a
// set of named dates, e.g. componentVars({ wedding: date, commune: date }).
export function componentVars(named) {
  const out = {}
  for (const [prefix, value] of Object.entries(named)) {
    const c = dateComponents(value)
    out[`${prefix}_day_name`] = c.day_name
    out[`${prefix}_day_num`] = c.day_num
    out[`${prefix}_month_name`] = c.month_name
    out[`${prefix}_year`] = c.year
  }
  return out
}

/** Does this text contain at least one date variable? */
export function containsDateVariable(text) {
  if (!text) return false
  return DATE_VARIABLE_KEYS.some((k) => text.includes(`{{${k}}}`))
}
