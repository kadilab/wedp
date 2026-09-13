-- AlterTable
ALTER TABLE `print_orders` ADD COLUMN `double_sided` BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE `weddings` ADD COLUMN `print_back_enabled` BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN `print_back_text` TEXT NULL;
