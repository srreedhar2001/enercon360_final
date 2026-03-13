const { query: dbQuery } = require('./src/config/database');

async function verifyDateRange() {
    try {
        const testMonth = '2025-04';
        
        console.log('='.repeat(70));
        console.log('DATE RANGE ANALYSIS FOR APRIL 2025');
        console.log('='.repeat(70));
        console.log();
        console.log(`Today's date: ${new Date().toISOString().split('T')[0]}`);
        
        // Calculate 11 months ago
        const elevenMonthsAgo = new Date();
        elevenMonthsAgo.setMonth(elevenMonthsAgo.getMonth() - 11);
        console.log(`11 months ago: ${elevenMonthsAgo.toISOString().split('T')[0]}`);
        console.log();
        
        // Check orders in April 2025 split by date range
        console.log('Orders in April 2025 by date range:');
        console.log('-'.repeat(70));
        
        // All April orders
        const allApril = await dbQuery(`
            SELECT 
                COUNT(*) as count,
                COALESCE(SUM(grandTotal), 0) as total
            FROM orders
            WHERE DATE_FORMAT(orderDate, '%Y-%m') = ?
        `, [testMonth]);
        
        console.log(`All of April 2025:             ₹${Number(allApril[0].total).toLocaleString('en-IN').padStart(12)} (${allApril[0].count} orders)`);
        
        // Orders within 11-month window
        const within11Months = await dbQuery(`
            SELECT 
                COUNT(*) as count,
                COALESCE(SUM(grandTotal), 0) as total
            FROM orders
            WHERE DATE_FORMAT(orderDate, '%Y-%m') = ?
            AND orderDate >= DATE_SUB(CURDATE(), INTERVAL 11 MONTH)
        `, [testMonth]);
        
        console.log(`Within 11-month window:        ₹${Number(within11Months[0].total).toLocaleString('en-IN').padStart(12)} (${within11Months[0].count} orders)`);
        
        // Orders outside 11-month window
        const outside11Months = await dbQuery(`
            SELECT 
                COUNT(*) as count,
                COALESCE(SUM(grandTotal), 0) as total,
                MIN(orderDate) as firstOrder,
                MAX(orderDate) as lastExcluded
            FROM orders
            WHERE DATE_FORMAT(orderDate, '%Y-%m') = ?
            AND orderDate < DATE_SUB(CURDATE(), INTERVAL 11 MONTH)
        `, [testMonth]);
        
        console.log(`Outside 11-month window (OLD): ₹${Number(outside11Months[0].total).toLocaleString('en-IN').padStart(12)} (${outside11Months[0].count} orders)`);
        
        if (outside11Months[0].count > 0) {
            console.log(`  └─ Date range: ${outside11Months[0].firstOrder} to ${outside11Months[0].lastExcluded}`);
        }
        
        console.log('-'.repeat(70));
        console.log();
        
        console.log('🔍 CONCLUSION:');
        console.log(`The monthly card shows ₹${Number(within11Months[0].total).toLocaleString('en-IN')} because it only includes`);
        console.log(`orders from the last 11 months (since ${elevenMonthsAgo.toISOString().split('T')[0]}).`);
        console.log();
        console.log(`The summary shows ₹${Number(allApril[0].total).toLocaleString('en-IN')} because it includes ALL orders`);
        console.log(`for April 2025, regardless of the 11-month limit.`);
        console.log();
        console.log(`Missing from card: ₹${(Number(allApril[0].total) - Number(within11Months[0].total)).toLocaleString('en-IN')} (${allApril[0].count - within11Months[0].count} orders)`);
        
        process.exit(0);
    } catch (error) {
        console.error('Error:', error.message);
        console.error(error.stack);
        process.exit(1);
    }
}

verifyDateRange();
