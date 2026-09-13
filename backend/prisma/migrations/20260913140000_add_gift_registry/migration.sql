-- AlterTable
ALTER TABLE `weddings` ADD COLUMN `gift_registry_enabled` BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN `gift_registry_goal` DECIMAL(10, 2) NULL,
    ADD COLUMN `gift_registry_message` TEXT NULL;

-- CreateTable
CREATE TABLE `gift_contributions` (
    `id` VARCHAR(191) NOT NULL,
    `wedding_id` VARCHAR(191) NOT NULL,
    `donor_name` VARCHAR(191) NOT NULL,
    `amount` DECIMAL(10, 2) NOT NULL,
    `currency` VARCHAR(191) NOT NULL DEFAULT 'USD',
    `message` TEXT NULL,
    `payment_provider` VARCHAR(191) NULL,
    `payer_phone` VARCHAR(191) NULL,
    `transaction_id` VARCHAR(191) NULL,
    `status` ENUM('PENDING', 'APPROVED', 'REJECTED') NOT NULL DEFAULT 'PENDING',
    `paid_at` DATETIME(3) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `gift_contributions_wedding_id_idx`(`wedding_id`),
    INDEX `gift_contributions_status_idx`(`status`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `gift_contributions` ADD CONSTRAINT `gift_contributions_wedding_id_fkey` FOREIGN KEY (`wedding_id`) REFERENCES `weddings`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
