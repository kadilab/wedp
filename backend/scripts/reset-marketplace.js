/**
 * Clean reset of all marketplace / creator data.
 *
 * Deletes every commission, payout, marketplace listing, bank account and
 * creator profile, then clears the marketplace flags carried on templates and
 * users. Custom templates themselves are kept (only their marketplace link is
 * removed) so creators can re-publish them after the reset.
 *
 * Usage:
 *   node scripts/reset-marketplace.js --yes
 */
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function main() {
  if (!process.argv.includes('--yes')) {
    console.log('This will permanently delete ALL marketplace & creator data.');
    console.log('Re-run with --yes to confirm:  node scripts/reset-marketplace.js --yes');
    process.exit(0);
  }

  console.log('Resetting marketplace data...');

  // Children first to respect foreign keys.
  const usage = await prisma.templateUsageTrack.deleteMany({});
  console.log(`  - usage tracks deleted: ${usage.count}`);

  const payouts = await prisma.creatorPayout.deleteMany({});
  console.log(`  - payouts deleted: ${payouts.count}`);

  const listings = await prisma.templateMarketplace.deleteMany({});
  console.log(`  - marketplace listings deleted: ${listings.count}`);

  const banks = await prisma.creatorBankAccount.deleteMany({});
  console.log(`  - bank accounts deleted: ${banks.count}`);

  const profiles = await prisma.creatorProfile.deleteMany({});
  console.log(`  - creator profiles deleted: ${profiles.count}`);

  // Clear marketplace flags on templates (keep the templates themselves).
  const tpl = await prisma.template.updateMany({
    data: {
      isMarketplaceTemplate: false,
      marketplaceId: null,
      creatorId: null,
      marketplaceStatus: 'NONE'
    }
  });
  console.log(`  - templates cleared: ${tpl.count}`);

  // Reset creator flags on users.
  const users = await prisma.user.updateMany({
    where: { OR: [{ isCreator: true }, { creatorProfileId: { not: null } }] },
    data: { isCreator: false, creatorProfileId: null }
  });
  console.log(`  - users reset: ${users.count}`);

  console.log('Done. Marketplace data has been reset.');
}

main()
  .catch(err => {
    console.error('Reset failed:', err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
