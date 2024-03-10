/*
  Warnings:

  - You are about to drop the column `bu_pay_price` on the `order` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE `order` DROP COLUMN `bu_pay_price`,
    ADD COLUMN `buy_pay_price` BIGINT NOT NULL DEFAULT 0;
