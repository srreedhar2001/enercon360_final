const db = require('../src/config/database');

/**
 * Initialize default leave types
 * Run this once to set up the system with common leave types
 */
async function initializeLeaveTypes() {
    const defaultLeaveTypes = [
        {
            name: 'Casual Leave',
            description: 'Short-term leave for personal matters',
            yearlyLimit: 12
        },
        {
            name: 'Sick Leave',
            description: 'Leave for medical reasons or illness',
            yearlyLimit: 12
        },
        {
            name: 'Earned Leave',
            description: 'Earned/privilege leave accumulated over time',
            yearlyLimit: 15
        },
        {
            name: 'Maternity Leave',
            description: 'Leave for maternity purposes',
            yearlyLimit: 180
        },
        {
            name: 'Paternity Leave',
            description: 'Leave for paternity purposes',
            yearlyLimit: 15
        },
        {
            name: 'Bereavement Leave',
            description: 'Leave for family bereavement',
            yearlyLimit: 5
        },
        {
            name: 'Compensatory Off',
            description: 'Compensatory leave for overtime work',
            yearlyLimit: 12
        }
    ];

    try {
        console.log('Starting leave types initialization...');

        for (const leaveType of defaultLeaveTypes) {
            try {
                await db.query(
                    'INSERT INTO leave_types (name, description, yearlyLimit) VALUES (?, ?, ?) ON DUPLICATE KEY UPDATE description = VALUES(description), yearlyLimit = VALUES(yearlyLimit)',
                    [leaveType.name, leaveType.description, leaveType.yearlyLimit]
                );
                console.log(`✓ Leave type "${leaveType.name}" initialized`);
            } catch (err) {
                console.error(`✗ Error initializing "${leaveType.name}":`, err.message);
            }
        }

        console.log('Leave types initialization completed successfully!');
    } catch (error) {
        console.error('Error initializing leave types:', error);
        throw error;
    }
}

/**
 * Initialize leave balances for all active users for current year
 */
async function initializeUserBalances(year = new Date().getFullYear()) {
    try {
        console.log(`Initializing leave balances for year ${year}...`);

        // Get all users
        const users = await db.query('SELECT id FROM users');
        
        // Get all active leave types
        const leaveTypes = await db.query('SELECT id, yearlyLimit FROM leave_types WHERE isActive = 1');

        if (users.length === 0) {
            console.log('No users found');
            return;
        }

        if (leaveTypes.length === 0) {
            console.log('No active leave types found');
            return;
        }

        let successCount = 0;
        let skipCount = 0;

        for (const user of users) {
            for (const leaveType of leaveTypes) {
                try {
                    const existing = await db.query(
                        'SELECT id FROM leave_balances WHERE userId = ? AND leaveTypeId = ? AND year = ?',
                        [user.id, leaveType.id, year]
                    );

                    if (existing.length > 0) {
                        skipCount++;
                        continue;
                    }

                    await db.query(
                        'INSERT INTO leave_balances (userId, leaveTypeId, year, yearlyLimit) VALUES (?, ?, ?, ?)',
                        [user.id, leaveType.id, year, leaveType.yearlyLimit]
                    );
                    successCount++;
                } catch (err) {
                    console.error(`Error initializing balance for user ${user.id}, leave type ${leaveType.id}:`, err.message);
                }
            }
        }

        console.log(`✓ Initialized ${successCount} leave balances`);
        console.log(`✓ Skipped ${skipCount} existing balances`);
        console.log('Leave balances initialization completed!');
    } catch (error) {
        console.error('Error initializing user balances:', error);
        throw error;
    }
}

// If run directly from command line
if (require.main === module) {
    (async () => {
        try {
            await initializeLeaveTypes();
            await initializeUserBalances();
            process.exit(0);
        } catch (error) {
            console.error('Initialization failed:', error);
            process.exit(1);
        }
    })();
}

module.exports = {
    initializeLeaveTypes,
    initializeUserBalances
};
