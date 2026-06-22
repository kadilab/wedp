-- AlterTable: allow a coupon to be applied to an invitation quota order,
-- mirroring the existing Payment <-> Coupon relationship
ALTER TABLE `invitation_orders`
  ADD COLUMN `coupon_id` VARCHAR(191) NULL,
  ADD COLUMN `discount_amount` DECIMAL(10, 2) NULL;

-- AddForeignKey
ALTER TABLE `invitation_orders` ADD CONSTRAINT `invitation_orders_coupon_id_fkey` FOREIGN KEY (`coupon_id`) REFERENCES `coupons`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
