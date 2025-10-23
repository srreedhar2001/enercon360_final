-- Reference schema for existing drworklog table
-- NOTE: This table already exists in production; run only if you need to recreate it in a fresh environment.

CREATE TABLE IF NOT EXISTS `drworklog` (
  `callId` INT(11) NOT NULL,
  `longitude` DECIMAL(10,6) DEFAULT NULL,
  `latitude` DECIMAL(10,6) DEFAULT NULL,
  `address` VARCHAR(255) DEFAULT NULL,
  `comments` TEXT DEFAULT NULL,
  `createdDate` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`callId`),
  CONSTRAINT `drworklog_ibfk_1` FOREIGN KEY (`callId`) REFERENCES `drcalls` (`id`)
    ON DELETE CASCADE
    ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
