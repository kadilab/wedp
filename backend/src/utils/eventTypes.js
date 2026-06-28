// Shared event-type taxonomy (backend mirror of frontend/src/utils/eventTypes.js).
// Drives which fields are required/persisted per event type and how the
// human-readable title is composed.

const EVENT_TYPES = ['WEDDING', 'BIRTHDAY', 'DOT', 'CEREMONY', 'CONFERENCE', 'OTHER'];

const EVENT_TYPE_LABELS = {
  WEDDING: 'Mariage',
  BIRTHDAY: 'Anniversaire',
  DOT: 'Mariage coutumier',
  CEREMONY: 'Cérémonie',
  CONFERENCE: 'Conférence',
  OTHER: 'Autre événement'
};

const normalize = (eventType) => eventType || 'WEDDING';

// Two protagonists (bride + groom names).
const eventUsesCouple = (eventType) =>
  ['WEDDING', 'DOT'].includes(normalize(eventType));

// A single celebrated person (the title is auto-composed, e.g. "Anniversaire de X").
const eventUsesHonoree = (eventType) =>
  ['BIRTHDAY', 'CEREMONY'].includes(normalize(eventType));

// Free-text title supplied by the organiser.
const eventUsesFreeTitle = (eventType) =>
  ['CONFERENCE', 'OTHER'].includes(normalize(eventType));

// Full 3-step programme (commune / église / réception) — weddings only.
const eventUsesProgramme = (eventType) => normalize(eventType) === 'WEDDING';

// Seated tables (sit-down meal): weddings, dots, ceremonies.
const eventUsesTables = (eventType) =>
  eventUsesCouple(eventType) || normalize(eventType) === 'CEREMONY';

// Couple / plus-one (accompagnants) invitations: weddings & dots only.
const eventUsesPlusOnes = (eventType) => eventUsesCouple(eventType);

const GUEST_CATEGORY_OPTIONS = {
  WEDDING: ['Famille mariée', 'Famille marié', 'Amis mariée', 'Amis marié', 'Collègues', 'VIP'],
  DEFAULT: ['Famille', 'Amis', 'Collègues', 'VIP']
};

const getGuestCategoryOptions = (eventType) =>
  GUEST_CATEGORY_OPTIONS[normalize(eventType)] || GUEST_CATEGORY_OPTIONS.DEFAULT;

/**
 * Human-readable title for an event, coherent across event types.
 * - couple   → "Bride & Groom"
 * - honoree  → "Anniversaire de Sophie"
 * - free     → the supplied event title
 * Falls back gracefully so we never print "undefined & undefined".
 * @param {{eventType?: string, brideName?: string, groomName?: string, honoreeName?: string, eventTitle?: string}} ev
 */
function getEventDisplayTitle(ev) {
  if (!ev) return 'Événement';
  const type = normalize(ev.eventType);
  if (eventUsesCouple(type) && (ev.brideName || ev.groomName)) {
    return `${ev.brideName || ''} & ${ev.groomName || ''}`.trim();
  }
  if (eventUsesHonoree(type) && ev.honoreeName) {
    return `${EVENT_TYPE_LABELS[type]} de ${ev.honoreeName}`;
  }
  return ev.eventTitle || EVENT_TYPE_LABELS[type] || 'Événement';
}

module.exports = {
  EVENT_TYPES,
  EVENT_TYPE_LABELS,
  eventUsesCouple,
  eventUsesHonoree,
  eventUsesFreeTitle,
  eventUsesProgramme,
  eventUsesTables,
  eventUsesPlusOnes,
  getGuestCategoryOptions,
  getEventDisplayTitle
};
