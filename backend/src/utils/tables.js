// Helpers for an event's tables. Backward compatible: a table can be a plain
// string (legacy) or an object { name, seats, x, y }. Guests reference a table
// by its NAME (Guest.tableNumber).

function tableName(t) {
  if (!t) return '';
  return typeof t === 'string' ? t.trim() : String(t.name || '').trim();
}

// Normalize a tables array to objects, dedupe by name, keep seats/x/y, and
// auto-lay-out (grid) any table missing a position so the canvas isn't stacked.
function normalizeTables(arr) {
  if (!Array.isArray(arr)) return [];
  const seen = new Set();
  const out = [];
  for (const raw of arr) {
    const name = tableName(raw);
    if (!name || seen.has(name)) continue;
    seen.add(name);
    const obj = typeof raw === 'object' && raw ? raw : {};
    const seats = Number.isFinite(Number(obj.seats)) && Number(obj.seats) > 0 ? Math.floor(Number(obj.seats)) : null;
    const x = Number.isFinite(Number(obj.x)) ? Number(obj.x) : null;
    const y = Number.isFinite(Number(obj.y)) ? Number(obj.y) : null;
    out.push({ name, seats, x, y });
  }
  // Auto-grid for tables without a saved position (240px cells, 3 per row).
  let i = 0;
  for (const t of out) {
    if (t.x === null || t.y === null) {
      t.x = 30 + (i % 3) * 240;
      t.y = 30 + Math.floor(i / 3) * 230;
    }
    i++;
  }
  return out;
}

module.exports = { tableName, normalizeTables };
