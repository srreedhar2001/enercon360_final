-- Add gst_id column to product table to store selected GST id
ALTER TABLE `product`
  ADD COLUMN `gst_id` INT NULL AFTER `isActive`;

-- Optional: index for faster joins/filtering
ALTER TABLE `product`
  ADD INDEX `idx_product_gst_id` (`gst_id`);

-- Optional: add a foreign key if your gst table is named `gst` and has `id` as PK
-- ALTER TABLE `product`
--   ADD CONSTRAINT `fk_product_gst`
--     FOREIGN KEY (`gst_id`) REFERENCES `gst`(`id`)
--     ON UPDATE CASCADE ON DELETE SET NULL;
