-- AlterTable
ALTER TABLE `users` ADD COLUMN `is_creator` BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN `creator_profile_id` VARCHAR(191) UNIQUE;

-- AddForeignKey
ALTER TABLE `users` ADD CONSTRAINT `users_creator_profile_id_fkey` FOREIGN KEY (`creator_profile_id`) REFERENCES `creator_profiles`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
