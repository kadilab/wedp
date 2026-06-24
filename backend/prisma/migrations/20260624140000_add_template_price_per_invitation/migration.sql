-- Per-design price per invitation, replacing the global invitation unit price.
ALTER TABLE `templates` ADD COLUMN `price_per_invitation` DECIMAL(10, 2) NOT NULL DEFAULT 0;
