-- CreateTable: ProviderInvitation
CREATE TABLE `ProviderInvitation` (
  `id` VARCHAR(191) NOT NULL,
  `medicalCenterId` VARCHAR(191) NOT NULL,
  `invitedEmail` VARCHAR(191) NOT NULL,
  `invitedName` VARCHAR(191) NOT NULL,
  `licenseNumber` VARCHAR(191) NULL,
  `specialty` VARCHAR(191) NULL,
  `tier` ENUM('TIER_1_DOCTOR','TIER_2_NURSE','TIER_3_CERTIFIED_WORKER','TIER_4_STUDENT','TIER_5_VOLUNTEER') NOT NULL DEFAULT 'TIER_1_DOCTOR',
  `token` VARCHAR(191) NOT NULL,
  `tokenExpiresAt` DATETIME(3) NOT NULL,
  `status` ENUM('PENDING','ACCEPTED','EXPIRED','CANCELLED','REJECTED') NOT NULL DEFAULT 'PENDING',
  `providerId` VARCHAR(191) NULL,
  `adminNotes` TEXT NULL,
  `verifiedByAdmin` BOOLEAN NOT NULL DEFAULT false,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),

  UNIQUE INDEX `ProviderInvitation_token_key`(`token`),
  INDEX `ProviderInvitation_medicalCenterId_idx`(`medicalCenterId`),
  INDEX `ProviderInvitation_invitedEmail_idx`(`invitedEmail`),
  INDEX `ProviderInvitation_status_idx`(`status`),

  CONSTRAINT `ProviderInvitation_medicalCenterId_fkey`
    FOREIGN KEY (`medicalCenterId`) REFERENCES `MedicalCenter`(`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `ProviderInvitation_providerId_fkey`
    FOREIGN KEY (`providerId`) REFERENCES `Provider`(`id`) ON DELETE SET NULL ON UPDATE CASCADE,

  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
