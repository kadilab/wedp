-- AlterTable
ALTER TABLE `weddings` ADD COLUMN `guestbook_auto_approve` BOOLEAN NOT NULL DEFAULT true,
    ADD COLUMN `guestbook_enabled` BOOLEAN NOT NULL DEFAULT true;

-- CreateTable
CREATE TABLE `guestbook_posts` (
    `id` VARCHAR(191) NOT NULL,
    `wedding_id` VARCHAR(191) NOT NULL,
    `author_name` VARCHAR(191) NOT NULL,
    `message` TEXT NULL,
    `photo_url` VARCHAR(191) NULL,
    `status` ENUM('PENDING', 'APPROVED', 'REJECTED') NOT NULL DEFAULT 'APPROVED',
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `guestbook_posts_wedding_id_idx`(`wedding_id`),
    INDEX `guestbook_posts_status_idx`(`status`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `guestbook_posts` ADD CONSTRAINT `guestbook_posts_wedding_id_fkey` FOREIGN KEY (`wedding_id`) REFERENCES `weddings`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
