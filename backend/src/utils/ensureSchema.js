// Self-healing for known production schema drift.
//
// The prod DB has drifted from the Prisma migration history (columns created by
// an old `db push` can be missing even though the migration is marked applied),
// which makes Prisma throw P2022 on any full-row read/write. This runs at server
// startup and adds any missing columns listed below. It is idempotent (only ADDs
// what is missing, never drops) and cheap (a few information_schema checks), so
// it's safe to run on every boot and is a no-op once the schema is correct.
//
// 👉 HOW TO ADD A NEW COLUMN (so every server self-heals, incl. new VPS/Docker):
//    add one line under the right table in SCHEMA_PATCHES below, mirroring the
//    `@map` name + type from schema.prisma. Deploy — the next boot adds it.
const logger = require('./logger');

// table (DB name) -> { column (DB name): "ADD COLUMN ... DDL" }
const SCHEMA_PATCHES = {
  creator_bank_accounts: {
    routing_number: "ADD COLUMN `routing_number` VARCHAR(191) NULL",
    iban:           "ADD COLUMN `iban` VARCHAR(191) NULL",
    swift_code:     "ADD COLUMN `swift_code` VARCHAR(191) NULL",
    account_type:   "ADD COLUMN `account_type` VARCHAR(191) NOT NULL DEFAULT 'checking'",
    currency:       "ADD COLUMN `currency` VARCHAR(191) NOT NULL DEFAULT 'USD'",
    is_default:     "ADD COLUMN `is_default` BOOLEAN NOT NULL DEFAULT true",
    is_verified:    "ADD COLUMN `is_verified` BOOLEAN NOT NULL DEFAULT false",
    verified_at:    "ADD COLUMN `verified_at` DATETIME(3) NULL",
    created_at:     "ADD COLUMN `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3)",
    updated_at:     "ADD COLUMN `updated_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3)",
  },
  weddings: {
    // QR / barcode: the code style is defined on the template and inherited here.
    code_type: "ADD COLUMN `code_type` VARCHAR(191) NULL DEFAULT 'qr'",
  },
};

async function tableExists(prisma, table) {
  const rows = await prisma.$queryRawUnsafe(
    `SELECT COUNT(*) AS n FROM information_schema.TABLES
     WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ?`,
    table
  );
  return Number(rows?.[0]?.n || 0) > 0;
}

async function columnExists(prisma, table, column) {
  const rows = await prisma.$queryRawUnsafe(
    `SELECT COUNT(*) AS n FROM information_schema.COLUMNS
     WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND COLUMN_NAME = ?`,
    table, column
  );
  return Number(rows?.[0]?.n || 0) > 0;
}

// Reconcile a single table: add any missing columns. Idempotent.
async function ensureTable(prisma, table, columns) {
  // If the table itself is missing, migrations haven't run — leave that to
  // `prisma migrate deploy` (entrypoint) rather than creating it here.
  if (!(await tableExists(prisma, table))) {
    logger.info(`ensureSchema: ${table} not found yet (skipped)`);
    return;
  }
  let added = 0;
  for (const [col, ddl] of Object.entries(columns)) {
    if (await columnExists(prisma, table, col)) continue;
    await prisma.$executeRawUnsafe(`ALTER TABLE \`${table}\` ${ddl}`);
    added++;
    logger.warn(`ensureSchema: added missing column ${table}.${col}`);
  }
  logger.info(added > 0
    ? `ensureSchema: reconciled ${table} (${added} column(s) added)`
    : `ensureSchema: ${table} OK (no drift)`);
}

// Best-effort: never block or crash startup on a reconciliation failure.
async function ensureSchema(prisma) {
  for (const [table, columns] of Object.entries(SCHEMA_PATCHES)) {
    try {
      await ensureTable(prisma, table, columns);
    } catch (err) {
      logger.error(`ensureSchema failed for ${table} (non-fatal):`, err.message);
    }
  }
}

// Back-compat export (previously the only reconciler).
async function ensureCreatorBankAccounts(prisma) {
  await ensureTable(prisma, 'creator_bank_accounts', SCHEMA_PATCHES.creator_bank_accounts);
}

module.exports = { ensureSchema, ensureCreatorBankAccounts, ensureTable, SCHEMA_PATCHES };
