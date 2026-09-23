-- Apply once to an existing Trex Launchpad database.
-- Fresh installations receive the same column from database/trex-launchpad.sql.

USE `trexLaunchpad`;
SET time_zone = '+00:00';

ALTER TABLE `organizationMaster`
  ADD COLUMN `walletAddress` VARCHAR(42) NULL AFTER `website`;
