// Server-side mirror of frontend/src/utils/dateFormats.js so generated PDFs /
// images format date variables exactly like the editor and the public page.

const DATE_VARIABLE_KEYS = [
  'wedding_date',
  'rsvp_date',
  'commune_date',
  'eglise_date',
  'reception_date'
];

const DEFAULT_DATE_FORMAT = 'datetime';

function parseDate(value) {
  if (!value) return null;
  // Prisma returns Date objects; the API returns ISO strings. Handle both.
  if (value instanceof Date) return isNaN(value.getTime()) ? null : value;
  let d = new Date(value); // ISO / RFC strings parse directly
  if (isNaN(d.getTime()) && typeof value === 'string') {
    d = new Date(value.replace(' ', 'T')); // fallback for "YYYY-MM-DD HH:mm"
  }
  return isNaN(d.getTime()) ? null : d;
}

function formatEventDate(value, format = DEFAULT_DATE_FORMAT) {
  const d = parseDate(value);
  if (!d) return value || '';
  const pad = (n) => n.toString().padStart(2, '0');
  const day = pad(d.getDate());
  const month = pad(d.getMonth() + 1);
  const year = d.getFullYear();
  const time = `${pad(d.getHours())}:${pad(d.getMinutes())}`;

  switch (format) {
    case 'date':
      return `${day}-${month}-${year}`;
    case 'date_slash':
      return `${day}/${month}/${year}`;
    case 'date_long':
      return d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });
    case 'date_full':
      return d.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
    case 'date_long_time':
      return `${d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })} à ${time}`;
    case 'time':
      return time;
    case 'datetime':
    default:
      return `${day}-${month}-${year} ${time}`;
  }
}

// Separated, uppercase French date components for variables like
// {{wedding_day_name}} / {{commune_month_name}} / {{rsvp_year}}.
function dateComponents(value) {
  const d = parseDate(value);
  if (!d) return { day_name: '', day_num: '', month_name: '', year: '' };
  return {
    day_name: d.toLocaleDateString('fr-FR', { weekday: 'long' }).toUpperCase(),
    day_num: String(d.getDate()),
    month_name: d.toLocaleDateString('fr-FR', { month: 'long' }).toUpperCase(),
    year: String(d.getFullYear())
  };
}

// Build the full {prefix}_day_name / _day_num / _month_name / _year map for a
// set of named dates, e.g. componentVars({ wedding: date, commune: date }).
function componentVars(named) {
  const out = {};
  for (const [prefix, value] of Object.entries(named)) {
    const c = dateComponents(value);
    out[`${prefix}_day_name`] = c.day_name;
    out[`${prefix}_day_num`] = c.day_num;
    out[`${prefix}_month_name`] = c.month_name;
    out[`${prefix}_year`] = c.year;
  }
  return out;
}

// --- Standalone time variables ("HH:mm" strings) with a format choice ---
const TIME_VARIABLE_KEYS = ['ceremony_time', 'commune_time', 'eglise_time', 'reception_time'];
const DEFAULT_TIME_FORMAT = 'colon';

function parseTime(value) {
  if (!value) return null;
  const s = String(value).trim();
  const m = s.match(/^(\d{1,2})\s*[:hH]\s*(\d{1,2})/);
  if (m) {
    const h = parseInt(m[1], 10);
    const min = parseInt(m[2], 10);
    if (!isNaN(h) && !isNaN(min)) return { h, min };
  }
  const m2 = s.match(/^(\d{1,2})\s*[hH]?$/);
  if (m2) { const h = parseInt(m2[1], 10); if (!isNaN(h)) return { h, min: 0 }; }
  return null;
}

function formatEventTime(value, format = DEFAULT_TIME_FORMAT) {
  const t = parseTime(value);
  if (!t) return value || '';
  const pad = (n) => n.toString().padStart(2, '0');
  const hh = pad(t.h);
  const mm = pad(t.min);
  switch (format) {
    case 'h':
      return `${hh}h${mm}`;
    case 'ampm': {
      const period = t.h >= 12 ? 'PM' : 'AM';
      const h12 = t.h % 12 === 0 ? 12 : t.h % 12;
      return `${h12}:${mm} ${period}`;
    }
    case 'colon':
    default:
      return `${hh}:${mm}`;
  }
}

function timeComponents(value) {
  const t = parseTime(value);
  if (!t) return { hour: '', minute: '' };
  const pad = (n) => n.toString().padStart(2, '0');
  return { hour: pad(t.h), minute: pad(t.min) };
}

