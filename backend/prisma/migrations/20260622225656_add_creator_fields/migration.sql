-- AlterTable
ALTER TABLE `users` ADD COLUMN `is_creator` BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN `creator_profile_id` VARCHAR(191) UNIQUE;

-- AlterTable
ALTER TABLE `template_usage_tracks` ADD COLUMN `approved_at` DATETIME(3) NULL;
