/**
 * Script to safely delete the products table
 * This will remove the products table and all its data
 */

const mysql = require('mysql2/promise');

async function deleteProductsTable() {
    let connection;
    try {
        // Create connection
        connection = await mysql.createConnection({
            host: 'localhost',
            user: 'root',
            password: '',
            database: 'enercondb',
            port: 3306
        });

        console.log('🔗 Connected to enercondb database\n');

        // Check if products table exists
        console.log('🔍 Checking if products table exists...');
        const [checkTable] = await connection.execute("SHOW TABLES LIKE 'products'");
        
        if (checkTable.length === 0) {
            console.log('❌ Products table does not exist. Nothing to delete.');
            return;
        }

        console.log('✅ Products table found.');

        // Show current data count before deletion
        const [countResult] = await connection.execute('SELECT COUNT(*) as count FROM products');
        const recordCount = countResult[0].count;
        console.log(`📊 Current records in products table: ${recordCount}`);

        // Show sample data before deletion
        if (recordCount > 0) {
            console.log('\n📄 Sample data that will be deleted:');
            const [sampleData] = await connection.execute('SELECT id, name, sku, price, category FROM products LIMIT 3');
            console.table(sampleData);
        }

        // Confirmation prompt (in real scenario, you'd want user confirmation)
        console.log('\n⚠️  WARNING: This will permanently delete the products table and all its data!');
        console.log('🗑️  Proceeding with deletion...\n');

        // Delete the products table
        await connection.execute('DROP TABLE IF EXISTS products');
        
        console.log('✅ Products table has been successfully deleted!');

        // Verify deletion
        const [verifyDeletion] = await connection.execute("SHOW TABLES LIKE 'products'");
        if (verifyDeletion.length === 0) {
            console.log('✅ Verification: Products table no longer exists in the database.');
        } else {
            console.log('❌ Error: Products table still exists after deletion attempt.');
        }

        // Show remaining tables
        console.log('\n📋 Remaining tables in the database:');
        const [remainingTables] = await connection.execute('SHOW TABLES');
        remainingTables.forEach((table, index) => {
            const tableName = Object.values(table)[0];
            console.log(`${index + 1}. ${tableName}`);
        });

        console.log('\n🎉 Products table deletion completed successfully!');

    } catch (error) {
        console.error('❌ Error deleting products table:', error.message);
        console.error('Full error details:', error);
    } finally {
        if (connection) {
            await connection.end();
            console.log('\n🔒 Database connection closed');
        }
    }
}

// Run the deletion
deleteProductsTable();
