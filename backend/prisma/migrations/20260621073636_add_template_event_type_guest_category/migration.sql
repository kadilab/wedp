-- AlterTable: tag templates with the event type they're designed for, so the
-- template gallery can be filtered per event type (mariage / anniversaire / dot / etc.)
ALTER TABLE `templates`
  ADD COLUMN `event_type` ENUM('WEDDING', 'BIRTHDAY', 'DOT', 'CEREMONY', 'CONFERENCE', 'OTHER') NOT NULL DEFAULT 'WEDDING';

-- AlterTable: persist the guest's group/category (Famille, Amis, Collègues, VIP...)
ALTER TABLE `guests`
  ADD COLUMN `category` VARCHAR(191) NULL;
