/*
  Warnings:

  - You are about to drop the column `tick` on the `orders` table. All the data in the column will be lost.
  - Added the required column `asset_id` to the `orders` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE `orders` DROP COLUMN `tick`,
    ADD COLUMN `asset_id` VARCHAR(32) NOT NULL;

-- CreateTable
CREATE TABLE `assets` (
    `id` BIGINT NOT NULL AUTO_INCREMENT,
    `asset_id` VARCHAR(32) NOT NULL,
    `name` VARCHAR(128) NOT NULL,
    `symbol` VARCHAR(32) NOT NULL,
    `decimals` INTEGER NOT NULL,
    `supply` BIGINT NOT NULL,
    `holder` BIGINT NOT NULL,
    `created_at` DATETIME(3) NOT NULL,
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `assets_asset_id_key`(`asset_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
