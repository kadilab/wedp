// Build the best "directions" URL for an event's location. Prefers a maps link
// the client pasted (venueMapUrl); otherwise builds a Google Maps directions
// query from the venue name / address / city / country.
export function buildMapsUrl(w) {
  if (!w) return ''
  const url = (w.venueMapUrl || '').trim()
  if (/^https?:\/\//i.test(url)) return url
  const q = [w.venueName, w.venueAddress, w.venueCity, w.venueCountry].filter(Boolean).join(', ')
  if (!q) return ''
  return `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(q)}`
}

// A short one-line address for display on the map card.
export function venueLine(w) {
  return [w?.venueAddress, w?.venueCity].filter(Boolean).join(', ')
}
