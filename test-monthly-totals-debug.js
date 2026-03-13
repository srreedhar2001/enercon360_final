const { query: dbQuery } = require('./src/config/database');

async function debugMonthlyTotals() {
    try {
        const testMonth = '2025-04'; // April 2025
        
        console.log('='.repeat(60));
        console.log('DEBUGGING MONTHLY TOTALS MISMATCH');
        console.log('='.repeat(60));
        console.log(`\nTesting for month: ${testMonth}\n`);
        
        // Query 1: Stats endpoint logic (what shows in card)
        console.log('1️⃣  STATS ENDPOINT (Monthly Card Total) - INCLUDING ALL TYPES:');
        console.log('-'.repeat(60));
        const statsQuery = `
            SELECT 
                DATE_FORMAT(o.orderDate, '%Y-%m') AS ym,
                COALESCE(SUM(COALESCE(o.grandTotal,0)), 0) AS netTotal,
                COUNT(*) as orderCount
            FROM orders o
            LEFT JOIN counters c ON o.counterID = c.id
            LEFT JOIN countertype ct ON c.counter_type = ct.id
            WHERE DATE_FORMAT(o.orderDate, '%Y-%m') = ?
            GROUP BY ym
        `;
        const statsResults = await dbQuery(statsQuery, [testMonth]);
        if (statsResults.length > 0) {
            console.log(`   Total: ₹${Number(statsResults[0].netTotal).toLocaleString('en-IN')}`);
            console.log(`   Orders: ${statsResults[0].orderCount}`);
        } else {
            console.log('   No results');
        }
        
        // Query 2: Summary endpoint logic (what shows after clicking)
        console.log('\n2️⃣  SUMMARY ENDPOINT (After Clicking Card) - INCLUDING ALL TYPES:');
        console.log('-'.repeat(60));
        const summaryQuery = `
            SELECT 
                COUNT(*) as orderCount,
                COALESCE(SUM(o.grandTotal), 0) as totalAmount
            FROM orders o
            LEFT JOIN counters c ON o.counterID = c.id
            LEFT JOIN countertype ct ON c.counter_type = ct.id
            WHERE DATE_FORMAT(o.orderDate, '%Y-%m') = ?
        `;
        const summaryResults = await dbQuery(summaryQuery, [testMonth]);
        if (summaryResults.length > 0) {
            console.log(`   Total: ₹${Number(summaryResults[0].totalAmount).toLocaleString('en-IN')}`);
            console.log(`   Orders: ${summaryResults[0].orderCount}`);
        } else {
            console.log('   No results');
        }
        
        // Query 3: Breakdown by counter type
        console.log('\n3️⃣  BREAKDOWN BY COUNTER TYPE:');
        console.log('-'.repeat(60));
        const breakdownQuery = `
            SELECT 
                COALESCE(ct.type_name, 'NULL/Missing') as counterType,
                COUNT(*) as orderCount,
                COALESCE(SUM(o.grandTotal), 0) as totalAmount
            FROM orders o
            LEFT JOIN counters c ON o.counterID = c.id
            LEFT JOIN countertype ct ON c.counter_type = ct.id
            WHERE DATE_FORMAT(o.orderDate, '%Y-%m') = ?
            GROUP BY ct.type_name
            ORDER BY totalAmount DESC
        `;
        const breakdown = await dbQuery(breakdownQuery, [testMonth]);
        breakdown.forEach(row => {
            console.log(`   ${row.counterType.padEnd(20)}: ₹${Number(row.totalAmount).toLocaleString('en-IN').padStart(15)} (${row.orderCount} orders)`);
        });
        
        // Query 4: Check specific problematic orders
        console.log('\n4️⃣  SAMPLE ORDERS WITH COUNTER TYPES:');
        console.log('-'.repeat(60));
        const sampleQuery = `
            SELECT 
                o.id,
                o.grandTotal,
                c.CounterName,
                ct.type_name,
                c.counter_type as counter_type_id
            FROM orders o
            LEFT JOIN counters c ON o.counterID = c.id
            LEFT JOIN countertype ct ON c.counter_type = ct.id
            WHERE DATE_FORMAT(o.orderDate, '%Y-%m') = ?
            ORDER BY o.grandTotal DESC
            LIMIT 10
        `;
        const samples = await dbQuery(sampleQuery, [testMonth]);
        samples.forEach(order => {
            console.log(`   #${order.id}: ₹${Number(order.grandTotal).toLocaleString('en-IN').padStart(10)} | ${(order.CounterName || 'Unknown').padEnd(30)} | Type: ${order.type_name || 'NULL'} (ID: ${order.counter_type_id})`);
        });
        
        // Query 5: Check for orders with NULL counter_type
        console.log('\n5️⃣  ORDERS WITH NULL/MISSING COUNTER TYPE:');
        console.log('-'.repeat(60));
        const nullTypeQuery = `
            SELECT COUNT(*) as count, COALESCE(SUM(o.grandTotal), 0) as total
            FROM orders o
            LEFT JOIN counters c ON o.counterID = c.id
            WHERE DATE_FORMAT(o.orderDate, '%Y-%m') = ?
            AND (c.counter_type IS NULL OR c.counter_type = 0)
        `;
        const nullResults = await dbQuery(nullTypeQuery, [testMonth]);
        if (nullResults[0].count > 0) {
            console.log(`   Found ${nullResults[0].count} orders with NULL counter_type`);
            console.log(`   Total amount: ₹${Number(nullResults[0].total).toLocaleString('en-IN')}`);
        } else {
            console.log(`   ✓ All orders have valid counter types`);
        }
        
        console.log('\n' + '='.repeat(60));
        console.log('ANALYSIS COMPLETE');
        console.log('='.repeat(60));
        
        process.exit(0);
    } catch (error) {
        console.error('Error:', error.message);
        console.error(error.stack);
        process.exit(1);
    }
}

debugMonthlyTotals();
