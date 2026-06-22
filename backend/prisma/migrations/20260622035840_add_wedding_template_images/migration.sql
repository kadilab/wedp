-- AlterTable: per-placeholder images for multi-photo templates.
-- JSON map of { photoElementId: imageUrl }. Legacy single-photo templates
-- continue to use couple_photo as the fallback, so existing rows are unaffected.
ALTER TABLE `weddings`
  ADD COLUMN `template_images` JSON NULL;
