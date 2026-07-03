import { buildMapsUrl, venueLine } from '../../utils/mapLink'

// A clickable "map / directions" card shown on the invitation. Clicking opens
// Google Maps (directions) for the event venue. Self-contained (no external map
// tiles): a stylised map-ish backdrop + pin, the venue name/address and a CTA.
// `interactive` makes it a real link (public invitation); otherwise a static
// preview (editor / gallery). Styling comes from the element (colours, radius).
export default function MapElement({ el = {}, wedding, interactive = false }) {
  const accent = el.color || '#df6746'
  const bg = el.fillColor || '#ffffff'
  const radius = el.borderRadius ?? 16
  const label = el.mapLabel || "Voir l'itinéraire"
  const venue = wedding?.venueName || el.mapPlaceholder || 'Lieu de l\'événement'
  const address = venueLine(wedding) || el.mapAddress || ''
  const href = interactive ? buildMapsUrl(wedding) : ''

  const card = (
    <div
      className="w-full h-full overflow-hidden flex flex-col"
      style={{ background: bg, borderRadius: radius, boxShadow: '0 2px 10px rgba(0,0,0,.08)', border: '1px solid rgba(0,0,0,.06)' }}
    >
      {/* Stylised map strip */}
      <div
        className="relative flex-1 min-h-0"
        style={{
          background: `#e8eef0`,
          backgroundImage: `repeating-linear-gradient(90deg, rgba(0,0,0,.05) 0 1px, transparent 1px 26px), repeating-linear-gradient(0deg, rgba(0,0,0,.05) 0 1px, transparent 1px 26px), linear-gradient(135deg, rgba(0,0,0,.03), rgba(0,0,0,0))`
        }}
      >
        {/* a couple of faux "roads" */}
        <div style={{ position: 'absolute', top: '38%', left: 0, right: 0, height: 6, background: '#fff', opacity: .8 }} />
        <div style={{ position: 'absolute', top: 0, bottom: 0, left: '58%', width: 6, background: '#fff', opacity: .8, transform: 'skewX(-12deg)' }} />
        {/* pin */}
        <div className="absolute inset-0 flex items-center justify-center">
          <svg viewBox="0 0 24 24" width="16%" height="16%" style={{ filter: 'drop-shadow(0 2px 2px rgba(0,0,0,.25))', minWidth: 26, minHeight: 26 }}>
            <path fill={accent} d="M12 2C7.9 2 4.5 5.4 4.5 9.5c0 5.2 6.3 11.3 7 11.9.3.3.7.3 1 0 .7-.6 7-6.7 7-11.9C19.5 5.4 16.1 2 12 2z" />
            <circle cx="12" cy="9.5" r="2.6" fill="#fff" />
          </svg>
        </div>
      </div>
      {/* Info bar */}
      <div className="shrink-0 px-3 py-2 flex items-center gap-2">
        <div className="min-w-0 flex-1">
          <p className="font-semibold text-gray-900 truncate" style={{ fontSize: '0.95em', lineHeight: 1.15 }}>{venue}</p>
          {address && <p className="text-gray-500 truncate" style={{ fontSize: '0.75em' }}>{address}</p>}
        </div>
        <span
          className="shrink-0 inline-flex items-center gap-1 rounded-full px-2.5 py-1 font-semibold text-white"
          style={{ background: accent, fontSize: '0.72em' }}
        >
          ➜ {label}
        </span>
      </div>
    </div>
  )

  if (href) {
    return (
      <a href={href} target="_blank" rel="noopener noreferrer" className="block w-full h-full no-underline" title={label}>
        {card}
      </a>
    )
  }
  return card
}
