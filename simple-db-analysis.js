// Simple Database Table Analysis
const mysql = require('mysql2');

const connection = mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'enercondb'
});

console.log('🔍 Starting Database Analysis...\n');

connection.connect((err) => {
    if (err) {
        console.error('❌ Connection failed:', err.message);
        return;
    }
    
    console.log('✅ Connected to database\n');
    
    // Show all tables
    connection.query('SHOW TABLES', (err, tables) => {
        if (err) {
            console.error('❌ Error showing tables:', err.message);
            return;
        }
        
        console.log('📋 Available Tables:');
        tables.forEach((table, index) => {
            const tableName = Object.values(table)[0];
            console.log(`${index + 1}. ${tableName}`);
        });
        
        console.log('\n📊 ORDERS TABLE STRUCTURE:');
        console.log('============================');
        
        // Describe orders table
        connection.query('DESCRIBE orders', (err, columns) => {
            if (err) {
                console.error('❌ Error describing orders:', err.message);
            } else {
                console.log('Field                Type                 Null    Key     Default    Extra');
                console.log('--------------------------------------------------------------------------------');
                columns.forEach(col => {
                    console.log(`${col.Field.padEnd(18)} ${col.Type.padEnd(18)} ${col.Null.padEnd(6)} ${col.Key.padEnd(6)} ${(col.Default || 'NULL').toString().padEnd(8)} ${col.Extra || ''}`);
                });
            }
            
            // Check collections table
            console.log('\n\n💰 COLLECTIONS TABLE CHECK:');
            console.log('============================');
            
            connection.query('SHOW TABLES LIKE "collections"', (err, result) => {
                if (err) {
                    console.error('❌ Error checking collections:', err.message);
                } else if (result.length > 0) {
                    console.log('✅ Collections table exists');
                    connection.query('DESCRIBE collections', (err, columns) => {
                        if (err) {
                            console.error('❌ Error describing collections:', err.message);
                        } else {
                            console.log('Field                Type                 Null    Key     Default    Extra');
                            console.log('--------------------------------------------------------------------------------');
                            columns.forEach(col => {
                                console.log(`${col.Field.padEnd(18)} ${col.Type.padEnd(18)} ${col.Null.padEnd(6)} ${col.Key.padEnd(6)} ${(col.Default || 'NULL').toString().padEnd(8)} ${col.Extra || ''}`);
                            });
                        }
                        connection.end();
                    });
                } else {
                    console.log('❌ Collections table does not exist');
                    console.log('\n💡 Suggested Collections Table:');
                    console.log(`
CREATE TABLE collections (
    id INT AUTO_INCREMENT PRIMARY KEY,
    orderId INT NOT NULL,
    counterId INT NOT NULL,
    invoiceNumber VARCHAR(50),
    totalAmount DECIMAL(10,2) NOT NULL,
    collectedAmount DECIMAL(10,2) DEFAULT 0.00,
    pendingAmount DECIMAL(10,2) GENERATED ALWAYS AS (totalAmount - collectedAmount) STORED,
    paymentMethod ENUM('cash', 'cheque', 'upi', 'bank_transfer', 'card') DEFAULT 'cash',
    transactionId VARCHAR(100),
    collectionDate DATE NOT NULL,
    dueDate DATE,
    status ENUM('pending', 'partial', 'completed', 'overdue') DEFAULT 'pending',
    remarks TEXT,
    collectedBy INT,
    createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (orderId) REFERENCES orders(id) ON DELETE CASCADE,
    FOREIGN KEY (counterId) REFERENCES counters(id),
    FOREIGN KEY (collectedBy) REFERENCES users(id)
);`);
                    connection.end();
                }
            });
        });
    });
});
