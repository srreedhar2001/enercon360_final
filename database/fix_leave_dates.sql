-- Fix existing leave request dates that are off by 1 day due to timezone conversion
-- This adds 1 day to both startDate and endDate for all existing leave requests

UPDATE leave_requests 
SET 
    startDate = DATE_ADD(startDate, INTERVAL 1 DAY),
    endDate = DATE_ADD(endDate, INTERVAL 1 DAY);

-- Verify the update
SELECT id, userId, startDate, endDate, totalDays, status, leaveTypeId 
FROM leave_requests 
ORDER BY startDate DESC;
