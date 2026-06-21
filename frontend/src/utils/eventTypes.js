// Shared event-type metadata used across event creation/edition, the template
// gallery and the guest list. WEDDING is the only type with a full programme
// (mairie/église/réception); every other type is a simple date/heure/lieu event.

export const EVENT_TYPES = ['WEDDING', 'BIRTHDAY', 'DOT', 'CEREMONY', 'CONFERENCE', 'OTHER']

export const EVENT_TYPE_LABELS = {
  WEDDING: 'Mariage',
  BIRTHDAY: 'Anniversaire',
  DOT: 'Dot',
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
