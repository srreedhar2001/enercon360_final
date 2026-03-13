const { query: dbQuery } = require('./src/config/database');

async function findMonthsWithData() {
    try {
        console.log('Finding all months with order data...\n');
        
        const query = `
            SELECT 
                DATE_FORMAT(o.orderDate, '%Y-%m') AS ym,
                DATE_FORMAT(o.orderDate, '%b %Y') AS label,
                COUNT(*) as orderCount,
                COALESCE(SUM(o.grandTotal), 0) as total
            FROM orders o
            GROUP BY ym, label
            ORDER BY ym DESC
            LIMIT 20
        `;
        
        const results = await dbQuery(query);
        
        console.log('Months with orders (most recent first):');
        console.log('='.repeat(70));
        results.forEach(row => {
            console.log(`${row.label.padEnd(15)} (${row.ym}): ₹${Number(row.total).toLocaleString('en-IN').padStart(12)} (${row.orderCount} orders)`);
        });
        
        // Now specifically check if there are any orders with "Apr" in them
        console.log('\n\nSearching for all April months...');
        console.log('='.repeat(70));
        const aprilQuery = `
            SELECT 
                DATE_FORMAT(o.orderDate, '%Y-%m') AS ym,
                DATE_FORMAT(o.orderDate, '%b %Y') AS label,
                COUNT(*) as orderCount,
                COALESCE(SUM(o.grandTotal), 0) as total,
                COALESCE(ct.type_name, 'NULL') as counterType,
                COUNT(*) as typeCount
            FROM orders o
            LEFT JOIN counters c ON o.counterID = c.id
            LEFT JOIN countertype ct ON c.counter_type = ct.id
            WHERE MONTH(o.orderDate) = 4
            GROUP BY ym, label, ct.type_name
            ORDER BY ym DESC
        `;
        
        const aprilResults = await dbQuery(aprilQuery);
        
        if (aprilResults.length === 0) {
            console.log('No April data found in any year');
        } else {
            aprilResults.forEach(row => {
                console.log(`${row.label.padEnd(15)} (${row.ym}) - ${row.counterType.padEnd(12)}: ₹${Number(row.total).toLocaleString('en-IN').padStart(12)} (${row.typeCount} orders)`);
            });
        }
        
        process.exit(0);
    } catch (error) {
        console.error('Error:', error.message);
        console.error(error.stack);
        process.exit(1);
    }
}

findMonthsWithData();
