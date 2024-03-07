-- CreateTable
CREATE TABLE `order` (
    `id` BIGINT NOT NULL AUTO_INCREMENT,
    `seller` VARCHAR(64) NOT NULL,
    `buyer` VARCHAR(64) NULL,
    `tick` VARCHAR(16) NOT NULL,
    `amount` BIGINT NOT NULL,
    `status` ENUM('PENDING', 'CANCELED', 'LISTING', 'LOCKED', 'SOLD', 'FAILED') NOT NULL DEFAULT 'PENDING',
    `chain_status` ENUM('PENDING', 'BLOCK_CONFIRMED', 'BLOCK_FAILED', 'INSCRIBE_CONFIRMED', 'INSCRIBE_FAILED') NOT NULL DEFAULT 'PENDING',
    `total_price` BIGINT NOT NULL,
    `service_fee` BIGINT NOT NULL DEFAULT 0,
    `real_pay_price` BIGINT NOT NULL DEFAULT 0,
    `gas_fee` BIGINT NOT NULL DEFAULT 0,
    `tx_hash` VARCHAR(191) NULL,
    `listing_at` DATETIME(3) NULL,
    `sold_at` DATETIME(3) NULL,
    `canceled_at` DATETIME(3) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `order_tx_hash_idx`(`tx_hash`),
    INDEX `order_seller_idx`(`seller`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
