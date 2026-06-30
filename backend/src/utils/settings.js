// Shared access to admin-configurable site settings (stored in the `setting`
// table). Used by server-side artifacts — generated PDFs/images, emails — so the
// brand name the admin sets in Settings appears everywhere ("made by",
// copyright, email branding…), not just in the web UI.
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const DEFAULT_SITE_NAME = 'WeddingInvite Pro';

// Read a single setting value (json settings are parsed). Returns `fallback`
// when missing or on any DB error — never throws, so callers stay simple.
async function getSetting(key, fallback = null) {
  try {
    const setting = await prisma.setting.findUnique({ where: { key } });
    if (!setting) return fallback;
    if (setting.type === 'json') {
      try { return JSON.parse(setting.value); } catch { return fallback; }
    }
    return setting.value ?? fallback;
  } catch {
    return fallback;
  }
}

// The brand/site name configured by the admin (Settings → Nom du site).
async function getSiteName() {
  const name = await getSetting('siteName', null);
  return (name && String(name).trim()) || DEFAULT_SITE_NAME;
}

module.exports = { getSetting, getSiteName, DEFAULT_SITE_NAME };