function timeComponentVars(named) {
  const out = {};
  for (const [prefix, value] of Object.entries(named)) {
    const c = timeComponents(value);
    out[`${prefix}_hour`] = c.hour;
    out[`${prefix}_minute`] = c.minute;
  }
  return out;
}

// The first date variable used in a text (drives calendar rendering).
function getElementDateKey(text) {
  if (!text) return null;
  return DATE_VARIABLE_KEYS.find((k) => text.includes(`{{${k}}}`)) || null;
}

// Built-in marker shapes for the highlighted event day (mirror MiniCalendar.jsx).
const HEART_PATH = 'M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z';
const STAR_PATH = 'M12 2l2.9 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l7.1-1.01L12 2z';

// Server-side mini month calendar (HTML string) for generated PDFs/images.
// Plain JS (no date-fns) — mirrors frontend/components/templates/MiniCalendar.
// The highlighted day can use a circle/ring/heart/star or a creator image
// (markerUrl must already be an absolute or data: URL resolved by the caller).
function miniCalendarHTML(value, { accent = '#df6746', textColor = '#1f2937', marker = 'circle', markerUrl = '', markerSize = 1 } = {}) {
  const d = parseDate(value);
  if (!d) return '';
  const year = d.getFullYear(), month = d.getMonth(), day = d.getDate();
  const first = new Date(year, month, 1);
  const offset = (first.getDay() + 6) % 7; // Monday-start
  const gridStart = new Date(year, month, 1 - offset);
  const weekdays = ['lun', 'mar', 'mer', 'jeu', 'ven', 'sam', 'dim'];
  const title = d.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' });
  const head = weekdays.map((w) =>
    `<div style="display:flex;align-items:center;justify-content:center;opacity:.6;font-size:.7em;text-transform:capitalize;font-weight:500">${w}</div>`
  ).join('');

  const shape = (marker === 'image' && markerUrl) ? 'image' : marker;
  const numColor = shape === 'ring' ? accent : '#fff';
  const numShadow = shape === 'image' ? 'text-shadow:0 1px 2px rgba(0,0,0,.55);' : '';
  const markerLayer = shape === 'image'
    ? `<img src="${markerUrl}" style="width:100%;height:100%;object-fit:contain" />`
    : (shape === 'heart' || shape === 'star')
    ? `<svg viewBox="0 0 24 24" style="width:100%;height:100%;display:block"><path d="${shape === 'heart' ? HEART_PATH : STAR_PATH}" fill="${accent}"/></svg>`
    : shape === 'ring'
    ? `<span style="width:100%;height:100%;border-radius:9999px;border:0.13em solid ${accent}"></span>`
    : `<span style="width:100%;height:100%;border-radius:9999px;background:${accent}"></span>`;

  let cells = '';
  for (let i = 0; i < 42; i++) {
    const cur = new Date(gridStart.getFullYear(), gridStart.getMonth(), gridStart.getDate() + i);
    const isDay = cur.getFullYear() === year && cur.getMonth() === month && cur.getDate() === day;
    const inMonth = cur.getMonth() === month;
    const scale = markerSize && markerSize !== 1 ? `transform:scale(${markerSize});` : '';
    const span = isDay
      ? `<span style="position:relative;display:inline-flex;align-items:center;justify-content:center;width:1.9em;height:1.9em">`
        + `<span style="position:absolute;inset:0;display:flex;align-items:center;justify-content:center;${scale}">${markerLayer}</span>`
        + `<span style="position:relative;color:${numColor};font-weight:700;${numShadow}">${cur.getDate()}</span></span>`
      : `<span style="display:inline-flex;align-items:center;justify-content:center;width:1.7em;height:1.7em;color:${textColor};opacity:${inMonth ? 1 : 0.28}">${cur.getDate()}</span>`;
    cells += `<div style="display:flex;align-items:center;justify-content:center;font-size:.8em">${span}</div>`;
  }
  return `<div style="width:100%;height:100%;display:flex;flex-direction:column;color:${textColor}">` +
    `<div style="text-align:center;font-weight:600;font-size:1.1em;text-transform:capitalize">${title}</div>` +
    `<div style="display:grid;grid-template-columns:repeat(7,1fr);margin-top:4px">${head}</div>` +
    `<div style="display:grid;grid-template-columns:repeat(7,1fr);flex:1;margin-top:2px">${cells}</div>` +
    `</div>`;
}

module.exports = { DATE_VARIABLE_KEYS, DEFAULT_DATE_FORMAT, formatEventDate, dateComponents, componentVars, TIME_VARIABLE_KEYS, DEFAULT_TIME_FORMAT, formatEventTime, timeComponents, timeComponentVars, getElementDateKey, miniCalendarHTML };
