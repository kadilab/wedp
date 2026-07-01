/**
 * One-shot diagnostic for the creator_bank_accounts P2022 issue.
 * Run inside the backend container:
 *   docker compose exec backend node scripts/diag-bank.js
 *
 * Prints which database the app is actually connected to, the real columns of
 * creator_bank_accounts, and attempts the exact insert the API does — so we can
 * see whether the column truly exists for the running app.
 */
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

function maskUrl(u) {
  if (!u) return '(unset)';
  return u.replace(/\/\/([^:]+):([^@]*)@/, '//$1:***@');
}

async function main() {
  console.log('DATABASE_URL =', maskUrl(process.env.DATABASE_URL));

  const dbRow = await prisma.$queryRawUnsafe('SELECT DATABASE() AS db, VERSION() AS version');
  console.log('Connected DB =', dbRow?.[0]?.db, '| MySQL', dbRow?.[0]?.version);

  const cols = await prisma.$queryRawUnsafe(
    `SELECT COLUMN_NAME FROM information_schema.COLUMNS
     WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'creator_bank_accounts'
     ORDER BY ORDINAL_POSITION`
  );
  console.log('Columns =', cols.map(c => c.COLUMN_NAME).join(', ') || '(table missing!)');
  console.log('has account_type =', cols.some(c => c.COLUMN_NAME === 'account_type'));

  // Try the exact create the API performs, against a real creator if any.
  const creator = await prisma.creatorProfile.findFirst({ select: { id: true } });
  if (!creator) { console.log('No creator profile to test insert. (create a creator first)'); return; }

  try {
    const acc = await prisma.creatorBankAccount.create({
      data: {
        creatorId: creator.id,
        accountHolderName: 'DIAG TEST',
        bankName: 'AIRTEL',
        accountNumber: '243970000000',
        accountType: 'mobile_money',
        currency: 'CDF',
        isDefault: false,
        isVerified: true,
        verifiedAt: new Date()
      }
    });
    console.log('✅ Prisma create OK, id =', acc.id);
    await prisma.creatorBankAccount.delete({ where: { id: acc.id } });
    console.log('   (cleaned up test row)');
  } catch (e) {
    console.log('❌ Prisma create FAILED:', e.code, JSON.stringify(e.meta));
  }
}

main().catch(e => console.error(e)).finally(() => prisma.$disconnect());
