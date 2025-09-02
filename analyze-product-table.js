/**
 * Analyze the existing 'product' table structure
 * This will examine the singular 'product' table that already exists
 */

const mysql = require('mysql2/promise');

async function analyzeProductTable() {
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

        // Check if 'product' table exists (singular)
        console.log('🔍 Checking for existing product table...');
        const [productCheck] = await connection.execute("SHOW TABLES LIKE 'product'");
        
        if (productCheck.length === 0) {
            console.log('❌ Product table (singular) does not exist.');
            
            // Check what product-related tables exist
            console.log('\n🔍 Checking for product-related tables...');
            const [allTables] = await connection.execute('SHOW TABLES');
            const productRelated = allTables.filter(table => {
                const tableName = Object.values(table)[0].toLowerCase();
                return tableName.includes('product') || tableName.includes('item');
            });
            
            if (productRelated.length > 0) {
                console.log('📋 Product-related tables found:');
                productRelated.forEach((table, index) => {
                    console.log(`${index + 1}. ${Object.values(table)[0]}`);
                });
            } else {
                console.log('❌ No product-related tables found.');
            }
            return;
        }

        console.log('✅ Product table (singular) found!');

        // Get detailed table structure
        console.log('\n📊 PRODUCT TABLE STRUCTURE:');
        console.log('===========================');
        const [structure] = await connection.execute('DESCRIBE product');
        
        console.log('Field Details:');
        console.log('--------------');
        structure.forEach(col => {
            const nullable = col.Null === 'YES' ? 'NULL' : 'NOT NULL';
            const keyInfo = col.Key ? `[${col.Key}]` : '';
            const defaultInfo = col.Default !== null ? `(default: ${col.Default})` : '';
            const extra = col.Extra ? `{${col.Extra}}` : '';
            console.log(`• ${col.Field}: ${col.Type} ${nullable} ${keyInfo} ${defaultInfo} ${extra}`);
        });

        // Get indexes
        console.log('\n🔍 TABLE INDEXES:');
        console.log('================');
        const [indexes] = await connection.execute('SHOW INDEX FROM product');
        if (indexes.length > 0) {
            const indexGroups = {};
            indexes.forEach(idx => {
                if (!indexGroups[idx.Key_name]) {
                    indexGroups[idx.Key_name] = [];
                }
                indexGroups[idx.Key_name].push(idx.Column_name);
            });
            
            Object.keys(indexGroups).forEach(indexName => {
                const columns = indexGroups[indexName].join(', ');
                const isPrimary = indexName === 'PRIMARY' ? '[PRIMARY KEY]' : '';
                const isUnique = indexes.find(i => i.Key_name === indexName && i.Non_unique === 0) ? '[UNIQUE]' : '';
                console.log(`• ${indexName}: (${columns}) ${isPrimary}${isUnique}`);
            });
        } else {
            console.log('No indexes found');
        }

        // Get record count
        const [countResult] = await connection.execute('SELECT COUNT(*) as count FROM product');
        const recordCount = countResult[0].count;
        console.log(`\n📊 Total records: ${recordCount}`);

        // Show sample data if exists
        if (recordCount > 0) {
            console.log('\n📄 SAMPLE DATA (first 5 rows):');
            console.log('==============================');
            const [sampleData] = await connection.execute('SELECT * FROM product LIMIT 5');
            console.table(sampleData);

            // Show field analysis
            console.log('\n📈 DATA ANALYSIS:');
            console.log('================');
            
            // Check for common patterns
            const [fieldAnalysis] = await connection.execute(`
                SELECT 
                    COUNT(DISTINCT id) as unique_ids,
                    COUNT(*) as total_records,
                    MIN(id) as min_id,
                    MAX(id) as max_id
                FROM product
            `);
            
            console.log('ID Field Analysis:');
            console.log(`• Unique IDs: ${fieldAnalysis[0].unique_ids}`);
            console.log(`• Total Records: ${fieldAnalysis[0].total_records}`);
            console.log(`• ID Range: ${fieldAnalysis[0].min_id} - ${fieldAnalysis[0].max_id}`);

            // Check for text fields
            const textFields = structure.filter(col => 
                col.Type.includes('varchar') || 
                col.Type.includes('text') || 
                col.Type.includes('char')
            ).map(col => col.Field);

            if (textFields.length > 0) {
                console.log('\nText Fields Analysis:');
                for (const field of textFields) {
                    try {
                        const [fieldStats] = await connection.execute(`
                            SELECT 
                                COUNT(DISTINCT ${field}) as unique_values,
                                COUNT(${field}) as non_null_count,
                                AVG(LENGTH(${field})) as avg_length
                            FROM product 
                            WHERE ${field} IS NOT NULL
                        `);
                        
                        if (fieldStats[0]) {
                            console.log(`• ${field}: ${fieldStats[0].unique_values} unique values, avg length: ${Math.round(fieldStats[0].avg_length || 0)}`);
                        }
                    } catch (error) {
                        console.log(`• ${field}: Unable to analyze (${error.message})`);
                    }
                }
            }

            // Check for numeric fields
            const numericFields = structure.filter(col => 
                col.Type.includes('int') || 
                col.Type.includes('decimal') || 
                col.Type.includes('float') ||
                col.Type.includes('double')
            ).map(col => col.Field);

            if (numericFields.length > 1) {
                console.log('\nNumeric Fields Analysis:');
                for (const field of numericFields.slice(1)) { // Skip ID field
                    try {
                        const [numStats] = await connection.execute(`
                            SELECT 
                                MIN(${field}) as min_val,
                                MAX(${field}) as max_val,
                                AVG(${field}) as avg_val,
                                COUNT(${field}) as non_null_count
                            FROM product 
                            WHERE ${field} IS NOT NULL
                        `);
                        
                        if (numStats[0]) {
                            const avg = numStats[0].avg_val ? Math.round(numStats[0].avg_val * 100) / 100 : 0;
                            console.log(`• ${field}: Range ${numStats[0].min_val} - ${numStats[0].max_val}, Avg: ${avg}`);
                        }
                    } catch (error) {
                        console.log(`• ${field}: Unable to analyze (${error.message})`);
                    }
                }
            }

        } else {
            console.log('(Table is empty - no data to analyze)');
        }

        // Relationships analysis
        console.log('\n🔗 POTENTIAL RELATIONSHIPS:');
        console.log('===========================');
        
        // Check for foreign key constraints
        const [fkConstraints] = await connection.execute(`
            SELECT 
                CONSTRAINT_NAME,
                COLUMN_NAME,
                REFERENCED_TABLE_NAME,
                REFERENCED_COLUMN_NAME
            FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE 
            WHERE TABLE_SCHEMA = 'enercondb' 
            AND TABLE_NAME = 'product' 
            AND REFERENCED_TABLE_NAME IS NOT NULL
        `);

        if (fkConstraints.length > 0) {
            console.log('Foreign Key Constraints:');
            fkConstraints.forEach(fk => {
                console.log(`• ${fk.COLUMN_NAME} → ${fk.REFERENCED_TABLE_NAME}.${fk.REFERENCED_COLUMN_NAME}`);
            });
        } else {
            console.log('• No formal foreign key constraints defined');
        }

        // Look for potential relationship fields
        const relationshipFields = structure.filter(col => 
            col.Field.toLowerCase().includes('_id') ||
            col.Field.toLowerCase().includes('id') && col.Field !== 'id'
        ).map(col => col.Field);

        if (relationshipFields.length > 0) {
            console.log('Potential Relationship Fields:');
            relationshipFields.forEach(field => {
                console.log(`• ${field} (might relate to another table)`);
            });
        }

        console.log('\n💡 INTEGRATION RECOMMENDATIONS:');
        console.log('===============================');
        console.log('1. Create Product.js model in src/models/');
        console.log('2. Create productController.js in src/controllers/');
        console.log('3. Create productRoutes.js in src/routes/');
        console.log('4. Update product.html to connect to real API');
        console.log('5. Consider adding indexes for performance');
        console.log('6. Validate data types match frontend expectations');

    } catch (error) {
        console.error('❌ Error analyzing product table:', error.message);
        console.error('Full error details:', error);
    } finally {
        if (connection) {
            await connection.end();
            console.log('\n🔒 Database connection closed');
        }
    }
}

// Run the analysis
analyzeProductTable();
