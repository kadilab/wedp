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
  { value: 'time', label: 'Heure seule', example: '10:30' }
]

export const DEFAULT_DATE_FORMAT = 'datetime'

function parseDate(value) {
  if (!value) return null
  const d = typeof value === 'string' && value.includes('T')
    ? new Date(value)
    : new Date(String(value).replace(' ', 'T'))
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
