-- Users table for authentication
-- Run this SQL script in your MySQL database to create the users table

CREATE TABLE IF NOT EXISTS `users` (
    `id` int(11) NOT NULL AUTO_INCREMENT,
    `mobile` varchar(10) NOT NULL UNIQUE,
    `name` varchar(100) DEFAULT NULL,
    `email` varchar(100) DEFAULT NULL,
    `otp` varchar(6) DEFAULT NULL,
    `otp_expiry` datetime DEFAULT NULL,
    `created_at` timestamp DEFAULT CURRENT_TIMESTAMP,
    `updated_at` timestamp DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    `last_login` timestamp NULL DEFAULT NULL,
    `status` enum('active','inactive') DEFAULT 'active',
    PRIMARY KEY (`id`),
    UNIQUE KEY `mobile` (`mobile`),
    KEY `idx_mobile_otp` (`mobile`, `otp`),
    KEY `idx_otp_expiry` (`otp_expiry`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Insert sample user for testing
-- Replace with actual user data
INSERT INTO `users` (`mobile`, `name`, `email`) VALUES 
('9876543210', 'Test User', 'test@example.com')
ON DUPLICATE KEY UPDATE 
    `name` = VALUES(`name`),
    `email` = VALUES(`email`);

-- You can add more test users as needed
-- INSERT INTO `users` (`mobile`, `name`, `email`) VALUES 
-- ('9876543211', 'Another User', 'user2@example.com');

SELECT 'Users table created successfully!' as message;
