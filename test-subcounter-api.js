const { query: dbQuery } = require('./src/config/database');

async function testSubcounterOrders() {
    try {
        console.log('Checking for subcounter orders in database...\n');
        
        // Check if subcounter orders exist
        const subcounterOrders = await dbQuery(`
            SELECT 
                o.id,
                c.CounterName,
                ct.type_name as counter_type,
                DATE_FORMAT(o.orderDate, '%Y-%m-%d') as orderDate
            FROM orders o
            LEFT JOIN counters c ON o.counterID = c.id  
            LEFT JOIN countertype ct ON c.counter_type = ct.id
            WHERE ct.type_name = 'subcounter'
            ORDER BY o.orderDate DESC
            LIMIT 10
        `);
        
        console.log(`Found ${subcounterOrders.length} subcounter orders in database:`);
        subcounterOrders.forEach(order => {
            console.log(`  Order #${order.id} - ${order.CounterName} (${order.counter_type}) - ${order.orderDate}`);
        });
        
        console.log('\n---\n');
        
        // Now test the API endpoint logic
        const months = '2026-01,2026-02';
        const monthList = months.split(',');
        const placeholders = monthList.map(_ => '?').join(',');
        
        console.log('Testing API query that should include subcounters...\n');
        
        const apiResults = await dbQuery(`
            SELECT 
                o.id,
                DATE_FORMAT(o.orderDate, '%Y-%m-%d') AS orderDate,
                c.CounterName AS counterName,
                ct.type_name as counter_type_name
            FROM orders o
            LEFT JOIN counters c ON o.counterID = c.id
            LEFT JOIN countertype ct ON c.counter_type = ct.id
            WHERE DATE_FORMAT(o.orderDate, '%Y-%m') IN (${placeholders})
            ORDER BY o.orderDate DESC
            LIMIT 20
        `, monthList);
        
        console.log(`API query returned ${apiResults.length} total orders:`);
        const subcountersInApi = apiResults.filter(o => o.counter_type_name === 'subcounter');
        console.log(`  - ${subcountersInApi.length} subcounter orders`);
        console.log(`  - ${apiResults.length - subcountersInApi.length} other orders`);
        
        // Show all counter types
        console.log('\nBreakdown by counter type:');
        const typeBreakdown = {};
        apiResults.forEach(o => {
            const type = o.counter_type_name || 'NULL';
            typeBreakdown[type] = (typeBreakdown[type] || 0) + 1;
        });
        Object.keys(typeBreakdown).forEach(type => {
            console.log(`  - ${type}: ${typeBreakdown[type]} orders`);
        });
        
        if (subcountersInApi.length > 0) {
            console.log('\nSubcounter orders returned by API query:');
            subcountersInApi.forEach(order => {
                console.log(`  Order #${order.id} - ${order.counterName} (${order.counter_type_name}) - ${order.orderDate}`);
            });
        }
        
        process.exit(0);
    } catch (error) {
        console.error('Error:', error.message);
        process.exit(1);
    }
}

testSubcounterOrders();
