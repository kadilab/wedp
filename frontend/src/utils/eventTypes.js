// Shared event-type metadata used across event creation/edition, the template
// gallery and the guest list. WEDDING is the only type with a full programme
// (mairie/église/réception); every other type is a simple date/heure/lieu event.

export const EVENT_TYPES = ['WEDDING', 'BIRTHDAY', 'DOT', 'CEREMONY', 'CONFERENCE', 'OTHER']

export const EVENT_TYPE_LABELS = {
  WEDDING: 'Mariage',
  BIRTHDAY: 'Anniversaire',
  DOT: 'Mariage coutumier',
  CEREMONY: 'Cérémonie',
  CONFERENCE: 'Conférence',
  OTHER: 'Autre événement'
}

const GUEST_CATEGORY_OPTIONS = {
  WEDDING: ['Famille mariée', 'Famille marié', 'Amis mariée', 'Amis marié', 'Collègues', 'VIP'],
  DEFAULT: ['Famille', 'Amis', 'Collègues', 'VIP']
}

export const getGuestCategoryOptions = (eventType) =>
  GUEST_CATEGORY_OPTIONS[eventType] || GUEST_CATEGORY_OPTIONS.DEFAULT

const isWeddingType = (eventType) => !eventType || eventType === 'WEDDING'

const norm = (eventType) => eventType || 'WEDDING'

// Two protagonists (bride + groom names): mariage & mariage coutumier.
export const eventUsesCouple = (eventType) =>
  ['WEDDING', 'DOT'].includes(norm(eventType))

// A single celebrated person — the title is auto-composed ("Anniversaire de X").
export const eventUsesHonoree = (eventType) =>
  ['BIRTHDAY', 'CEREMONY'].includes(norm(eventType))

// Free-text title supplied by the organiser (conférence, autre).
export const eventUsesFreeTitle = (eventType) =>
  ['CONFERENCE', 'OTHER'].includes(norm(eventType))

// Full 3-step programme (commune / église / réception) — weddings only.
export const eventUsesProgramme = (eventType) => norm(eventType) === 'WEDDING'

// Field label for the honoree, per type.
export const honoreeFieldLabel = (eventType) =>
  norm(eventType) === 'BIRTHDAY' ? 'Nom de la personne fêtée' : 'Nom de la personne à l\'honneur'

// Human-readable title, coherent across event types:
//  - couple   → "Bride & Groom"
//  - honoree  → "Anniversaire de Sophie"
//  - free     → the supplied title (fallback to the type label)
export const getEventDisplayTitle = (ev) => {
  if (!ev) return 'Événement'
  const type = norm(ev.eventType)
  if (eventUsesCouple(type) && (ev.brideName || ev.groomName)) {
    return `${ev.brideName || ''} & ${ev.groomName || ''}`.trim()
  }
  if (eventUsesHonoree(type) && ev.honoreeName) {
    return `${EVENT_TYPE_LABELS[type]} de ${ev.honoreeName}`
  }
  return ev.eventTitle || EVENT_TYPE_LABELS[type] || 'Événement'
}

// Seated table assignment only makes sense for events with a sit-down meal.
// Weddings, dots and ceremonies typically seat guests; birthdays, conferences
// and "other" are usually free-seating / standing, so we hide table fields.
export const eventUsesTables = (eventType) =>
  eventUsesCouple(eventType) || eventType === 'CEREMONY'

// Couple vs singleton (plus-one) invitations are a wedding/dot concept. For a
// conference or a birthday everyone is counted individually, so we hide the
// couple/singleton toggle and treat every guest as a single attendee.
export const eventUsesPlusOnes = (eventType) =>
  eventUsesCouple(eventType)
