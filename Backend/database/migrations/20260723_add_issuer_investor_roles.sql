-- Apply this migration to an existing Trex Launchpad database.
-- Fresh installations receive the same data from database/trex-launchpad.sql.

USE `trexLaunchpad`;
SET time_zone = '+00:00';

INSERT INTO `userRole` (`roleUid`, `roleName`, `description`, `isSystem`, `isActive`)
VALUES
  ('00000000-0000-4000-8000-000000000003', 'Issuer', 'Launchpad issuer account created when signup isIssuer is true.', TRUE, TRUE),
  ('00000000-0000-4000-8000-000000000004', 'Investor', 'Launchpad investor account created when signup isIssuer is false.', TRUE, TRUE)
ON DUPLICATE KEY UPDATE
  `description` = VALUES(`description`),
  `isSystem` = TRUE,
  `isActive` = TRUE,
  `isDeleted` = FALSE;

INSERT INTO `permissionMaster`
  (`permissionUid`, `roleUid`, `menuUid`, `permissionName`, `permissionCode`, `httpMethod`, `apiPath`)
VALUES
  (UUID(), '00000000-0000-4000-8000-000000000003', '10000000-0000-4000-8000-000000000003', 'List menus', 'MENU_LIST', 'GET', '/api/v1/menus'),
  (UUID(), '00000000-0000-4000-8000-000000000003', '10000000-0000-4000-8000-000000000003', 'View menu', 'MENU_VIEW', 'GET', '/api/v1/menus/:menuUid'),
  (UUID(), '00000000-0000-4000-8000-000000000004', '10000000-0000-4000-8000-000000000003', 'List menus', 'MENU_LIST', 'GET', '/api/v1/menus'),
  (UUID(), '00000000-0000-4000-8000-000000000004', '10000000-0000-4000-8000-000000000003', 'View menu', 'MENU_VIEW', 'GET', '/api/v1/menus/:menuUid')
ON DUPLICATE KEY UPDATE
  `permissionName` = VALUES(`permissionName`),
  `menuUid` = VALUES(`menuUid`),
  `isAllowed` = TRUE,
  `isActive` = TRUE,
  `isDeleted` = FALSE;
