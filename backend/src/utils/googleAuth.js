const { OAuth2Client } = require('google-auth-library');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// Same fallback as frontend/src/config/google.js — a real Client ID so Google
// sign-in works out of the box even before an admin (or a VPS .env) sets one.
// It's a public value by design (the secret, if ever needed, stays server-side).
const DEFAULT_CLIENT_ID = '1060642017708-cl6l3h5krjl93otqhtnk3moiecemrh8m.apps.googleusercontent.com';

// Single client instance — verifyIdToken() takes the audience per call, so it
// doesn't need to be pinned to a fixed Client ID at construction time.
const googleClient = new OAuth2Client();

// Configurable from Admin → Paramètres → Général (stored in the `Setting`
// table, same pattern as K-PAY/Telegram). DB value wins when non-empty,
// otherwise falls back to the env var, then the shared hardcoded default.
async function getGoogleConfig() {
  const rows = await prisma.setting.findMany({
    where: { key: { in: ['googleClientId', 'googleClientSecret'] } }
  });
  const db = {};
  rows.forEach(s => { db[s.key] = s.value; });

  return {
    clientId: (db.googleClientId && db.googleClientId.trim())
      || (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_ID.trim())
      || DEFAULT_CLIENT_ID,
    clientSecret: (db.googleClientSecret && db.googleClientSecret.trim())
      || (process.env.GOOGLE_CLIENT_SECRET && process.env.GOOGLE_CLIENT_SECRET.trim())
      || ''
  };
}

async function verifyGoogleIdToken(idToken) {
  const { clientId } = await getGoogleConfig();
  const ticket = await googleClient.verifyIdToken({ idToken, audience: clientId });
  return ticket.getPayload();
}

module.exports = { getGoogleConfig, verifyGoogleIdToken, DEFAULT_CLIENT_ID };
