#!/usr/bin/env node
// One-shot schema reconciliation. Adds any missing columns declared in
// src/utils/ensureSchema.js (idempotent, never drops). Safe to run any time.
//
// Usage:
//   node scripts/sync-schema.js
// In Docker (from the host):
//   docker exec <backend-container> node scripts/sync-schema.js
//
// The same logic also runs automatically at server startup, so a plain restart
// of the backend container reconciles the schema too — this script just lets you
// apply it without a restart.
require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const { ensureSchema } = require('../src/utils/ensureSchema');

(async () => {
  const prisma = new PrismaClient();
  try {
    await ensureSchema(prisma);
    console.log('✅ Schema reconciled (missing columns added if any).');
    process.exit(0);
  } catch (err) {
    console.error('❌ Schema sync failed:', err.message);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
})();
