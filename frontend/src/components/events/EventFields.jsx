// Event form building blocks shared by the creation wizard (WeddingCreate) and
// the edit page (WeddingEdit), so both ask for the same fields, with the same
// labels and the same per-event-type rules:
//   couple  (WEDDING, DOT)          → bride + groom names
//   honoree (BIRTHDAY, CEREMONY)    → one name, title "Anniversaire de X"
//   free    (CONFERENCE, OTHER)     → free title
//   programme (WEDDING only)        → commune / église / réception
import {
  HeartIcon, CalendarDaysIcon, MapPinIcon, ChatBubbleBottomCenterTextIcon,
  BuildingLibraryIcon, MusicalNoteIcon, PencilSquareIcon, UserIcon, SwatchIcon
} from '@heroicons/react/24/outline'
import {
  EVENT_TYPE_LABELS, eventUsesCouple, eventUsesHonoree, eventUsesProgramme,
  eventUsesTables, honoreeFieldLabel, getEventDisplayTitle
} from '../../utils/eventTypes'

export const ChurchIcon = ({ className }) => (
  <svg className={className} fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
    <path d="M18 12.22V9l-5-2.5V5h1V3h-1V1h-2v2h-1v2h1v1.5L6 9v3.22l-2 1V22h8v-3c0-1.1.9-2 2-2s2 .9 2 2v3h8v-8.78l-2-1zM12 13.5c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2z" />
  </svg>
)

const showAll = () => true

// Fields each step must validate before moving on (react-hook-form `trigger`).
export function identityFieldNames(eventType) {
  if (eventUsesCouple(eventType)) return ['brideName', 'groomName', 'weddingDate']
  if (eventUsesHonoree(eventType)) return ['honoreeName', 'weddingDate']
  return ['eventTitle', 'weddingDate']
}

// Label of the "who / what" step, per type.
export function identityStepLabel(eventType) {
  if (eventUsesCouple(eventType)) return 'Mariés'
  if (eventUsesHonoree(eventType)) return eventType === 'BIRTHDAY' ? 'Personne fêtée' : 'Personne à l\'honneur'
  return 'Événement'
}

export function Section({ id, icon: Icon, title, description, children, className = '' }) {
  return (
    <section id={id} className={`scroll-mt-32 rounded-2xl border border-border bg-surface p-5 sm:p-8 ${className}`}>
      {title && (
        <header className="mb-6">
          <h2 className="text-lg sm:text-xl font-serif font-bold text-content flex items-center gap-2">
            {Icon && <Icon className="h-6 w-6 text-primary-500 shrink-0" />}
            {title}
          </h2>
          {description && <p className="text-sm text-muted mt-1">{description}</p>}
        </header>
      )}
      <div className="space-y-6">{children}</div>
    </section>
  )
}

function FieldError({ message }) {
  return message ? <p className="mt-1 text-sm text-red-600" role="alert">{message}</p> : null
}

