-- Track the original marketplace template a custom template was cloned from,
-- so the original creator keeps the commission and clones cannot be re-published.
ALTER TABLE `templates` ADD COLUMN `source_template_id` VARCHAR(191) NULL;
