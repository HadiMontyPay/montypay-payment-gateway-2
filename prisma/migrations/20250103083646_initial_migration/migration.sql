-- CreateTable
CREATE TABLE `Session` (
    `id` VARCHAR(191) NOT NULL,
    `shop` VARCHAR(191) NOT NULL,
    `state` VARCHAR(191) NOT NULL,
    `isOnline` BOOLEAN NOT NULL DEFAULT false,
    `scope` VARCHAR(191) NULL,
    `expires` DATETIME(3) NULL,
    `accessToken` VARCHAR(191) NOT NULL,
    `userId` BIGINT NULL,
    `firstName` VARCHAR(191) NULL,
    `lastName` VARCHAR(191) NULL,
    `email` VARCHAR(191) NULL,
    `accountOwner` BOOLEAN NOT NULL DEFAULT false,
    `locale` VARCHAR(191) NULL,
    `collaborator` BOOLEAN NULL DEFAULT false,
    `emailVerified` BOOLEAN NULL DEFAULT false,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Configuration` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `sessionId` VARCHAR(191) NOT NULL,
    `shop` VARCHAR(191) NOT NULL,
    `accountName` VARCHAR(191) NULL,
    `ready` BOOLEAN NOT NULL DEFAULT true,
    `apiVersion` VARCHAR(191) NOT NULL DEFAULT 'unstable',
    `merchantKey` VARCHAR(191) NOT NULL,
    `merchantPassword` VARCHAR(191) NOT NULL,
    `testMode` BOOLEAN NOT NULL DEFAULT true,

    UNIQUE INDEX `Configuration_sessionId_key`(`sessionId`),
    UNIQUE INDEX `Configuration_shop_key`(`shop`),
    INDEX `Configuration_sessionId_idx`(`sessionId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `PaymentSession` (
    `id` VARCHAR(191) NOT NULL,
    `gid` VARCHAR(191) NOT NULL,
    `group` VARCHAR(191) NOT NULL,
    `amount` DECIMAL(65, 30) NOT NULL,
    `test` BOOLEAN NOT NULL,
    `currency` VARCHAR(191) NOT NULL,
    `kind` VARCHAR(191) NOT NULL,
    `shop` VARCHAR(191) NOT NULL,
    `paymentMethod` VARCHAR(191) NOT NULL,
    `customer` TEXT NOT NULL,
    `cancelUrl` VARCHAR(191) NULL,
    `proposedAt` DATETIME(3) NOT NULL,
    `status` VARCHAR(191) NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `RefundSession` (
    `id` VARCHAR(191) NOT NULL,
    `gid` VARCHAR(191) NOT NULL,
    `paymentId` VARCHAR(191) NOT NULL,
    `amount` DECIMAL(65, 30) NOT NULL,
    `currency` VARCHAR(191) NOT NULL,
    `proposedAt` DATETIME(3) NOT NULL,
    `status` VARCHAR(191) NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `CaptureSession` (
    `id` VARCHAR(191) NOT NULL,
    `gid` VARCHAR(191) NOT NULL,
    `paymentId` VARCHAR(191) NOT NULL,
    `amount` DECIMAL(65, 30) NOT NULL,
    `currency` VARCHAR(191) NOT NULL,
    `proposedAt` DATETIME(3) NOT NULL,
    `status` VARCHAR(191) NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `VoidSession` (
    `id` VARCHAR(191) NOT NULL,
    `gid` VARCHAR(191) NOT NULL,
    `paymentId` VARCHAR(191) NOT NULL,
    `proposedAt` DATETIME(3) NOT NULL,
    `status` VARCHAR(191) NULL,

    UNIQUE INDEX `VoidSession_paymentId_key`(`paymentId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `Configuration` ADD CONSTRAINT `Configuration_sessionId_fkey` FOREIGN KEY (`sessionId`) REFERENCES `Session`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `RefundSession` ADD CONSTRAINT `RefundSession_paymentId_fkey` FOREIGN KEY (`paymentId`) REFERENCES `PaymentSession`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `CaptureSession` ADD CONSTRAINT `CaptureSession_paymentId_fkey` FOREIGN KEY (`paymentId`) REFERENCES `PaymentSession`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `VoidSession` ADD CONSTRAINT `VoidSession_paymentId_fkey` FOREIGN KEY (`paymentId`) REFERENCES `PaymentSession`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
