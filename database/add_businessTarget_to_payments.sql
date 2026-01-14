-- Add businessTarget column to payments table
-- This column stores the business target value for Counter Service payment types

ALTER TABLE payments 
ADD COLUMN businessTarget DECIMAL(10,2) NULL AFTER comments;

-- Add a comment to the column for documentation
ALTER TABLE payments 
MODIFY COLUMN businessTarget DECIMAL(10,2) NULL COMMENT 'Business target for Counter Service payments';
