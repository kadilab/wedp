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

// Seated table assignment only makes sense for events with a sit-down meal.
// Weddings, dots and ceremonies typically seat guests; birthdays, conferences
// and "other" are usually free-seating / standing, so we hide table fields.
export const eventUsesTables = (eventType) =>
  isWeddingType(eventType) || eventType === 'DOT' || eventType === 'CEREMONY'

// Couple vs singleton (plus-one) invitations are a wedding/dot concept. For a
// conference or a birthday everyone is counted individually, so we hide the
// couple/singleton toggle and treat every guest as a single attendee.
export const eventUsesPlusOnes = (eventType) =>
  isWeddingType(eventType) || eventType === 'DOT'
