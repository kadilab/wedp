// Parse which {{variables}} a design-based template actually uses, and map them
// to the event form fields — so the creation form can show ONLY the inputs the
// client will actually see on their invitation.

// Each template variable key → the form field it drives. Several variables can
// point to the same field (e.g. wedding_date, wedding_year → weddingDate).
const VAR_TO_FIELD = {
  bride_name: 'brideName',
  groom_name: 'groomName',
  honoree_name: 'honoreeName',
  event_title: 'eventTitle',
  custom_message: 'customMessage',
  additional_info: 'additionalInfo',

  // Main date (+ separated components)
  wedding_date: 'weddingDate', wedding_day_name: 'weddingDate', wedding_day_num: 'weddingDate',
  wedding_month_name: 'weddingDate', wedding_year: 'weddingDate',
  // Main time (+ hour/minute)
  ceremony_time: 'ceremonyTime', ceremony_hour: 'ceremonyTime', ceremony_minute: 'ceremonyTime',

  venue_name: 'venueName', venue_address: 'venueAddress',

  rsvp_date: 'rsvpDeadline', rsvp_day_name: 'rsvpDeadline', rsvp_day_num: 'rsvpDeadline',
  rsvp_month_name: 'rsvpDeadline', rsvp_year: 'rsvpDeadline',

  // Programme — Commune / Mairie
  commune_date: 'communeDate', commune_day_name: 'communeDate', commune_day_num: 'communeDate',
  commune_month_name: 'communeDate', commune_year: 'communeDate',
  commune_time: 'communeTime', commune_hour: 'communeTime', commune_minute: 'communeTime',
  commune_venue: 'communeVenue', commune_address: 'communeAddress',

  // Programme — Église
  eglise_date: 'egliseDate', eglise_day_name: 'egliseDate', eglise_day_num: 'egliseDate',
  eglise_month_name: 'egliseDate', eglise_year: 'egliseDate',
  eglise_time: 'egliseTime', eglise_hour: 'egliseTime', eglise_minute: 'egliseTime',
  eglise_venue: 'egliseVenue', eglise_address: 'egliseAddress',

  // Programme — Réception
  reception_date: 'receptionDate', reception_day_name: 'receptionDate', reception_day_num: 'receptionDate',
  reception_month_name: 'receptionDate', reception_year: 'receptionDate',
  reception_time: 'receptionStartTime', reception_hour: 'receptionStartTime', reception_minute: 'receptionStartTime',
  reception_venue: 'receptionVenue', reception_address: 'receptionAddress'
}

// Fields we always keep visible regardless of the template — the event identity
// and its main date power the dashboard listing, slug, countdown and check-in.
export const ALWAYS_VISIBLE_FIELDS = new Set([
  'brideName', 'groomName', 'honoreeName', 'eventTitle', 'weddingDate'
])

// All the {{variable}} keys used across a template's design elements.
export function getUsedVariables(template) {
  const els = template?.config?.designElements || []
  const used = new Set()
  for (const el of els) {
    const content = el?.content || ''
    const matches = content.match(/\{\{\s*([a-zA-Z_]+)\s*\}\}/g) || []
    matches.forEach((m) => used.add(m.replace(/[{}]/g, '').trim()))
    // Photo/image element → the client needs the couple/photo upload.
    if (el?.type === 'photo') used.add('__photo__')
  }
  return used
}

// The set of form field names the template makes relevant (drives visibility).
export function getVisibleFields(template) {
  const used = getUsedVariables(template)
  const fields = new Set(ALWAYS_VISIBLE_FIELDS)
  used.forEach((v) => { if (VAR_TO_FIELD[v]) fields.add(VAR_TO_FIELD[v]) })
  if (used.has('__photo__')) fields.add('__photo__')
  return fields
}

// Does the template use any of the wedding programme (commune/eglise/reception)
// variables? Used to decide whether to show the Programme step at all.
export function templateUsesProgramme(template) {
  const f = getVisibleFields(template)
  return ['communeDate', 'communeTime', 'communeVenue', 'communeAddress',
    'egliseDate', 'egliseTime', 'egliseVenue', 'egliseAddress',
    'receptionDate', 'receptionStartTime', 'receptionVenue', 'receptionAddress']
    .some((k) => f.has(k))
}
