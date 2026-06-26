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

module.exports = { DATE_VARIABLE_KEYS, DEFAULT_DATE_FORMAT, formatEventDate, dateComponents, componentVars };
