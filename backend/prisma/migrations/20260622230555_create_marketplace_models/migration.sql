-- CreateTable
CREATE TABLE `creator_profiles` (
    `id` VARCHAR(191) NOT NULL,
    `user_id` VARCHAR(191) NOT NULL,
    `display_name` VARCHAR(191) NOT NULL,
    `bio` LONGTEXT,
    `profile_image` VARCHAR(191),
    `banner_image` VARCHAR(191),
    `website` VARCHAR(191),
    `social_links` JSON,
    `verification_status` ENUM('UNVERIFIED', 'VERIFIED', 'SUSPENDED') NOT NULL DEFAULT 'UNVERIFIED',
    `verified_at` DATETIME(3),
    `bank_account_verified` BOOLEAN NOT NULL DEFAULT false,
    `bank_account_verified_at` DATETIME(3),
    `bank_details` JSON,
    `total_earnings` DECIMAL(12, 2) NOT NULL DEFAULT 0,
    `total_commissions_earned` DECIMAL(12, 2) NOT NULL DEFAULT 0,
    `is_active` BOOLEAN NOT NULL DEFAULT true,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `creator_profiles_user_id_key`(`user_id`),
    INDEX `creator_profiles_verification_status_idx`(`verification_status`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `creator_bank_accounts` (
    `id` VARCHAR(191) NOT NULL,
    `creator_id` VARCHAR(191) NOT NULL,
    `account_holder_name` VARCHAR(191) NOT NULL,
    `bank_name` VARCHAR(191) NOT NULL,
    `account_number` VARCHAR(191) NOT NULL,
    `routing_number` VARCHAR(191),
    `iban` VARCHAR(191),
    `swift_code` VARCHAR(191),
    `account_type` VARCHAR(191) NOT NULL DEFAULT 'checking',
    `currency` VARCHAR(191) NOT NULL DEFAULT 'USD',
    `is_default` BOOLEAN NOT NULL DEFAULT true,
    `is_verified` BOOLEAN NOT NULL DEFAULT false,
    `verified_at` DATETIME(3),
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `creator_bank_accounts_creator_id_idx`(`creator_id`),
    INDEX `creator_bank_accounts_is_default_idx`(`is_default`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `template_marketplaces` (
    `id` VARCHAR(191) NOT NULL,
    `template_id` VARCHAR(191) NOT NULL,
    `creator_id` VARCHAR(191) NOT NULL,
    `is_published` BOOLEAN NOT NULL DEFAULT false,
    `published_at` DATETIME(3),
    `status` ENUM('DRAFT', 'PENDING_REVIEW', 'APPROVED', 'REJECTED', 'UNLISTED') NOT NULL DEFAULT 'DRAFT',
    `admin_note` LONGTEXT,
    `reviewed_by` VARCHAR(191),
    `reviewed_at` DATETIME(3),
    `price_usd` DECIMAL(10, 2) NOT NULL DEFAULT 0,
    `commission_percentage` DECIMAL(5, 2) NOT NULL DEFAULT 30,
    `usage_count` INTEGER NOT NULL DEFAULT 0,
    `revenue_generated` DECIMAL(12, 2) NOT NULL DEFAULT 0,
    `popularity_score` DOUBLE NOT NULL DEFAULT 0,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `template_marketplaces_template_id_key`(`template_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `template_usage_tracks` (
    `id` VARCHAR(191) NOT NULL,
    `template_marketplace_id` VARCHAR(191) NOT NULL,
    `wedding_id` VARCHAR(191) NOT NULL,
    `user_id` VARCHAR(191) NOT NULL,
    `creator_id` VARCHAR(191) NOT NULL,
    `template_id` VARCHAR(191) NOT NULL,
    `used_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `approved_at` DATETIME(3),
    `commission_amount` DECIMAL(10, 2) NOT NULL,
    `commission_percentage` DECIMAL(5, 2) NOT NULL,
    `status` ENUM('PENDING', 'APPROVED', 'PAID') NOT NULL DEFAULT 'PENDING',
    `payout_id` VARCHAR(191),
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `template_usage_tracks_creator_id_idx`(`creator_id`),
    INDEX `template_usage_tracks_template_id_idx`(`template_id`),
    INDEX `template_usage_tracks_user_id_idx`(`user_id`),
    INDEX `template_usage_tracks_wedding_id_idx`(`wedding_id`),
    INDEX `template_usage_tracks_status_idx`(`status`),
    INDEX `template_usage_tracks_used_at_idx`(`used_at`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `creator_payouts` (
    `id` VARCHAR(191) NOT NULL,
    `creator_id` VARCHAR(191) NOT NULL,
    `user_id` VARCHAR(191) NOT NULL,
    `total_amount` DECIMAL(12, 2) NOT NULL,
    `currency` VARCHAR(191) NOT NULL DEFAULT 'USD',
    `status` ENUM('PENDING', 'APPROVED', 'REJECTED', 'PROCESSING', 'PAID') NOT NULL DEFAULT 'PENDING',
    `payment_method` VARCHAR(191),
    `payment_details` JSON,
    `transaction_id` VARCHAR(191),
    `proof_url` VARCHAR(191),
    `requested_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `processed_at` DATETIME(3),
    `processed_by` VARCHAR(191),
    `admin_note` LONGTEXT,
    `usage_tracks_included` JSON,
    `min_payout_amount` DECIMAL(10, 2) NOT NULL DEFAULT 10,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `creator_payouts_creator_id_idx`(`creator_id`),
    INDEX `creator_payouts_status_idx`(`status`),
    INDEX `creator_payouts_requested_at_idx`(`requested_at`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `creator_profiles` ADD CONSTRAINT `creator_profiles_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `creator_bank_accounts` ADD CONSTRAINT `creator_bank_accounts_creator_id_fkey` FOREIGN KEY (`creator_id`) REFERENCES `creator_profiles`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `template_marketplaces` ADD CONSTRAINT `template_marketplaces_template_id_fkey` FOREIGN KEY (`template_id`) REFERENCES `templates`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `template_marketplaces` ADD CONSTRAINT `template_marketplaces_creator_id_fkey` FOREIGN KEY (`creator_id`) REFERENCES `creator_profiles`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `template_usage_tracks` ADD CONSTRAINT `template_usage_tracks_template_marketplace_id_fkey` FOREIGN KEY (`template_marketplace_id`) REFERENCES `template_marketplaces`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `template_usage_tracks` ADD CONSTRAINT `template_usage_tracks_wedding_id_fkey` FOREIGN KEY (`wedding_id`) REFERENCES `weddings`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `template_usage_tracks` ADD CONSTRAINT `template_usage_tracks_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `template_usage_tracks` ADD CONSTRAINT `template_usage_tracks_creator_id_fkey` FOREIGN KEY (`creator_id`) REFERENCES `creator_profiles`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `creator_payouts` ADD CONSTRAINT `creator_payouts_creator_id_fkey` FOREIGN KEY (`creator_id`) REFERENCES `creator_profiles`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `creator_payouts` ADD CONSTRAINT `creator_payouts_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE NO ACTION ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `creator_payouts` ADD CONSTRAINT `creator_payouts_processed_by_fkey` FOREIGN KEY (`processed_by`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
