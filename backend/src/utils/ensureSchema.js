// Self-healing for known production schema drift.
//
// The prod DB has drifted from the Prisma migration history (columns created by
// an old `db push` can be missing even though the migration is marked applied),
// which makes Prisma throw P2022 on any full-row read/write — e.g. adding a
// creator Mobile Money account 500s. This runs at server startup and adds any
// missing columns to `creator_bank_accounts`. It is idempotent (only ADDs what
// is missing, never drops) and cheap (a handful of information_schema checks),
// so it's safe to run on every boot and does nothing once the schema is correct.
const logger = require('./logger');

const TABLE = 'creator_bank_accounts';

// column -> DDL used when the column is missing (mirrors schema.prisma).
const COLUMNS = {
  routing_number: "ADD COLUMN `routing_number` VARCHAR(191) NULL",
  iban:           "ADD COLUMN `iban` VARCHAR(191) NULL",
  swift_code:     "ADD COLUMN `swift_code` VARCHAR(191) NULL",
  account_type:   "ADD COLUMN `account_type` VARCHAR(191) NOT NULL DEFAULT 'checking'",
  currency:       "ADD COLUMN `currency` VARCHAR(191) NOT NULL DEFAULT 'USD'",
  is_default:     "ADD COLUMN `is_default` BOOLEAN NOT NULL DEFAULT true",
  is_verified:    "ADD COLUMN `is_verified` BOOLEAN NOT NULL DEFAULT false",
  verified_at:    "ADD COLUMN `verified_at` DATETIME(3) NULL",
  created_at:     "ADD COLUMN `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3)",
  updated_at:     "ADD COLUMN `updated_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3)"
};

async function ensureCreatorBankAccounts(prisma) {
  // If the table doesn't exist at all, migrations haven't run — leave that to
  // `prisma migrate deploy` (entrypoint) rather than creating it here.
  const tbl = await prisma.$queryRawUnsafe(
    `SELECT COUNT(*) AS n FROM information_schema.TABLES
     WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ?`,
    TABLE
  );
  if (Number(tbl?.[0]?.n || 0) === 0) {
    logger.info(`ensureSchema: ${TABLE} not found yet (skipped)`);
    return;
  }

  let added = 0;
  for (const [col, ddl] of Object.entries(COLUMNS)) {
    const rows = await prisma.$queryRawUnsafe(
      `SELECT COUNT(*) AS n FROM information_schema.COLUMNS
       WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND COLUMN_NAME = ?`,
      TABLE, col
    );
    if (Number(rows?.[0]?.n || 0) > 0) continue;
    await prisma.$executeRawUnsafe(`ALTER TABLE \`${TABLE}\` ${ddl}`);
    added++;
    logger.warn(`ensureSchema: added missing column ${TABLE}.${col}`);
  }
  logger.info(added > 0
    ? `ensureSchema: reconciled ${TABLE} (${added} column(s) added)`
    : `ensureSchema: ${TABLE} OK (no drift)`);
}

// Best-effort: never block or crash startup on a reconciliation failure.
async function ensureSchema(prisma) {
  try {
    await ensureCreatorBankAccounts(prisma);
  } catch (err) {
    logger.error('ensureSchema failed (non-fatal):', err.message);
  }
}

module.exports = { ensureSchema, ensureCreatorBankAccounts };
