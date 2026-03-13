const { query: dbQuery } = require('./src/config/database');

async function debugApril2025ByRep() {
    try {
        const testMonth = '2025-04';
        
        console.log('='.repeat(70));
        console.log('APRIL 2025 - BREAKDOWN BY REPRESENTATIVE');
        console.log('='.repeat(70));
        console.log();
        
        // Get breakdown by representative
        const repBreakdown = `
            SELECT 
                c.RepID,
                u.name as repName,
                COUNT(*) as orderCount,
                COALESCE(SUM(o.grandTotal), 0) as total
            FROM orders o
            LEFT JOIN counters c ON o.counterID = c.id
            LEFT JOIN users u ON c.RepID = u.id
            LEFT JOIN countertype ct ON c.counter_type = ct.id
            WHERE DATE_FORMAT(o.orderDate, '%Y-%m') = ?
            GROUP BY c.RepID, u.name
            ORDER BY total DESC
        `;
        
        const reps = await dbQuery(repBreakdown, [testMonth]);
        
        console.log('Representative Breakdown:');
        console.log('-'.repeat(70));
        let grandTotal = 0;
        reps.forEach(rep => {
            const amount = Number(rep.total);
            grandTotal += amount;
            console.log(`Rep ${String(rep.RepID || 'NULL').padEnd(4)} - ${(rep.repName || 'Unknown').padEnd(30)}: ₹${amount.toLocaleString('en-IN').padStart(12)} (${rep.orderCount} orders)`);
        });
        
        console.log('-'.repeat(70));
        console.log(`${'TOTAL'.padEnd(37)}: ₹${grandTotal.toLocaleString('en-IN').padStart(12)} (${reps.reduce((sum, r) => sum + r.orderCount, 0)} orders)`);
        
        // Now check if any specific rep has around 6.5 lakhs
        console.log('\n\nLooking for rep with ~₹6,53,279...');
        console.log('-'.repeat(70));
        const target = 653279;
        reps.forEach(rep => {
            const amount = Number(rep.total);
            const diff = Math.abs(amount - target);
            if (diff < 50000) { // within 50k
                console.log(`🎯 MATCH FOUND: Rep ${rep.RepID} (${rep.repName}) has ₹${amount.toLocaleString('en-IN')}`);
            }
        });
        
        // Check what the API would return with includeSubcounters
        console.log('\n\nAPI SIMULATION - Stats endpoint WITH includeSubcounters=true:');
        console.log('-'.repeat(70));
        const statsQuery = `
            SELECT 
                DATE_FORMAT(o.orderDate, '%Y-%m') AS ym,
                COALESCE(SUM(COALESCE(o.grandTotal,0)), 0) AS netTotal,
                COUNT(*) as orderCount
            FROM orders o
            LEFT JOIN counters c ON o.counterID = c.id
            LEFT JOIN countertype ct ON c.counter_type = ct.id
            WHERE o.orderDate >= DATE_SUB(CURDATE(), INTERVAL 12 MONTH)
            AND DATE_FORMAT(o.orderDate, '%Y-%m') = ?
            GROUP BY ym
        `;
        
        const statsResult = await dbQuery(statsQuery, [testMonth]);
        if (statsResult.length > 0) {
            console.log(`Stats API would return: ₹${Number(statsResult[0].netTotal).toLocaleString('en-IN')} (${statsResult[0].orderCount} orders)`);
        }
        
        // Check with subcounters excluded (old behavior)
        console.log('\n\nAPI SIMULATION - Stats endpoint WITHOUT includeSubcounters (old):');
        console.log('-'.repeat(70));
        const statsOldQuery = `
            SELECT 
                DATE_FORMAT(o.orderDate, '%Y-%m') AS ym,
                COALESCE(SUM(COALESCE(o.grandTotal,0)), 0) AS netTotal,
                COUNT(*) as orderCount
            FROM orders o
            LEFT JOIN counters c ON o.counterID = c.id
            LEFT JOIN countertype ct ON c.counter_type = ct.id
            WHERE o.orderDate >= DATE_SUB(CURDATE(), INTERVAL 11 MONTH)
            AND DATE_FORMAT(o.orderDate, '%Y-%m') = ?
            AND (ct.type_name IS NULL OR ct.type_name != 'subcounter')
            GROUP BY ym
        `;
        
        const statsOldResult = await dbQuery(statsOldQuery, [testMonth]);
        if (statsOldResult.length > 0) {
            console.log(`Stats API (old) would return: ₹${Number(statsOldResult[0].netTotal).toLocaleString('en-IN')} (${statsOldResult[0].orderCount} orders)`);
        }
        
        process.exit(0);
    } catch (error) {
        console.error('Error:', error.message);
        console.error(error.stack);
        process.exit(1);
    }
}

debugApril2025ByRep();
