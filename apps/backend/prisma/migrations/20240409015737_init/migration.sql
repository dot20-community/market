/*
  Warnings:

  - You are about to alter the column `holder` on the `assets` table. The data in that column could be lost. The data in that column will be cast from `BigInt` to `Int`.

*/
-- AlterTable
ALTER TABLE `assets` MODIFY `supply` DECIMAL(64, 0) NOT NULL DEFAULT 0,
    MODIFY `holder` INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE `orders` MODIFY `amount` DECIMAL(64, 0) NOT NULL,
    MODIFY `total_price` DECIMAL(64, 0) NOT NULL,
    MODIFY `buy_service_fee` DECIMAL(64, 0) NOT NULL DEFAULT 0,
    MODIFY `buy_pay_price` DECIMAL(64, 0) NOT NULL DEFAULT 0,
    MODIFY `sell_service_fee` DECIMAL(64, 0) NOT NULL DEFAULT 0,
    MODIFY `sell_pay_price` DECIMAL(64, 0) NOT NULL DEFAULT 0;
