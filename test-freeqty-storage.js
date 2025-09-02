/**
 * Test script to verify freeQty is being stored in orderdetails table
 */

const { query } = require('./src/config/database');

async function testFreeQtyStorage() {
    try {
        console.log('🧪 Testing freeQty Storage in OrderDetails Table...\n');

        // Get the latest orderdetails record
        console.log('📋 Latest OrderDetails Records:');
        console.log('===============================');
        const latestRecords = await query(`
            SELECT 
                od.*,
                p.name as product_name,
                o.orderDate,
                c.CounterName
            FROM orderdetails od
            LEFT JOIN product p ON od.productId = p.id
            LEFT JOIN orders o ON od.orderId = o.id
            LEFT JOIN counters c ON o.counterID = c.id
            ORDER BY od.id DESC 
            LIMIT 5
        `);
        
        console.table(latestRecords);

        // Check for records with freeQty > 0
        console.log('\n🎁 Records with Free Quantity:');
        console.log('=============================');
        const freeQtyRecords = await query(`
            SELECT 
                od.id,
                od.orderId,
                p.name as product_name,
                od.qty as ordered_qty,
                od.freeQty as free_qty,
                od.total,
                od.createdAt
            FROM orderdetails od
            LEFT JOIN product p ON od.productId = p.id
            WHERE od.freeQty > 0
            ORDER BY od.id DESC
        `);
        
        if (freeQtyRecords.length > 0) {
            console.table(freeQtyRecords);
        } else {
            console.log('No records found with freeQty > 0');
        }

        // Summary statistics
        console.log('\n📊 FreeQty Statistics:');
        console.log('======================');
        const stats = await query(`
            SELECT 
                COUNT(*) as total_records,
                COUNT(CASE WHEN freeQty > 0 THEN 1 END) as records_with_free_qty,
                SUM(freeQty) as total_free_quantity,
                MAX(freeQty) as max_free_qty,
                AVG(freeQty) as avg_free_qty
            FROM orderdetails
        `);
        
        console.table(stats);

        console.log('\n✅ FreeQty Storage Test Complete!');
        
        // Instructions for testing
        console.log('\n📝 To test freeQty storage:');
        console.log('==========================');
        console.log('1. Open http://localhost:3000/order.html');
        console.log('2. Create a new order');
        console.log('3. Add a product and enter a value in the "Free" column');
        console.log('4. Submit the order');
        console.log('5. Run this test script again to verify freeQty was saved');
        
    } catch (error) {
        console.error('❌ Error testing freeQty storage:', error);
    } finally {
        process.exit(0);
    }
}

// Run the test
testFreeQtyStorage();
