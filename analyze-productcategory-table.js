/**
 * Analyze the existing 'productcategory' table structure
 */

const mysql = require('mysql2/promise');

async function analyzeProductCategoryTable() {
    let connection;
    try {
        // Adjust if your local DB creds differ
        connection = await mysql.createConnection({
            host: 'localhost',
            user: 'root',
            password: '',
            database: 'enercondb',
            port: 3306
        });

        console.log('🔗 Connected to enercondb database\n');

        console.log('🔍 Checking for existing productcategory table...');
        const [tableCheck] = await connection.execute("SHOW TABLES LIKE 'productcategory'");
        if (tableCheck.length === 0) {
            console.log('❌ productcategory table does not exist.');
            const [allTables] = await connection.execute('SHOW TABLES');
            const related = allTables
                .map(t => Object.values(t)[0])
                .filter(n => /category/i.test(n) || /prod/i.test(n));
            if (related.length) {
                console.log('\n📋 Related tables:');
                related.forEach((n, i) => console.log(`${i + 1}. ${n}`));
            }
            return;
        }

        console.log('✅ productcategory table found!');

        console.log('\n📊 TABLE STRUCTURE:');
        console.log('===================');
        const [structure] = await connection.execute('DESCRIBE productcategory');
        structure.forEach(col => {
            const nullable = col.Null === 'YES' ? 'NULL' : 'NOT NULL';
            const keyInfo = col.Key ? `[${col.Key}]` : '';
            const defaultInfo = col.Default !== null ? `(default: ${col.Default})` : '';
            const extra = col.Extra ? `{${col.Extra}}` : '';
            console.log(`• ${col.Field}: ${col.Type} ${nullable} ${keyInfo} ${defaultInfo} ${extra}`);
        });

        const [indexes] = await connection.execute('SHOW INDEX FROM productcategory');
        console.log('\n🔍 INDEXES:');
        if (indexes.length) {
            const groups = {};
            indexes.forEach(i => {
                groups[i.Key_name] = groups[i.Key_name] || [];
                groups[i.Key_name].push(i.Column_name);
            });
            Object.keys(groups).forEach(k => {
                const isPrimary = k === 'PRIMARY' ? '[PRIMARY KEY]' : '';
                const isUnique = indexes.find(i => i.Key_name === k && i.Non_unique === 0) ? '[UNIQUE]' : '';
                console.log(`• ${k}: (${groups[k].join(', ')}) ${isPrimary}${isUnique}`);
            });
        } else {
            console.log('No indexes found');
        }

        const [countRes] = await connection.execute('SELECT COUNT(*) as count FROM productcategory');
        const count = countRes[0].count;
        console.log(`\n📊 Total records: ${count}`);

        if (count > 0) {
            console.log('\n📄 SAMPLE DATA (first 10 rows):');
            const [rows] = await connection.execute('SELECT * FROM productcategory LIMIT 10');
            console.table(rows);

            // Try to detect name/id columns
            const nameCandidates = ['name', 'category', 'categoryName', 'title', 'label'];
            const idCandidates = ['id', 'categoryId'];
            const cols = structure.map(c => c.Field.toLowerCase());
            const detectedName = nameCandidates.find(n => cols.includes(n.toLowerCase()));
            const detectedId = idCandidates.find(n => cols.includes(n.toLowerCase()));
            console.log('\n🧭 DETECTED COLUMNS:');
            console.log(`• ID column: ${detectedId || 'not found'}`);
            console.log(`• Name column: ${detectedName || 'not found'}`);

            if (detectedId && detectedName) {
                const [distincts] = await connection.execute(`SELECT COUNT(DISTINCT ${detectedName}) as uniqNames FROM productcategory`);
                console.log(`• Distinct ${detectedName}: ${distincts[0].uniqNames}`);
            }
        } else {
            console.log('(Table is empty)');
        }

        // Foreign keys
        const [fk] = await connection.execute(`
            SELECT CONSTRAINT_NAME, COLUMN_NAME, REFERENCED_TABLE_NAME, REFERENCED_COLUMN_NAME
            FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE 
            WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'productcategory' AND REFERENCED_TABLE_NAME IS NOT NULL
        `);
        console.log('\n🔗 FOREIGN KEYS:');
        if (fk.length) {
            fk.forEach(f => console.log(`• ${f.COLUMN_NAME} → ${f.REFERENCED_TABLE_NAME}.${f.REFERENCED_COLUMN_NAME}`));
        } else {
            console.log('• None');
        }

        console.log('\n✅ Analysis complete.');
    } catch (err) {
        console.error('❌ Error analyzing productcategory:', err.message);
        console.error(err);
    } finally {
        if (connection) {
            await connection.end();
            console.log('\n🔒 Database connection closed');
        }
    }
}

analyzeProductCategoryTable();
