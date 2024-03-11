/*
  Warnings:

  - You are about to drop the `order` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropTable
DROP TABLE `order`;

-- CreateTable
CREATE TABLE `orders` (
    `id` BIGINT NOT NULL AUTO_INCREMENT,
    `seller` VARCHAR(64) NOT NULL,
    `buyer` VARCHAR(64) NULL,
    `tick` VARCHAR(16) NOT NULL,
    `amount` BIGINT NOT NULL,
    `status` ENUM('PENDING', 'CANCELING', 'CANCELED', 'LISTING', 'LOCKED', 'SOLD', 'FAILED') NOT NULL DEFAULT 'PENDING',
    `chain_status` ENUM('PENDING', 'SELL_BLOCK_CONFIRMED', 'SELL_BLOCK_FAILED', 'SELL_INSCRIBE_CONFIRMED', 'SELL_INSCRIBE_FAILED', 'CANCEL_BLOCK_CONFIRMED', 'CANCEL_BLOCK_FAILED', 'CANCEL_INSCRIBE_CONFIRMED', 'CANCEL_INSCRIBE_FAILED', 'BUY_BLOCK_CONFIRMED', 'BUY_BLOCK_FAILED', 'TRADE_BLOCK_CONFIRMED', 'TRADE_BLOCK_FAILED', 'TRADE_INSCRIBE_CONFIRMED', 'TRADE_INSCRIBE_FAILED') NOT NULL DEFAULT 'PENDING',
    `fail_reason` VARCHAR(191) NULL,
    `total_price` BIGINT NOT NULL,
    `buy_service_fee` BIGINT NOT NULL DEFAULT 0,
    `buy_pay_price` BIGINT NOT NULL DEFAULT 0,
    `sell_service_fee` BIGINT NOT NULL DEFAULT 0,
    `sell_pay_price` BIGINT NOT NULL DEFAULT 0,
    `sell_hash` VARCHAR(191) NOT NULL,
    `buy_hash` VARCHAR(191) NULL,
    `trade_hash` VARCHAR(191) NULL,
    `cancel_hash` VARCHAR(191) NULL,
    `listing_at` DATETIME(3) NULL,
    `sold_at` DATETIME(3) NULL,
    `canceled_at` DATETIME(3) NULL,
    `created_at` DATETIME(3) NOT NULL,
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `orders_seller_idx`(`seller`),
    INDEX `orders_buyer_idx`(`buyer`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
