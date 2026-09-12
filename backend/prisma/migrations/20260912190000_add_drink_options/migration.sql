-- AlterTable
ALTER TABLE `weddings` ADD COLUMN `drink_options` JSON NULL;

-- AlterTable
ALTER TABLE `guests` ADD COLUMN `drink_choice` VARCHAR(191) NULL;
