ALTER TABLE `MedicalCenter` ADD COLUMN `city` VARCHAR(191) NOT NULL DEFAULT '';
CREATE INDEX `MedicalCenter_city_idx` ON `MedicalCenter`(`city`);
