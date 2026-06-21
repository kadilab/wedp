-- AlterTable: add event type support, make bride/groom names optional for
-- non-wedding event types (anniversaire, dot, cérémonie, conférence, autre)
ALTER TABLE `weddings`
  ADD COLUMN `event_type` ENUM('WEDDING', 'BIRTHDAY', 'DOT', 'CEREMONY', 'CONFERENCE', 'OTHER') NOT NULL DEFAULT 'WEDDING',
  ADD COLUMN `event_title` VARCHAR(191) NULL,
  MODIFY COLUMN `bride_name` VARCHAR(191) NULL,
  MODIFY COLUMN `groom_name` VARCHAR(191) NULL;
