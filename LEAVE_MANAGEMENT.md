# Leave Management System

A comprehensive leave management system for tracking employee leave requests, balances, and types.

## Database Tables

### 1. leave_types
Stores different types of leaves available in the organization.

**Columns:**
- `id` - Primary key
- `name` - Leave type name (unique)
- `description` - Description of the leave type
- `yearlyLimit` - Common yearly limit for all employees
- `isActive` - Active status (1 = active, 0 = inactive)
- `createdAt` - Timestamp of creation
- `updatedAt` - Timestamp of last update

### 2. leave_balances
Tracks individual employee leave balances for each year.

**Columns:**
- `id` - Primary key
- `userId` - Foreign key to users table
- `leaveTypeId` - Foreign key to leave_types table
- `year` - Year for this balance
- `yearlyLimit` - Copy from leave_types (for historical tracking)
- `used` - Number of days used
- `remaining` - Generated column (yearlyLimit - used)
- `createdAt` - Timestamp of creation
- `updatedAt` - Timestamp of last update

**Unique constraint:** (userId, leaveTypeId, year)

### 3. leave_requests
Stores all leave requests made by employees.

**Columns:**
- `id` - Primary key
- `userId` - Foreign key to users table
- `leaveTypeId` - Foreign key to leave_types table
- `startDate` - Leave start date
- `endDate` - Leave end date
- `totalDays` - Total number of days (supports half days with 0.5)
- `reason` - Reason for leave (optional)
- `createdAt` - Timestamp of creation
- `updatedAt` - Timestamp of last update

## API Endpoints

### Leave Types

#### Get all active leave types
```
GET /api/leave-types
Headers: Authorization: Bearer {token}
```

#### Create leave type (Admin only)
```
POST /api/leave-types
Headers: Authorization: Bearer {token}
Body: {
  "name": "Sick Leave",
  "description": "Leave for medical reasons",
  "yearlyLimit": 12
}
```

#### Update leave type (Admin only)
```
PUT /api/leave-types/:id
Headers: Authorization: Bearer {token}
Body: {
  "name": "Sick Leave",
  "description": "Updated description",
  "yearlyLimit": 15,
  "isActive": 1
}
```

### Leave Balance

#### Get leave balance for current user
```
GET /api/leave-balance?year=2025
Headers: Authorization: Bearer {token}
```

#### Get leave balance for specific user
```
GET /api/leave-balance/:userId?year=2025
Headers: Authorization: Bearer {token}
```

#### Initialize leave balances for a user
```
POST /api/leave-balance/initialize
Headers: Authorization: Bearer {token}
Body: {
  "userId": 123,
  "year": 2025
}
```

### Leave Requests

#### Create leave request
```
POST /api/leave-requests
Headers: Authorization: Bearer {token}
Body: {
  "leaveTypeId": 1,
  "startDate": "2025-12-20",
  "endDate": "2025-12-22",
  "totalDays": 3,
  "reason": "Family function"
}
```

#### Get leave requests for current user
```
GET /api/leave-requests?year=2025&leaveTypeId=1
Headers: Authorization: Bearer {token}
```

#### Get all leave requests (Admin/Manager)
```
GET /api/leave-requests/all/list?year=2025&leaveTypeId=1&userId=123
Headers: Authorization: Bearer {token}
```

#### Cancel/Delete leave request
```
DELETE /api/leave-requests/:id
Headers: Authorization: Bearer {token}
```

### Leave Summary

#### Get leave summary for current user
```
GET /api/leave-summary?year=2025
Headers: Authorization: Bearer {token}
```

Returns:
```json
{
  "success": true,
  "data": {
    "totalLeaveTypes": 5,
    "totalAllowedDays": 56,
    "totalUsedDays": 12,
    "totalRemainingDays": 44,
    "totalRequests": 8
  }
}
```

## Frontend Interface

Access the leave management interface at: `/leave.html`

### Features:

1. **Leave Summary Dashboard**
   - Total allowed days
   - Total used days
   - Total remaining days
   - Total requests count

2. **Leave Balance Tab**
   - View leave balances by year
   - Shows yearly limit, used, and remaining days for each leave type

3. **My Requests Tab**
   - View all leave requests
   - Filter by year
   - Cancel pending requests

4. **Apply Leave Tab**
   - Apply for new leave
   - Select leave type
   - Choose start and end dates
   - Auto-calculate total days
   - View available balance before applying

5. **All Requests Tab (Admin/Manager only)**
   - View all employees' leave requests
   - Filter by year and leave type

6. **Leave Types Tab (Admin only)**
   - Manage leave types
   - Add new leave types
   - Edit existing leave types
   - Activate/Deactivate leave types

## Setup Instructions

### 1. Run Database Migrations

Execute the SQL files to create the tables:
```sql
-- Create leave_types table
CREATE TABLE `leave_types` (...)

-- Create leave_balances table
CREATE TABLE `leave_balances` (...)

-- Create leave_requests table
CREATE TABLE `leave_requests` (...)
```

### 2. Initialize Default Leave Types

Run the initialization script:
```bash
node scripts/initializeLeaveSystem.js
```

This will create default leave types:
- Casual Leave (12 days/year)
- Sick Leave (12 days/year)
- Earned Leave (15 days/year)
- Maternity Leave (180 days/year)
- Paternity Leave (15 days/year)
- Bereavement Leave (5 days/year)
- Compensatory Off (12 days/year)

It will also initialize leave balances for all active users for the current year.

### 3. Access the System

Navigate to `/leave.html` after logging in.

## Business Logic

### Leave Balance Calculation
- Leave balances are initialized when a user applies for leave if not already present
- The `remaining` column is a generated column: `yearlyLimit - used`
- When a leave request is created, the `used` amount is incremented
- When a leave request is cancelled, the `used` amount is decremented

### Leave Request Validation
- System checks if sufficient balance is available before approving
- Cannot apply for more days than remaining balance
- Start date must be before or equal to end date
- Total days must be positive (supports 0.5 for half days)

### Permissions
- **All Users**: Can view their own balance and requests, apply for leave
- **Admin (designation_id = 4)**: Can view all requests, manage leave types
- **Managers**: Can view team requests (future enhancement)

## Future Enhancements

1. **Approval Workflow**
   - Add status field (Pending, Approved, Rejected)
   - Add approver field
   - Email notifications

2. **Leave Calendar**
   - Visual calendar showing team leaves
   - Conflict detection

3. **Leave Carry Forward**
   - Auto-carry forward unused leave
   - Configurable carry-forward limits

4. **Leave Encashment**
   - Track encashed leaves
   - Calculate encashment amount

5. **Reports**
   - Monthly/Yearly leave reports
   - Team utilization reports
   - Export to PDF/Excel

## Support

For issues or questions, contact the system administrator.
