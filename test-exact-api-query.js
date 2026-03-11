const { query: dbQuery } = require('./src/config/database');

async function testActualAPIQuery() {
    try {
        console.log('Testing the EXACT query used by getOrdersByMonths API endpoint...\n');
        
        const months = '2026-01';
        const monthList = months.split(',');
        const params = [];
        const placeholders = monthList.map(_ => '?').join(',');
        
        let sql = `
            SELECT 
                o.id,
                DATE_FORMAT(o.orderDate, '%Y-%m-%d') AS orderDate,
                o.counterID,
                c.CounterName AS counterName,
                ct.type_name as counter_type_name,
                c.RepID AS repId,
                u.name AS repName,
                u.phone AS repPhone,
                o.subTotal,
                o.totalCGST,
                o.totalSGST,
                o.TotalDiscountAmount,
                o.grandTotal,
                o.paymentReceived,
                (
                    SELECT COALESCE(SUM(c.amount), 0)
                    FROM collections c
                    WHERE c.orderID = o.id
                ) AS collectedTotal,
                o.invoiceFileName,
                (SELECT COUNT(*) FROM orderdetails od WHERE od.orderId = o.id) AS itemCount,
                (SELECT COALESCE(SUM(od.qty),0) FROM orderdetails od WHERE od.orderId = o.id) AS totalQuantity
            FROM orders o
            LEFT JOIN counters c ON o.counterID = c.id
            LEFT JOIN countertype ct ON c.counter_type = ct.id
            LEFT JOIN users u ON c.RepID = u.id
        `;
        sql += ` WHERE DATE_FORMAT(o.orderDate, '%Y-%m') IN (${placeholders})`;
        params.push(...monthList);
        sql += ' ORDER BY o.orderDate DESC, o.id DESC';

        const rows = await dbQuery(sql, params);
        
        console.log(`Total orders returned:${rows.length}\n`);
        
        const subcounters = rows.filter(r => r.counter_type_name === 'subcounter');
        const agencies = rows.filter(r => r.counter_type_name === 'agency');
        const counters = rows.filter(r => r.counter_type_name === 'counter');
        const nullTypes = rows.filter(r => !r.counter_type_name);
        
        console.log(`Breakdown:`);
        console.log(`  - Subcounters: ${subcounters.length}`);
        console.log(`  - Agencies: ${agencies.length}`);
        console.log(`  - Counters: ${counters.length}`);
        console.log(`  - NULL types: ${nullTypes.length}`);
        
        if (subcounters.length > 0) {
            console.log(`\nFirst 5 subcounter orders:`);
            subcounters.slice(0, 5).forEach(o => {
                console.log(`  Order #${o.id} - ${o.counterName} - ${o.orderDate}`);
            });
        } else {
            console.log('\n⚠️  NO SUBCOUNTERS RETURNED!');
        }
        
        process.exit(0);
    } catch (error) {
        console.error('Error:', error.message);
        console.error(error.stack);
        process.exit(1);
    }
}

testActualAPIQuery();
