-- Adds issuer-selected payment tokens while retaining legacy USDT columns/data.
-- The catalogue was originally code-backed; apply 20260915_move_payment_tokens_to_database.sql
-- immediately after this migration to use paymentTokenMaster.

USE `trexLaunchpad`;
SET time_zone = '+00:00';

ALTER TABLE `tokenMaster`
  ADD COLUMN `paymentTokenAddress` VARCHAR(42) NULL AFTER `treasuryWalletAddress`,
  ADD KEY `idxTokenPaymentToken` (`paymentTokenAddress`,`status`,`isDeleted`);

-- Existing tokens keep the payment currency used by the legacy single-token Controller.
UPDATE `tokenMaster`
SET `paymentTokenAddress`='0x86B14D29A59b745bF08c42661322d13142d5eb49'
WHERE (`paymentTokenAddress` IS NULL OR `paymentTokenAddress`='');

ALTER TABLE `blockchainTransaction`
  ADD COLUMN `paymentTokenAddress` VARCHAR(42) NULL AFTER `tokenAmountFormatted`,
  ADD COLUMN `paymentTokenName` VARCHAR(80) NULL AFTER `paymentTokenAddress`,
  ADD COLUMN `paymentTokenSymbol` VARCHAR(20) NULL AFTER `paymentTokenName`,
  ADD COLUMN `paymentTokenDecimals` TINYINT UNSIGNED NULL AFTER `paymentTokenSymbol`,
  ADD COLUMN `paymentAmountRaw` VARCHAR(78) NULL AFTER `paymentTokenDecimals`,
  ADD COLUMN `paymentAmountFormatted` DECIMAL(65,18) NULL AFTER `paymentAmountRaw`,
  ADD KEY `idxBlockchainTransactionPaymentToken` (`chainId`,`paymentTokenAddress`,`blockNumber`);

-- Preserve reporting continuity for records created before generic payment-token fields existed.
UPDATE `blockchainTransaction`
SET `paymentTokenAddress`='0x86B14D29A59b745bF08c42661322d13142d5eb49',
    `paymentTokenName`='USDT',
    `paymentTokenSymbol`='USDT',
    `paymentTokenDecimals`=6,
    `paymentAmountRaw`=`usdtAmountRaw`,
    `paymentAmountFormatted`=`usdtAmountFormatted`
WHERE `type` IN ('INVEST','REDEMPTION')
  AND (`paymentTokenAddress` IS NULL OR `paymentTokenAddress`='');
