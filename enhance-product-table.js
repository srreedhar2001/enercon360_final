/**
 * Add missing fields to the existing product table
 * This will enhance the table for web application integration
 * WITHOUT deleting any existing fields or data
 */

const mysql = require('mysql2/promise');

async function addMissingFields() {
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

        // First, show current structure
        console.log('📊 CURRENT PRODUCT TABLE STRUCTURE:');
        console.log('===================================');
        const [currentStructure] = await connection.execute('DESCRIBE product');
        currentStructure.forEach(col => {
            console.log(`• ${col.Field}: ${col.Type} ${col.Null === 'YES' ? 'NULL' : 'NOT NULL'}`);
        });

        console.log('\n🔧 ADDING MISSING FIELDS FOR WEB INTEGRATION:');
        console.log('=============================================');

        // Add SKU field (unique product identifier)
        console.log('1. Adding SKU field...');
        try {
            await connection.execute(`
                ALTER TABLE product 
                ADD COLUMN sku VARCHAR(100) UNIQUE 
                AFTER name
            `);
            console.log('✅ SKU field added successfully');
        } catch (error) {
            if (error.code === 'ER_DUP_FIELDNAME') {
                console.log('⚠️ SKU field already exists');
            } else {
                throw error;
            }
        }

        // Add category field
        console.log('2. Adding category field...');
        try {
            await connection.execute(`
                ALTER TABLE product 
                ADD COLUMN category VARCHAR(100) 
                AFTER sku
            `);
            console.log('✅ Category field added successfully');
        } catch (error) {
            if (error.code === 'ER_DUP_FIELDNAME') {
                console.log('⚠️ Category field already exists');
            } else {
                throw error;
            }
        }

        // Add description field
        console.log('3. Adding description field...');
        try {
            await connection.execute(`
                ALTER TABLE product 
                ADD COLUMN description TEXT 
                AFTER category
            `);
            console.log('✅ Description field added successfully');
        } catch (error) {
            if (error.code === 'ER_DUP_FIELDNAME') {
                console.log('⚠️ Description field already exists');
            } else {
                throw error;
            }
        }

        // Add brand field
        console.log('4. Adding brand field...');
        try {
            await connection.execute(`
                ALTER TABLE product 
                ADD COLUMN brand VARCHAR(100) 
                AFTER description
            `);
            console.log('✅ Brand field added successfully');
        } catch (error) {
            if (error.code === 'ER_DUP_FIELDNAME') {
                console.log('⚠️ Brand field already exists');
            } else {
                throw error;
            }
        }

        // Add weight field (useful for shipping)
        console.log('5. Adding weight field...');
        try {
            await connection.execute(`
                ALTER TABLE product 
                ADD COLUMN weight DECIMAL(8,2) 
                AFTER brand
            `);
            console.log('✅ Weight field added successfully');
        } catch (error) {
            if (error.code === 'ER_DUP_FIELDNAME') {
                console.log('⚠️ Weight field already exists');
            } else {
                throw error;
            }
        }

        // Add dimensions field
        console.log('6. Adding dimensions field...');
        try {
            await connection.execute(`
                ALTER TABLE product 
                ADD COLUMN dimensions VARCHAR(100) 
                AFTER weight
            `);
            console.log('✅ Dimensions field added successfully');
        } catch (error) {
            if (error.code === 'ER_DUP_FIELDNAME') {
                console.log('⚠️ Dimensions field already exists');
            } else {
                throw error;
            }
        }

        // Add created_at timestamp (for tracking when product was added)
        console.log('7. Adding created_at timestamp...');
        try {
            await connection.execute(`
                ALTER TABLE product 
                ADD COLUMN created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP 
                AFTER isActive
            `);
            console.log('✅ Created_at field added successfully');
        } catch (error) {
            if (error.code === 'ER_DUP_FIELDNAME') {
                console.log('⚠️ Created_at field already exists');
            } else {
                throw error;
            }
        }

        // Add updated_at timestamp (for tracking modifications)
        console.log('8. Adding updated_at timestamp...');
        try {
            await connection.execute(`
                ALTER TABLE product 
                ADD COLUMN updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP 
                AFTER created_at
            `);
            console.log('✅ Updated_at field added successfully');
        } catch (error) {
            if (error.code === 'ER_DUP_FIELDNAME') {
                console.log('⚠️ Updated_at field already exists');
            } else {
                throw error;
            }
        }

        console.log('\n🔍 ADDING PERFORMANCE INDEXES:');
        console.log('==============================');

        // Add indexes for better performance
        const indexes = [
            { name: 'idx_sku', column: 'sku', description: 'SKU lookup' },
            { name: 'idx_category', column: 'category', description: 'Category filtering' },
            { name: 'idx_isActive', column: 'isActive', description: 'Status filtering' },
            { name: 'idx_name', column: 'name', description: 'Name search' },
            { name: 'idx_brand', column: 'brand', description: 'Brand filtering' }
        ];

        for (const idx of indexes) {
            try {
                await connection.execute(`CREATE INDEX ${idx.name} ON product (${idx.column})`);
                console.log(`✅ ${idx.name} index created for ${idx.description}`);
            } catch (error) {
                if (error.code === 'ER_DUP_KEYNAME') {
                    console.log(`⚠️ ${idx.name} index already exists`);
                } else {
                    console.log(`❌ Failed to create ${idx.name}: ${error.message}`);
                }
            }
        }

        console.log('\n🔄 UPDATING EXISTING RECORDS WITH DEFAULT VALUES:');
        console.log('=================================================');

        // Generate SKUs for existing products that don't have them
        const [existingProducts] = await connection.execute('SELECT id, name FROM product WHERE sku IS NULL');
        
        if (existingProducts.length > 0) {
            console.log(`Found ${existingProducts.length} products without SKUs. Generating...`);
            
            for (const product of existingProducts) {
                const sku = `PROD${String(product.id).padStart(4, '0')}`;
                await connection.execute('UPDATE product SET sku = ? WHERE id = ?', [sku, product.id]);
                console.log(`• Generated SKU "${sku}" for product: ${product.name}`);
            }
        } else {
            console.log('All products already have SKUs');
        }

        // Set default categories based on product names
        console.log('\nSetting default categories based on product analysis...');
        await connection.execute(`
            UPDATE product 
            SET category = CASE 
                WHEN name LIKE '%demo%' OR name LIKE '%Demo%' THEN 'Sample Products'
                WHEN name LIKE '%eye%' OR name LIKE '%EYE%' THEN 'Eye Care'
                WHEN name LIKE '%gel%' OR name LIKE '%GEL%' THEN 'Topical Products'
                WHEN name LIKE '%must%' OR name LIKE '%MUST%' THEN 'Antibiotics'
                ELSE 'Pharmaceuticals'
            END
            WHERE category IS NULL
        `);
        console.log('✅ Default categories assigned');

        // Show updated structure
        console.log('\n📊 UPDATED PRODUCT TABLE STRUCTURE:');
        console.log('===================================');
        const [updatedStructure] = await connection.execute('DESCRIBE product');
        updatedStructure.forEach((col, index) => {
            const nullable = col.Null === 'YES' ? 'NULL' : 'NOT NULL';
            const keyInfo = col.Key ? `[${col.Key}]` : '';
            const defaultInfo = col.Default !== null ? `(default: ${col.Default})` : '';
            const isNew = index >= currentStructure.length ? '🆕' : '';
            console.log(`• ${col.Field}: ${col.Type} ${nullable} ${keyInfo} ${defaultInfo} ${isNew}`);
        });

        // Show sample of updated data
        console.log('\n📄 SAMPLE UPDATED DATA:');
        console.log('=======================');
        const [sampleData] = await connection.execute(`
            SELECT id, name, sku, category, mrp, qty, isActive, created_at 
            FROM product 
            LIMIT 3
        `);
        console.table(sampleData);

        console.log('\n🎉 ENHANCEMENT COMPLETED SUCCESSFULLY!');
        console.log('=====================================');
        console.log('✅ All existing fields preserved');
        console.log('✅ New fields added for web integration');
        console.log('✅ Performance indexes created');
        console.log('✅ Default values populated');
        console.log('✅ Ready for frontend integration');

        console.log('\n📋 FIELD MAPPING FOR FRONTEND:');
        console.log('==============================');
        console.log('productName        → name ✅');
        console.log('productSku         → sku ✅ (newly added)');
        console.log('productCategory    → category ✅ (newly added)');
        console.log('productPrice       → mrp ✅');
        console.log('productStock       → qty ✅');
        console.log('productDescription → description ✅ (newly added)');
        console.log('productStatus      → isActive ✅ (needs conversion: active/inactive ↔ 1/0)');

        console.log('\n💡 PHARMACEUTICAL-SPECIFIC FEATURES PRESERVED:');
        console.log('==============================================');
        console.log('• manufacturingPrice - Cost tracking');
        console.log('• expDate - Expiration date tracking');
        console.log('• manDate - Manufacturing date tracking');
        console.log('• productImage - Product image storage');
        console.log('• mrp - Maximum Retail Price compliance');

    } catch (error) {
        console.error('❌ Error enhancing product table:', error.message);
        console.error('Full error details:', error);
    } finally {
        if (connection) {
            await connection.end();
            console.log('\n🔒 Database connection closed');
        }
    }
}

// Run the enhancement
addMissingFields();
