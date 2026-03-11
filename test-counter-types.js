const { query: dbQuery } = require('./src/config/database');

async function checkCounterTypes() {
    try {
        console.log('Checking counter types setup...\n');
        
        // Check countertype table
        const counterTypes = await dbQuery(`SELECT * FROM countertype`);
        console.log('Counter types in countertype table:');
        counterTypes.forEach(ct => {
            console.log(`  ID: ${ct.id}, Name: ${ct.type_name}`);
        });
        
        console.log('\n---\n');
        
        // Check counter table for type assignments
        const countersWithTypes = await dbQuery(`
            SELECT 
                c.id,
                c.CounterName,
                c.counter_type,
                ct.type_name
            FROM counters c
            LEFT JOIN countertype ct ON c.counter_type = ct.id
            WHERE c.id IN (
                SELECT DISTINCT counterID FROM orders WHERE DATE_FORMAT(orderDate, '%Y-%m') = '2026-01'
            )
            LIMIT 20
        `);
        
        console.log('Counters that have orders in Jan 2026:');
        countersWithTypes.forEach(c => {
            console.log(`  ID: ${c.id}, Name: ${c.CounterName}, counter_type column: ${c.counter_type}, type_name joined: ${c.type_name || 'NULL'}`);
        });
        
        console.log('\n---\n');
        
        // Check specifically for subcounter orders
        const subcounterInfo = await dbQuery(`
            SELECT 
                o.id as order_id,
                c.id as counter_id,
                c.CounterName,
                c.counter_type as counter_type_id,
                ct.id as joined_ct_id,
                ct.type_name
            FROM orders o
            LEFT JOIN counters c ON o.counterID = c.id
            LEFT JOIN countertype ct ON c.counter_type = ct.id
            WHERE ct.type_name = 'subcounter'
            AND DATE_FORMAT(o.orderDate, '%Y-%m') = '2026-01'
            LIMIT 5
        `);
        
        console.log('Subcounter orders with full join details (Jan 2026):');
        if (subcounterInfo.length === 0) {
            console.log('  NO RESULTS - The JOIN is failing!');
            
            // Let's check what's in the counter_type column
            const checkCounterTypeColumn = await dbQuery(`
                SELECT DISTINCT c.counter_type 
                FROM orders o
                LEFT JOIN counters c ON o.counterID = c.id
                WHERE DATE_FORMAT(o.orderDate, '%Y-%m') = '2026-01'
            `);
            console.log('\nDistinct counter_type values in counters for Jan 2026 orders:');
            checkCounterTypeColumn.forEach(row => {
                console.log(`  counter_type: ${row.counter_type} (type: ${typeof row.counter_type})`);
            });
        } else {
            subcounterInfo.forEach(info => {
                console.log(`  Order: ${info.order_id}, Counter: ${info.counter_id} (${info.CounterName}), counter_type_id: ${info.counter_type_id}, type_name: ${info.type_name}`);
            });
        }
        
        process.exit(0);
    } catch (error) {
        console.error('Error:', error.message);
        console.error(error.stack);
        process.exit(1);
    }
}

checkCounterTypes();
