-- Add the honoree name column (BIRTHDAY / CEREMONY events).
-- Maps to Prisma: honoreeName String? @map("honoree_name")
ALTER TABLE `weddings` ADD COLUMN `honoree_name` VARCHAR(191) NULL;
