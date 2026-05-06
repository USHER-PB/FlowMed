-- Add license expiry date field to Provider table
ALTER TABLE `Provider` ADD COLUMN `licenseExpiryDate` DATETIME(3) NULL;
