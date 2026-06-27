// Lightweight supervision data (no extra DB table): visit stats and security
// events are kept as JSON in the Setting table; online users live in memory.
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const VISITS_KEY = 'visitStats';      // { total, days: { 'YYYY-MM-DD': n } }
const SECURITY_KEY = 'securityEvents'; // [{ type, email, ip, ua, at }]  (rolling)

const todayKey = () => new Date().toISOString().slice(0, 10);

async function readJson(key, fallback) {
  const row = await prisma.setting.findUnique({ where: { key } });
  if (!row?.value) return fallback;
  try { return JSON.parse(row.value); } catch { return fallback; }
}
async function writeJson(key, value, description) {
  await prisma.setting.upsert({
    where: { key },
    update: { value: JSON.stringify(value) },
    create: { key, value: JSON.stringify(value), type: 'json', description }
  });
}

// ---- Visits ----
async function recordVisit() {
  const stats = await readJson(VISITS_KEY, { total: 0, days: {} });
  stats.total = (stats.total || 0) + 1;
  stats.days = stats.days || {};
  const d = todayKey();
  stats.days[d] = (stats.days[d] || 0) + 1;
  // Keep only the last ~60 days to stay small.
  const keys = Object.keys(stats.days).sort();
  while (keys.length > 60) delete stats.days[keys.shift()];
  await writeJson(VISITS_KEY, stats, 'Statistiques de visites');
  return stats;
}

async function getVisitStats() {
  const stats = await readJson(VISITS_KEY, { total: 0, days: {} });
  const days = stats.days || {};
  const last7 = [];
  for (let i = 6; i >= 0; i--) {
    const dt = new Date(); dt.setDate(dt.getDate() - i);
    const key = dt.toISOString().slice(0, 10);
    last7.push({ date: key, count: days[key] || 0 });
  }
  return { total: stats.total || 0, today: days[todayKey()] || 0, last7 };
}

// ---- Security events ----
async function recordSecurityEvent(evt) {
  const events = await readJson(SECURITY_KEY, []);
  events.unshift({ ...evt, at: new Date().toISOString() });
  await writeJson(SECURITY_KEY, events.slice(0, 200), 'Journal de sécurité'); // rolling 200
}

async function getSecurityEvents(limit = 50) {
  const events = await readJson(SECURITY_KEY, []);
  const dayAgo = Date.now() - 24 * 60 * 60 * 1000;
  const last24h = events.filter(e => new Date(e.at).getTime() >= dayAgo).length;
  return { last24h, total: events.length, recent: events.slice(0, limit) };
}

module.exports = { recordVisit, getVisitStats, recordSecurityEvent, getSecurityEvents };
