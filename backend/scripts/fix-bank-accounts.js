/**
 * Idempotent reconciliation for `creator_bank_accounts`.
 *
 * The production DB has drifted from the Prisma migration history (a table or
 * some columns created by an old `db push` can be missing even though the
 * migration is marked applied), which makes POST /creators/me/bank-accounts
 * return 500. This script ensures the table and every expected column exist —
 * it is safe to run repeatedly and changes nothing when the schema is already
 * correct.
 *
 * Run on the server:
 *   docker compose exec backend node scripts/fix-bank-accounts.js
 */
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const TABLE = 'creator_bank_accounts';

// column name -> DDL used when it is missing
const COLUMNS = {
  creator_id:          "ADD COLUMN `creator_id` VARCHAR(191) NOT NULL",
  account_holder_name: "ADD COLUMN `account_holder_name` VARCHAR(191) NOT NULL",
  bank_name:           "ADD COLUMN `bank_name` VARCHAR(191) NOT NULL",
  account_number:      "ADD COLUMN `account_number` VARCHAR(191) NOT NULL",
  routing_number:      "ADD COLUMN `routing_number` VARCHAR(191) NULL",
  iban:                "ADD COLUMN `iban` VARCHAR(191) NULL",
  swift_code:          "ADD COLUMN `swift_code` VARCHAR(191) NULL",
  account_type:        "ADD COLUMN `account_type` VARCHAR(191) NOT NULL DEFAULT 'checking'",
  currency:            "ADD COLUMN `currency` VARCHAR(191) NOT NULL DEFAULT 'USD'",
  is_default:          "ADD COLUMN `is_default` BOOLEAN NOT NULL DEFAULT true",
  is_verified:         "ADD COLUMN `is_verified` BOOLEAN NOT NULL DEFAULT false",
  verified_at:         "ADD COLUMN `verified_at` DATETIME(3) NULL",
  created_at:          "ADD COLUMN `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3)",
  updated_at:          "ADD COLUMN `updated_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3)"
};

async function main() {
  // 1) Create the table (full definition) if it doesn't exist at all.
  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS \`${TABLE}\` (
      \`id\` VARCHAR(191) NOT NULL,
      \`creator_id\` VARCHAR(191) NOT NULL,
      \`account_holder_name\` VARCHAR(191) NOT NULL,
      \`bank_name\` VARCHAR(191) NOT NULL,
      \`account_number\` VARCHAR(191) NOT NULL,
      \`routing_number\` VARCHAR(191) NULL,
      \`iban\` VARCHAR(191) NULL,
      \`swift_code\` VARCHAR(191) NULL,
      \`account_type\` VARCHAR(191) NOT NULL DEFAULT 'checking',
      \`currency\` VARCHAR(191) NOT NULL DEFAULT 'USD',
      \`is_default\` BOOLEAN NOT NULL DEFAULT true,
      \`is_verified\` BOOLEAN NOT NULL DEFAULT false,
      \`verified_at\` DATETIME(3) NULL,
      \`created_at\` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
      \`updated_at\` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
      INDEX \`creator_bank_accounts_creator_id_idx\`(\`creator_id\`),
      INDEX \`creator_bank_accounts_is_default_idx\`(\`is_default\`),
      PRIMARY KEY (\`id\`)
    ) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
  `);
  console.log(`✓ table ${TABLE} present`);

  // 2) Add any missing columns (MySQL has no ADD COLUMN IF NOT EXISTS).
  for (const [col, ddl] of Object.entries(COLUMNS)) {
    const rows = await prisma.$queryRawUnsafe(
      `SELECT COUNT(*) AS n FROM information_schema.COLUMNS
       WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND COLUMN_NAME = ?`,
      TABLE, col
    );
    const exists = Number(rows?.[0]?.n || 0) > 0;
    if (exists) { console.log(`  • ${col}: ok`); continue; }
    await prisma.$executeRawUnsafe(`ALTER TABLE \`${TABLE}\` ${ddl}`);
    console.log(`  + ${col}: added`);
  }

  console.log('✅ creator_bank_accounts reconciled');
}

main()
  .catch((e) => { console.error('❌ reconcile failed:', e.message); process.exitCode = 1; })
  .finally(() => prisma.$disconnect());
