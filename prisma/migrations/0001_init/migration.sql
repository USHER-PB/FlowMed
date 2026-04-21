-- CreateTable: User
CREATE TABLE `User` (
    `id` VARCHAR(191) NOT NULL,
    `email` VARCHAR(191) NOT NULL,
    `phone` VARCHAR(191) NULL,
    `password` VARCHAR(191) NOT NULL,
    `role` ENUM('PATIENT','PROVIDER','MEDICAL_CENTER','ADMIN') NOT NULL,
    `emailVerified` BOOLEAN NOT NULL DEFAULT false,
    `phoneVerified` BOOLEAN NOT NULL DEFAULT false,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `User_email_key`(`email`),
    UNIQUE INDEX `User_phone_key`(`phone`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable: Patient
CREATE TABLE `Patient` (
    `id` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `firstName` VARCHAR(191) NOT NULL,
    `lastName` VARCHAR(191) NOT NULL,
    `dateOfBirth` DATETIME(3) NULL,
    `gender` VARCHAR(191) NULL,
    `address` VARCHAR(191) NULL,
    `preferredLanguage` VARCHAR(191) NOT NULL DEFAULT 'fr',
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `Patient_userId_key`(`userId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable: MedicalCenter
CREATE TABLE `MedicalCenter` (
    `id` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `address` VARCHAR(191) NOT NULL,
    `phone` VARCHAR(191) NOT NULL,
    `verificationStatus` ENUM('PENDING','APPROVED','REJECTED') NOT NULL DEFAULT 'PENDING',
    `verificationDocs` TEXT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `MedicalCenter_userId_key`(`userId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable: Provider
CREATE TABLE `Provider` (
    `id` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `tier` ENUM('TIER_1_DOCTOR','TIER_2_NURSE','TIER_3_CERTIFIED_WORKER','TIER_4_STUDENT','TIER_5_VOLUNTEER') NOT NULL,
    `firstName` VARCHAR(191) NOT NULL,
    `lastName` VARCHAR(191) NOT NULL,
    `specialty` VARCHAR(191) NULL,
    `licenseNumber` VARCHAR(191) NULL,
    `verificationStatus` ENUM('PENDING','APPROVED','REJECTED') NOT NULL DEFAULT 'PENDING',
    `verificationDocs` TEXT NULL,
    `supervisorId` VARCHAR(191) NULL,
    `studentYear` INTEGER NULL,
    `medicalCenterId` VARCHAR(191) NULL,
    `consultationFee` DECIMAL(10, 2) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `Provider_userId_key`(`userId`),
    INDEX `Provider_tier_idx`(`tier`),
    INDEX `Provider_verificationStatus_idx`(`verificationStatus`),
    INDEX `Provider_supervisorId_idx`(`supervisorId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable: Availability
CREATE TABLE `Availability` (
    `id` VARCHAR(191) NOT NULL,
    `providerId` VARCHAR(191) NOT NULL,
    `dayOfWeek` INTEGER NOT NULL,
    `startTime` VARCHAR(191) NOT NULL,
    `endTime` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `Availability_providerId_idx`(`providerId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable: Appointment
CREATE TABLE `Appointment` (
    `id` VARCHAR(191) NOT NULL,
    `patientId` VARCHAR(191) NOT NULL,
    `providerId` VARCHAR(191) NOT NULL,
    `medicalCenterId` VARCHAR(191) NULL,
    `dateTime` DATETIME(3) NOT NULL,
    `status` ENUM('PENDING_SUPERVISOR_APPROVAL','CONFIRMED','IN_PROGRESS','COMPLETED','CANCELLED') NOT NULL DEFAULT 'CONFIRMED',
    `supervisorApproved` BOOLEAN NULL,
    `supervisorNotes` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `Appointment_patientId_idx`(`patientId`),
    INDEX `Appointment_providerId_idx`(`providerId`),
    INDEX `Appointment_dateTime_idx`(`dateTime`),
    INDEX `Appointment_status_idx`(`status`),
    -- Composite index for provider + date queries
    INDEX `Appointment_providerId_dateTime_idx`(`providerId`, `dateTime`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable: QueueItem
CREATE TABLE `QueueItem` (
    `id` VARCHAR(191) NOT NULL,
    `appointmentId` VARCHAR(191) NOT NULL,
    `providerId` VARCHAR(191) NOT NULL,
    `position` INTEGER NOT NULL,
    `status` ENUM('WAITING','IN_CONSULTATION','COMPLETED') NOT NULL DEFAULT 'WAITING',
    `isUrgent` BOOLEAN NOT NULL DEFAULT false,
    `urgencyReason` VARCHAR(191) NULL,
    `urgencyApproved` BOOLEAN NULL,
    `estimatedWaitMinutes` INTEGER NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `QueueItem_appointmentId_key`(`appointmentId`),
    INDEX `QueueItem_providerId_position_idx`(`providerId`, `position`),
    INDEX `QueueItem_status_idx`(`status`),
    -- Composite index for provider + status + position queries
    INDEX `QueueItem_providerId_status_position_idx`(`providerId`, `status`, `position`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable: Diagnosis
CREATE TABLE `Diagnosis` (
    `id` VARCHAR(191) NOT NULL,
    `appointmentId` VARCHAR(191) NOT NULL,
    `patientId` VARCHAR(191) NOT NULL,
    `providerId` VARCHAR(191) NOT NULL,
    `diagnosisText` TEXT NOT NULL,
    `prescriptions` TEXT NULL,
    `recommendations` TEXT NULL,
    `followUpDate` DATETIME(3) NULL,
    `requiresSupervisorApproval` BOOLEAN NOT NULL DEFAULT false,
    `supervisorId` VARCHAR(191) NULL,
    `supervisorApproved` BOOLEAN NULL,
    `supervisorFeedback` TEXT NULL,
    `encrypted` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    `immutableAfter` DATETIME(3) NULL,

    UNIQUE INDEX `Diagnosis_appointmentId_key`(`appointmentId`),
    INDEX `Diagnosis_patientId_idx`(`patientId`),
    INDEX `Diagnosis_providerId_idx`(`providerId`),
    INDEX `Diagnosis_supervisorId_idx`(`supervisorId`),
    -- Composite index for patient medical history queries
    INDEX `Diagnosis_patientId_createdAt_idx`(`patientId`, `createdAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable: AuditLog
CREATE TABLE `AuditLog` (
    `id` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `action` VARCHAR(191) NOT NULL,
    `entityType` VARCHAR(191) NOT NULL,
    `entityId` VARCHAR(191) NOT NULL,
    `metadata` TEXT NULL,
    `ipAddress` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `AuditLog_userId_idx`(`userId`),
    INDEX `AuditLog_entityType_entityId_idx`(`entityType`, `entityId`),
    INDEX `AuditLog_createdAt_idx`(`createdAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey: Patient → User
ALTER TABLE `Patient` ADD CONSTRAINT `Patient_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey: MedicalCenter → User
ALTER TABLE `MedicalCenter` ADD CONSTRAINT `MedicalCenter_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey: Provider → User
ALTER TABLE `Provider` ADD CONSTRAINT `Provider_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey: Provider → Provider (supervisor)
ALTER TABLE `Provider` ADD CONSTRAINT `Provider_supervisorId_fkey` FOREIGN KEY (`supervisorId`) REFERENCES `Provider`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey: Provider → MedicalCenter
ALTER TABLE `Provider` ADD CONSTRAINT `Provider_medicalCenterId_fkey` FOREIGN KEY (`medicalCenterId`) REFERENCES `MedicalCenter`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey: Availability → Provider
ALTER TABLE `Availability` ADD CONSTRAINT `Availability_providerId_fkey` FOREIGN KEY (`providerId`) REFERENCES `Provider`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey: Appointment → Patient
ALTER TABLE `Appointment` ADD CONSTRAINT `Appointment_patientId_fkey` FOREIGN KEY (`patientId`) REFERENCES `Patient`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey: Appointment → Provider
ALTER TABLE `Appointment` ADD CONSTRAINT `Appointment_providerId_fkey` FOREIGN KEY (`providerId`) REFERENCES `Provider`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey: Appointment → MedicalCenter
ALTER TABLE `Appointment` ADD CONSTRAINT `Appointment_medicalCenterId_fkey` FOREIGN KEY (`medicalCenterId`) REFERENCES `MedicalCenter`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey: QueueItem → Appointment
ALTER TABLE `QueueItem` ADD CONSTRAINT `QueueItem_appointmentId_fkey` FOREIGN KEY (`appointmentId`) REFERENCES `Appointment`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey: QueueItem → Provider
ALTER TABLE `QueueItem` ADD CONSTRAINT `QueueItem_providerId_fkey` FOREIGN KEY (`providerId`) REFERENCES `Provider`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey: Diagnosis → Appointment
ALTER TABLE `Diagnosis` ADD CONSTRAINT `Diagnosis_appointmentId_fkey` FOREIGN KEY (`appointmentId`) REFERENCES `Appointment`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey: Diagnosis → Patient
ALTER TABLE `Diagnosis` ADD CONSTRAINT `Diagnosis_patientId_fkey` FOREIGN KEY (`patientId`) REFERENCES `Patient`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey: Diagnosis → Provider (treating)
ALTER TABLE `Diagnosis` ADD CONSTRAINT `Diagnosis_providerId_fkey` FOREIGN KEY (`providerId`) REFERENCES `Provider`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey: Diagnosis → Provider (supervisor)
ALTER TABLE `Diagnosis` ADD CONSTRAINT `Diagnosis_supervisorId_fkey` FOREIGN KEY (`supervisorId`) REFERENCES `Provider`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey: AuditLog → User
ALTER TABLE `AuditLog` ADD CONSTRAINT `AuditLog_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
