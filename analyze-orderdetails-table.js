/**
 * OrderDetails Table Analysis Script
 * This script analyzes the orderdetails table structure and data
 */

const { query } = require('./src/config/database');

async function analyzeOrderDetailsTable() {
    try {
        console.log('🔍 Analyzing OrderDetails Table Structure...\n');

        // Get table structure
        console.log('📋 TABLE STRUCTURE:');
        console.log('==================');
        const structure = await query('DESCRIBE orderdetails');
        
        console.table(structure);

        // Get table information
        console.log('\n📊 TABLE INFORMATION:');
        console.log('=====================');
        const tableInfo = await query(`
            SELECT 
                TABLE_SCHEMA as database_name,
                TABLE_NAME as table_name,
                ENGINE,
                TABLE_ROWS as estimated_rows,
                DATA_LENGTH as data_size_bytes,
                INDEX_LENGTH as index_size_bytes,
                CREATE_TIME,
                UPDATE_TIME,
                TABLE_COMMENT
            FROM information_schema.TABLES 
            WHERE TABLE_SCHEMA = 'enercondb' 
            AND TABLE_NAME = 'orderdetails'
        `);
        
        console.table(tableInfo);

        // Get indexes
        console.log('\n🔑 INDEXES:');
        console.log('==========');
        const indexes = await query('SHOW INDEX FROM orderdetails');
        
        console.table(indexes.map(idx => ({
            Key_name: idx.Key_name,
            Column_name: idx.Column_name,
            Seq_in_index: idx.Seq_in_index,
            Non_unique: idx.Non_unique,
            Index_type: idx.Index_type
        })));

        // Get foreign key constraints
        console.log('\n🔗 FOREIGN KEY CONSTRAINTS:');
        console.log('===========================');
        const foreignKeys = await query(`
            SELECT 
                CONSTRAINT_NAME,
                COLUMN_NAME,
                REFERENCED_TABLE_NAME,
                REFERENCED_COLUMN_NAME
            FROM information_schema.KEY_COLUMN_USAGE 
            WHERE TABLE_SCHEMA = 'enercondb' 
            AND TABLE_NAME = 'orderdetails'
            AND REFERENCED_TABLE_NAME IS NOT NULL
        `);
        
        if (foreignKeys.length > 0) {
            console.table(foreignKeys);
        } else {
            console.log('No foreign key constraints found.');
        }

        // Get sample data
        console.log('\n📄 SAMPLE DATA (Latest 10 records):');
        console.log('====================================');
        const sampleData = await query(`
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
            LIMIT 10
        `);
        
        if (sampleData.length > 0) {
            console.table(sampleData);
        } else {
            console.log('No data found in orderdetails table.');
        }

        // Get data statistics
        console.log('\n📈 DATA STATISTICS:');
        console.log('==================');
        const stats = await query(`
            SELECT 
                COUNT(*) as total_records,
                COUNT(DISTINCT orderId) as unique_orders,
                COUNT(DISTINCT productId) as unique_products,
                MIN(qty) as min_quantity,
                MAX(qty) as max_quantity,
                AVG(qty) as avg_quantity,
                MIN(offerPrice) as min_offer_price,
                MAX(offerPrice) as max_offer_price,
                AVG(offerPrice) as avg_offer_price,
                SUM(total) as total_amount,
                MIN(createdAt) as earliest_record,
                MAX(createdAt) as latest_record
            FROM orderdetails
        `);
        
        console.table(stats);

        // Column analysis
        console.log('\n🔍 COLUMN ANALYSIS:');
        console.log('==================');
        
        const columnAnalysis = [];
        for (const column of structure) {
            const columnStats = await query(`
                SELECT 
                    '${column.Field}' as column_name,
                    COUNT(*) as total_records,
                    COUNT(${column.Field}) as non_null_records,
                    COUNT(*) - COUNT(${column.Field}) as null_records,
                    CASE 
                        WHEN COUNT(${column.Field}) = 0 THEN 0
                        ELSE ROUND((COUNT(${column.Field}) / COUNT(*)) * 100, 2)
                    END as non_null_percentage
                FROM orderdetails
            `);
            columnAnalysis.push(columnStats[0]);
        }
        
        console.table(columnAnalysis);

        // Check for data integrity issues
        console.log('\n🔍 DATA INTEGRITY CHECK:');
        console.log('========================');
        
        // Check for orphaned records (orderdetails without valid orders)
        const orphanedOrders = await query(`
            SELECT COUNT(*) as orphaned_order_records
            FROM orderdetails od
            LEFT JOIN orders o ON od.orderId = o.id
            WHERE o.id IS NULL
        `);
        
        // Check for orphaned records (orderdetails without valid products)
        const orphanedProducts = await query(`
            SELECT COUNT(*) as orphaned_product_records
            FROM orderdetails od
            LEFT JOIN product p ON od.productId = p.id
            WHERE p.id IS NULL
        `);
        
        // Check for negative quantities or prices
        const negativeValues = await query(`
            SELECT 
                COUNT(CASE WHEN qty < 0 THEN 1 END) as negative_quantities,
                COUNT(CASE WHEN offerPrice < 0 THEN 1 END) as negative_offer_prices,
                COUNT(CASE WHEN total < 0 THEN 1 END) as negative_totals
            FROM orderdetails
        `);
        
        console.log('Orphaned Records (orderdetails without valid orders):', orphanedOrders[0].orphaned_order_records);
        console.log('Orphaned Records (orderdetails without valid products):', orphanedProducts[0].orphaned_product_records);
        console.table(negativeValues);

        console.log('\n✅ OrderDetails Table Analysis Complete!');
        
    } catch (error) {
        console.error('❌ Error analyzing orderdetails table:', error);
    } finally {
        process.exit(0);
    }
}

// Run the analysis
analyzeOrderDetailsTable();
