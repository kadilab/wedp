-- CreateTable
CREATE TABLE `wedding_collaborators` (
    `id` VARCHAR(191) NOT NULL,
    `wedding_id` VARCHAR(191) NOT NULL,
    `user_id` VARCHAR(191) NULL,
    `invite_token` VARCHAR(191) NOT NULL,
    `status` ENUM('PENDING', 'ACCEPTED', 'REVOKED') NOT NULL DEFAULT 'PENDING',
    `invited_by` VARCHAR(191) NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `accepted_at` DATETIME(3) NULL,

    UNIQUE INDEX `wedding_collaborators_invite_token_key`(`invite_token`),
    INDEX `wedding_collaborators_wedding_id_idx`(`wedding_id`),
    INDEX `wedding_collaborators_user_id_idx`(`user_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `wedding_collaborators` ADD CONSTRAINT `wedding_collaborators_wedding_id_fkey` FOREIGN KEY (`wedding_id`) REFERENCES `weddings`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `wedding_collaborators` ADD CONSTRAINT `wedding_collaborators_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
