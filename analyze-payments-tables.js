const mysql = require('mysql2/promise');
require('dotenv').config();

const dbConfig = {
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'test'
};

async function analyzePaymentsTables() {
    let connection;
    
    try {
        connection = await mysql.createConnection(dbConfig);
        console.log('✅ Connected to database for payments analysis');
        
        // Check if paymenttype table exists
        console.log('\n=== PAYMENT TYPE TABLE ANALYSIS ===');
        try {
            const [paymentTypeRows] = await connection.execute('DESCRIBE paymenttype');
            console.log('\n📋 PaymentType Table Structure:');
            paymentTypeRows.forEach(column => {
                console.log(`  ${column.Field}: ${column.Type} ${column.Null === 'NO' ? '(NOT NULL)' : '(NULL)'} ${column.Key ? `[${column.Key}]` : ''} ${column.Default !== null ? `DEFAULT: ${column.Default}` : ''}`);
            });
            
            // Sample data
            const [paymentTypeData] = await connection.execute('SELECT * FROM paymenttype LIMIT 10');
            console.log('\n📊 Sample PaymentType Data:');
            console.table(paymentTypeData);
            
            // Count
            const [paymentTypeCount] = await connection.execute('SELECT COUNT(*) as count FROM paymenttype');
            console.log(`\n📈 Total PaymentType Records: ${paymentTypeCount[0].count}`);
            
        } catch (error) {
            console.log('❌ PaymentType table not found or error:', error.message);
        }
        
        // Check if payments table exists
        console.log('\n=== PAYMENTS TABLE ANALYSIS ===');
        try {
            const [paymentsRows] = await connection.execute('DESCRIBE payments');
            console.log('\n📋 Payments Table Structure:');
            paymentsRows.forEach(column => {
                console.log(`  ${column.Field}: ${column.Type} ${column.Null === 'NO' ? '(NOT NULL)' : '(NULL)'} ${column.Key ? `[${column.Key}]` : ''} ${column.Default !== null ? `DEFAULT: ${column.Default}` : ''}`);
            });
            
            // Sample data
            const [paymentsData] = await connection.execute('SELECT * FROM payments LIMIT 10');
            console.log('\n📊 Sample Payments Data:');
            console.table(paymentsData);
            
            // Count
            const [paymentsCount] = await connection.execute('SELECT COUNT(*) as count FROM payments');
            console.log(`\n📈 Total Payments Records: ${paymentsCount[0].count}`);
            
        } catch (error) {
            console.log('❌ Payments table not found or error:', error.message);
        }
        
        // Check for related tables that might contain payment info
        console.log('\n=== CHECKING FOR RELATED PAYMENT TABLES ===');
        
        const [tables] = await connection.execute("SHOW TABLES");
        const tableNames = tables.map(table => Object.values(table)[0]);
        const paymentRelatedTables = tableNames.filter(name => 
            name.toLowerCase().includes('payment') || 
            name.toLowerCase().includes('transaction') ||
            name.toLowerCase().includes('collection')
        );
        
        console.log('\n🔍 Payment-related tables found:');
        paymentRelatedTables.forEach(table => console.log(`  - ${table}`));
        
        // Analyze collections table since it might contain payment info
        if (tableNames.includes('collections')) {
            console.log('\n=== COLLECTIONS TABLE ANALYSIS (Payment Data) ===');
            try {
                const [collectionsRows] = await connection.execute('DESCRIBE collections');
                console.log('\n📋 Collections Table Structure:');
                collectionsRows.forEach(column => {
                    console.log(`  ${column.Field}: ${column.Type} ${column.Null === 'NO' ? '(NOT NULL)' : '(NULL)'} ${column.Key ? `[${column.Key}]` : ''} ${column.Default !== null ? `DEFAULT: ${column.Default}` : ''}`);
                });
                
                // Sample data with order info
                const [collectionsData] = await connection.execute(`
                    SELECT 
                        c.*,
                        o.invoiceFileName,
                        o.grandTotal as orderTotal,
                        cnt.CounterName as counterName
                    FROM collections c
                    LEFT JOIN orders o ON c.orderID = o.id
                    LEFT JOIN counters cnt ON o.counterID = cnt.id
                    LIMIT 5
                `);
                console.log('\n📊 Sample Collections Data with Order Info:');
                console.table(collectionsData);
                
                // Statistics
                const [stats] = await connection.execute(`
                    SELECT 
                        COUNT(*) as totalCollections,
                        SUM(amount) as totalAmount,
                        MIN(transactionDate) as earliestDate,
                        MAX(transactionDate) as latestDate,
                        AVG(amount) as avgAmount
                    FROM collections
                `);
                console.log('\n📈 Collections Statistics:');
                console.table(stats);
                
            } catch (error) {
                console.log('❌ Error analyzing collections table:', error.message);
            }
        }
        
        // Check orders table for payment status
        if (tableNames.includes('orders')) {
            console.log('\n=== ORDERS PAYMENT STATUS ANALYSIS ===');
            try {
                const [paymentStatus] = await connection.execute(`
                    SELECT 
                        paymentReceived,
                        COUNT(*) as count,
                        SUM(grandTotal) as totalAmount
                    FROM orders 
                    GROUP BY paymentReceived
                `);
                console.log('\n📊 Payment Status Summary:');
                console.table(paymentStatus);
                
                // Recent orders for payment processing
                const [recentOrders] = await connection.execute(`
                    SELECT 
                        o.id,
                        o.invoiceFileName,
                        o.grandTotal,
                        o.paymentReceived,
                        o.orderDate,
                        cnt.CounterName as counterName
                    FROM orders o
                    LEFT JOIN counters cnt ON o.counterID = cnt.id
                    ORDER BY o.orderDate DESC
                    LIMIT 10
                `);
                console.log('\n📊 Recent Orders for Payment Processing:');
                console.table(recentOrders);
                
            } catch (error) {
                console.log('❌ Error analyzing orders payment status:', error.message);
            }
        }
        
    } catch (error) {
        console.error('❌ Database connection error:', error.message);
    } finally {
        if (connection) {
            await connection.end();
            console.log('\n✅ Database connection closed');
        }
    }
}

// Run the analysis
analyzePaymentsTables().catch(console.error);
