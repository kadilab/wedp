-- CreateTable
CREATE TABLE `wedding_budget_items` (
    `id` VARCHAR(191) NOT NULL,
    `wedding_id` VARCHAR(191) NOT NULL,
    `category` VARCHAR(191) NOT NULL,
    `vendor_name` VARCHAR(191) NULL,
    `planned_amount` DECIMAL(12, 2) NOT NULL,
    `paid_amount` DECIMAL(12, 2) NOT NULL DEFAULT 0,
    `status` ENUM('PLANNED', 'DEPOSIT_PAID', 'PAID') NOT NULL DEFAULT 'PLANNED',
    `notes` TEXT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `wedding_budget_items_wedding_id_idx`(`wedding_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `wedding_budget_items` ADD CONSTRAINT `wedding_budget_items_wedding_id_fkey` FOREIGN KEY (`wedding_id`) REFERENCES `weddings`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
