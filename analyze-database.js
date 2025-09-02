/**
 * Database Structure Analysis Tool
 * Examines the current database tables and suggests product table structure
 */

const mysql = require('mysql2/promise');

async function analyzeDatabase() {
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

        // Show all tables
        console.log('📋 EXISTING TABLES:');
        console.log('==================');
        const [tables] = await connection.execute('SHOW TABLES');
        
        if (tables.length === 0) {
            console.log('❌ No tables found in the database');
            return;
        }

        tables.forEach((table, index) => {
            const tableName = Object.values(table)[0];
            console.log(`${index + 1}. ${tableName}`);
        });

        // Check for products table specifically
        console.log('\n🏷️ PRODUCT TABLE ANALYSIS:');
        console.log('===========================');
        
        const [productCheck] = await connection.execute("SHOW TABLES LIKE 'products'");
        
        if (productCheck.length > 0) {
            console.log('✅ Products table EXISTS!');
            
            // Get structure
            const [structure] = await connection.execute('DESCRIBE products');
            console.log('\n📊 Current Product Table Structure:');
            console.log('-----------------------------------');
            structure.forEach(col => {
                const nullable = col.Null === 'YES' ? 'NULL' : 'NOT NULL';
                const keyInfo = col.Key ? `[${col.Key}]` : '';
                const defaultInfo = col.Default !== null ? `(default: ${col.Default})` : '';
                console.log(`• ${col.Field}: ${col.Type} ${nullable} ${keyInfo} ${defaultInfo}`);
            });

            // Sample data
            console.log('\n📄 Sample Data (first 5 rows):');
            console.log('-------------------------------');
            const [sampleData] = await connection.execute('SELECT * FROM products LIMIT 5');
            if (sampleData.length > 0) {
                console.table(sampleData);
            } else {
                console.log('(No data in products table)');
            }

        } else {
            console.log('❌ Products table does NOT exist');
            console.log('\n💡 RECOMMENDED PRODUCT TABLE STRUCTURE:');
            console.log('=======================================');
            
            const recommendedStructure = `
CREATE TABLE products (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    sku VARCHAR(100) UNIQUE NOT NULL,
    description TEXT,
    category VARCHAR(100) NOT NULL,
    price DECIMAL(10,2) NOT NULL,
    stock_quantity INT DEFAULT 0,
    status ENUM('active', 'inactive', 'out-of-stock') DEFAULT 'active',
    image_url VARCHAR(500),
    brand VARCHAR(100),
    weight DECIMAL(8,2),
    dimensions VARCHAR(100),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    INDEX idx_category (category),
    INDEX idx_status (status),
    INDEX idx_sku (sku),
    INDEX idx_price (price)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;`;

            console.log(recommendedStructure);
            
            console.log('\n📋 Field Explanations:');
            console.log('======================');
            console.log('• id: Primary key, auto-increment');
            console.log('• name: Product name (required)');
            console.log('• sku: Stock Keeping Unit - unique identifier');
            console.log('• description: Detailed product description');
            console.log('• category: Product category (electronics, clothing, etc.)');
            console.log('• price: Product price with 2 decimal places');
            console.log('• stock_quantity: Current stock level');
            console.log('• status: active/inactive/out-of-stock');
            console.log('• image_url: Product image URL');
            console.log('• brand: Product brand/manufacturer');
            console.log('• weight: Product weight');
            console.log('• dimensions: Product dimensions (LxWxH)');
            console.log('• created_at: When product was created');
            console.log('• updated_at: When product was last modified');
        }

        // Check users table for reference
        console.log('\n👥 USERS TABLE STRUCTURE (for reference):');
        console.log('=========================================');
        const [userCheck] = await connection.execute("SHOW TABLES LIKE 'users'");
        
        if (userCheck.length > 0) {
            const [userStructure] = await connection.execute('DESCRIBE users');
            userStructure.forEach(col => {
                const nullable = col.Null === 'YES' ? 'NULL' : 'NOT NULL';
                const keyInfo = col.Key ? `[${col.Key}]` : '';
                console.log(`• ${col.Field}: ${col.Type} ${nullable} ${keyInfo}`);
            });
        }

    } catch (error) {
        console.error('❌ Database analysis error:', error.message);
        console.error('Full error:', error);
    } finally {
        if (connection) {
            await connection.end();
            console.log('\n🔒 Database connection closed');
        }
    }
}

// Run the analysis
analyzeDatabase();
