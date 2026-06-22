-- AlterTable
ALTER TABLE `templates` ADD COLUMN `is_marketplace_template` BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN `marketplace_id` VARCHAR(191),
ADD COLUMN `creator_id` VARCHAR(191),
ADD COLUMN `marketplace_status` VARCHAR(191) NOT NULL DEFAULT 'NONE';

-- AddIndex
CREATE INDEX `templates_is_marketplace_template_idx` ON `templates`(`is_marketplace_template`);
CREATE INDEX `templates_creator_id_idx` ON `templates`(`creator_id`);

-- AddForeignKey (templates.creator_id -> creator_profiles.id)
ALTER TABLE `templates` ADD CONSTRAINT `templates_creator_id_fkey` FOREIGN KEY (`creator_id`) REFERENCES `creator_profiles`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