// Who / what + main date and time.
export function IdentityFields({ eventType, register, errors = {}, watch, serverError = () => null }) {
  const err = (name) => errors[name]?.message || serverError(name)?.message
  const cls = (name) => `input ${err(name) ? 'input-error' : ''}`
  const isWedding = eventUsesProgramme(eventType)

  return (
    <>
      {eventUsesCouple(eventType) ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label htmlFor="brideName" className="label">Prénom de la mariée *</label>
            <input id="brideName" type="text" className={cls('brideName')} placeholder="Grâce" autoComplete="off"
              {...register('brideName', { required: 'Indiquez le prénom de la mariée' })} />
            <FieldError message={err('brideName')} />
          </div>
          <div>
            <label htmlFor="groomName" className="label">Prénom du marié *</label>
            <input id="groomName" type="text" className={cls('groomName')} placeholder="Patrick" autoComplete="off"
              {...register('groomName', { required: 'Indiquez le prénom du marié' })} />
            <FieldError message={err('groomName')} />
          </div>
        </div>
      ) : eventUsesHonoree(eventType) ? (
        <div>
          <label htmlFor="honoreeName" className="label">{honoreeFieldLabel(eventType)} *</label>
          <input id="honoreeName" type="text" className={cls('honoreeName')} placeholder={eventType === 'BIRTHDAY' ? 'Sarah' : 'Grâce'} autoComplete="off"
            {...register('honoreeName', { required: 'Ce nom est requis' })} />
          <p className="mt-1 text-xs text-muted">
            Titre affiché sur l'invitation : « {EVENT_TYPE_LABELS[eventType]} de {watch('honoreeName') || '…'} »
          </p>
          <FieldError message={err('honoreeName')} />
        </div>
      ) : (
        <div>
          <label htmlFor="eventTitle" className="label">Titre de l'événement *</label>
          <input id="eventTitle" type="text" className={cls('eventTitle')} autoComplete="off"
            placeholder={eventType === 'CONFERENCE' ? 'Forum Numérique Kinshasa 2026' : 'Soirée de gala 2026'}
            {...register('eventTitle', { required: 'Indiquez le titre de l\'événement' })} />
          <FieldError message={err('eventTitle')} />
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <label htmlFor="weddingDate" className="label">{isWedding ? 'Date principale *' : 'Date *'}</label>
          <input id="weddingDate" type="date" className={cls('weddingDate')}
            {...register('weddingDate', { required: 'Choisissez la date' })} />
          <FieldError message={err('weddingDate')} />
        </div>
        <div>
          <label htmlFor="ceremonyTime" className="label">Heure</label>
          <input id="ceremonyTime" type="time" className="input" {...register('ceremonyTime')} />
          {isWedding && <p className="mt-1 text-xs text-muted">Les heures de chaque étape se règlent dans le programme.</p>}
        </div>
      </div>
    </>
  )
}

// Main venue (the only venue for every type except the wedding programme).
export function VenueFields({ eventType, register, showField = showAll }) {
  if (!(showField('venueName') || showField('venueAddress'))) return null
  const isWedding = eventUsesProgramme(eventType)
  return (
    <div className="space-y-4">
      <h3 className="font-medium text-content flex items-center gap-2">
        <MapPinIcon className="h-5 w-5 text-primary-500" />
        {isWedding ? 'Lieu principal' : 'Lieu'}
        {isWedding && <span className="text-xs font-normal text-muted">— facultatif si le programme est détaillé</span>}
      </h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label htmlFor="venueName" className="label text-sm">Nom du lieu</label>
          <input id="venueName" type="text" className="input" placeholder="Salle Pullman, domicile familial…" {...register('venueName')} />
        </div>
        <div>
          <label htmlFor="venueCity" className="label text-sm">Ville</label>
          <input id="venueCity" type="text" className="input" placeholder="Kinshasa" {...register('venueCity')} />
        </div>
      </div>
      <div>
        <label htmlFor="venueAddress" className="label text-sm">Adresse</label>
        <input id="venueAddress" type="text" className="input" placeholder="Avenue, numéro, commune" {...register('venueAddress')} />
      </div>
      {showField('venueMapUrl') && (
        <div>
          <label htmlFor="venueMapUrl" className="label text-sm">Lien Google Maps <span className="text-muted font-normal">— bouton « itinéraire »</span></label>
          <input id="venueMapUrl" type="url" className="input" placeholder="https://maps.google.com/…" {...register('venueMapUrl')} />
          <p className="text-xs text-muted mt-1">Facultatif — sinon l'itinéraire est calculé depuis le nom et l'adresse.</p>
        </div>
      )}
    </div>
  )
}

const PROGRAMME_BLOCKS = [
  {
    key: 'commune', title: 'Mariage civil', subtitle: 'Maison communale', icon: BuildingLibraryIcon,
    tone: 'bg-blue-50 border-blue-200 dark:bg-blue-500/10 dark:border-blue-500/30', dot: 'bg-blue-500',
    fields: [
      ['communeDate', 'Date', 'date'], ['communeTime', 'Heure', 'time'],
      ['communeVenue', 'Nom', 'text', 'Maison communale de la Gombe'], ['communeAddress', 'Adresse', 'text', 'Avenue, commune']
    ]
  },
  {
    key: 'eglise', title: 'Mariage religieux', subtitle: 'Église', icon: ChurchIcon,
    tone: 'bg-purple-50 border-purple-200 dark:bg-purple-500/10 dark:border-purple-500/30', dot: 'bg-purple-500',
    fields: [
      ['egliseDate', 'Date', 'date'], ['egliseTime', 'Heure', 'time'],
      ['egliseVenue', 'Nom', 'text', 'Cathédrale Notre-Dame du Congo'], ['egliseAddress', 'Adresse', 'text', 'Avenue, commune']
    ]
  },
  {
    key: 'reception', title: 'Réception & soirée', subtitle: 'Fête et célébration', icon: MusicalNoteIcon,
    tone: 'bg-pink-50 border-pink-200 dark:bg-pink-500/10 dark:border-pink-500/30', dot: 'bg-pink-500',
    fields: [
      ['receptionDate', 'Date', 'date'], ['receptionStartTime', 'Heure de début', 'time'],
      ['receptionVenue', 'Nom du lieu', 'text', 'Fleuve Congo Hôtel'], ['receptionAddress', 'Adresse', 'text', 'Avenue, commune']
    ]
  }
]

export const PROGRAMME_FIELDS = PROGRAMME_BLOCKS.flatMap(b => b.fields.map(f => f[0]))

// Wedding programme (commune / église / réception). Blocks the template does
// not use are hidden.
export function ProgrammeFields({ register, showField = showAll }) {
  const blocks = PROGRAMME_BLOCKS.filter(b => b.fields.some(([name]) => showField(name)))
  return (
    <div className="space-y-4">
      {blocks.map((b) => (
        <div key={b.key} className={`rounded-xl border p-4 sm:p-6 ${b.tone}`}>
          <div className="flex items-center gap-3 mb-4">
            <span className={`w-10 h-10 rounded-full flex items-center justify-center ${b.dot}`}>
              <b.icon className="h-5 w-5 text-white" />
            </span>
            <div>
              <h3 className="font-semibold text-content">{b.title}</h3>
              <p className="text-sm text-muted">{b.subtitle}</p>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {b.fields.map(([name, label, type, placeholder]) => (
              <div key={name}>
                <label htmlFor={name} className="label text-sm">{label}</label>
                <input id={name} type={type} className="input bg-white dark:bg-surface" placeholder={placeholder} {...register(name)} />
              </div>
            ))}
          </div>
        </div>
      ))}
      <p className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800 dark:bg-amber-500/10 dark:border-amber-500/30 dark:text-amber-300">
        💡 Seules les étapes renseignées apparaissent sur vos invitations.
      </p>
    </div>
  )
}

// Message + RSVP deadline + practical info.
export function MessageFields({ eventType, register, showField = showAll }) {
  const placeholder = eventUsesCouple(eventType)
    ? 'Nous avons la joie de vous inviter à célébrer notre union…'
    : eventType === 'CONFERENCE'
      ? 'Nous avons le plaisir de vous convier à…'
      : 'Nous avons le plaisir de vous inviter…'
  if (!showField('customMessage') && !showField('rsvpDeadline') && !showField('additionalInfo')) return null
  return (
    <div className="space-y-4">
      {showField('customMessage') && (
        <div>
          <label htmlFor="customMessage" className="label">Message personnalisé</label>
          <textarea id="customMessage" className="input" rows={3} placeholder={placeholder} {...register('customMessage')} />
        </div>
      )}
      {showField('rsvpDeadline') && (
        <div className="md:w-1/2">
          <label htmlFor="rsvpDeadline" className="label">Date limite de confirmation (RSVP)</label>
          <input id="rsvpDeadline" type="date" className="input" {...register('rsvpDeadline')} />
        </div>
      )}
      {showField('additionalInfo') && (
        <div>
          <label htmlFor="additionalInfo" className="label">Informations pratiques</label>
          <textarea id="additionalInfo" className="input" rows={2}
            placeholder={eventType === 'CONFERENCE' ? 'Badge à l\'accueil, parking…' : 'Dress code, parking…'}
            {...register('additionalInfo')} />
        </div>
      )}
    </div>
  )
}

// --------------------------------------------------------------- summary

const fmtDate = (v) => {
  if (!v) return null
  const d = new Date(`${String(v).slice(0, 10)}T12:00:00`)
  return Number.isNaN(d.getTime()) ? null : d.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
}
const join = (...parts) => parts.filter(Boolean).join(' · ')

function SummaryBlock({ icon: Icon, title, onEdit, children }) {
  return (
    <div className="py-4 first:pt-0 last:pb-0">
      <div className="flex items-center justify-between gap-3 mb-1.5">
        <p className="text-xs font-semibold uppercase tracking-wide text-muted flex items-center gap-1.5">
          <Icon className="h-4 w-4" /> {title}
        </p>
        {onEdit && (
          <button type="button" onClick={onEdit} className="inline-flex items-center gap-1 text-xs font-medium text-primary-600 hover:text-primary-800">
            <PencilSquareIcon className="h-3.5 w-3.5" /> Modifier
          </button>
        )}
      </div>
      <div className="text-sm text-content space-y-0.5">{children}</div>
    </div>
  )
}

const Missing = ({ children = 'Non renseigné' }) => <span className="text-muted italic">{children}</span>

/**
 * Read-only recap of everything entered, with "Modifier" shortcuts.
 * onEdit(section) with section ∈ 'type' | 'design' | 'info' | 'programme'.
 */
export function EventSummary({ eventType, values, template, onEdit, showProgramme }) {
  const programme = PROGRAMME_BLOCKS
    .map(b => {
      const [d, t, v, a] = b.fields.map(([name]) => values[name])
      return (d || t || v || a) ? { title: b.title, line: join(fmtDate(d), t, v, a) } : null
    })
    .filter(Boolean)
  const tables = Array.isArray(values.tables) ? values.tables.length : 0
  const drinks = Array.isArray(values.drinkOptions) ? values.drinkOptions.length : 0

  return (
    <div className="divide-y divide-border">
      <SummaryBlock icon={HeartIcon} title="Événement" onEdit={() => onEdit?.('type')}>
        <p className="font-semibold">{getEventDisplayTitle({ ...values, eventType })}</p>
        <p className="text-muted">{EVENT_TYPE_LABELS[eventType]}</p>
      </SummaryBlock>

      <SummaryBlock icon={SwatchIcon} title="Modèle" onEdit={() => onEdit?.('design')}>
        {template ? (
          <p>
            {template.name}
            <span className="text-muted"> · {parseFloat(template.pricePerInvitation) > 0
              ? `${parseFloat(template.pricePerInvitation).toLocaleString('fr-FR')} FC / invitation`
              : 'Gratuit'}</span>
          </p>
        ) : <Missing>Aucun modèle choisi</Missing>}
      </SummaryBlock>

      <SummaryBlock icon={CalendarDaysIcon} title="Date & lieu" onEdit={() => onEdit?.('info')}>
        <p className="first-letter:uppercase">{join(fmtDate(values.weddingDate), values.ceremonyTime) || <Missing>Date non renseignée</Missing>}</p>
        {(values.venueName || values.venueAddress || values.venueCity)
          ? <p className="text-muted">{join(values.venueName, values.venueAddress, values.venueCity)}</p>
          : !showProgramme && <p><Missing>Lieu non renseigné</Missing></p>}
      </SummaryBlock>

      {showProgramme && (
        <SummaryBlock icon={BuildingLibraryIcon} title="Programme" onEdit={() => onEdit?.('programme')}>
          {programme.length ? programme.map(p => (
            <p key={p.title}><span className="font-medium">{p.title}</span> <span className="text-muted">— {p.line}</span></p>
          )) : <Missing>Aucune étape renseignée</Missing>}
        </SummaryBlock>
      )}

      <SummaryBlock icon={ChatBubbleBottomCenterTextIcon} title="Message" onEdit={() => onEdit?.('info')}>
        {values.customMessage ? <p className="whitespace-pre-line line-clamp-4">{values.customMessage}</p> : <Missing>Aucun message</Missing>}
        {values.rsvpDeadline && <p className="text-muted">Confirmation avant le {fmtDate(values.rsvpDeadline)}</p>}
      </SummaryBlock>

      {(eventUsesTables(eventType) || drinks > 0) && (
        <SummaryBlock icon={UserIcon} title="Réception des invités" onEdit={() => onEdit?.('info')}>
          {eventUsesTables(eventType) && <p>{tables ? `${tables} table${tables > 1 ? 's' : ''} prévue${tables > 1 ? 's' : ''}` : <Missing>Aucune table (modifiable plus tard)</Missing>}</p>}
          {drinks > 0 && <p>{drinks} boisson{drinks > 1 ? 's' : ''} au choix</p>}
        </SummaryBlock>
      )}
    </div>
  )
}
