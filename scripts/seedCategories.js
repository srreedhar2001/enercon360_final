/**
 * Seed productcategory table from distinct legacy product.category values.
 *
 * - Connects using the same DB config as the app
 * - If productcategory already has rows, it does nothing
 * - Otherwise, inserts DISTINCT non-empty product.category values as category_name
 */

require('dotenv').config();
const { pool } = require('../src/config/database');

async function main() {
  console.log('🔧 Seeding productcategory from product.category...');
  try {
    // Ensure table exists
    await pool.execute(
      "CREATE TABLE IF NOT EXISTS productcategory (\n        id INT AUTO_INCREMENT PRIMARY KEY,\n        category_name VARCHAR(255) NOT NULL,\n        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP\n      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;"
    );

    const [countRows] = await pool.execute('SELECT COUNT(*) AS cnt FROM productcategory');
    const existing = Number(countRows[0]?.cnt || 0);
    console.log(`📊 Existing categories in productcategory: ${existing}`);
    if (existing > 0) {
      console.log('✅ Table already populated. No action needed.');
      return;
    }

    const [legacyRows] = await pool.execute(
      `SELECT DISTINCT TRIM(category) AS category\n       FROM product\n       WHERE category IS NOT NULL AND TRIM(category) <> ''\n       ORDER BY category`
    );

    const categories = legacyRows
      .map(r => r.category)
      .filter(Boolean);

    if (categories.length === 0) {
      console.log('ℹ️ No legacy categories found in product table. Nothing to seed.');
      return;
    }

    console.log(`📝 Seeding ${categories.length} categories...`);
    const insertSql = 'INSERT INTO productcategory (category_name, created_at) VALUES (?, NOW())';
    let inserted = 0;
    for (const name of categories) {
      await pool.execute(insertSql, [name]);
      inserted++;
    }

    console.log(`✅ Done. Inserted ${inserted} categories into productcategory.`);
  } catch (err) {
    console.error('❌ Seed failed:', err.message || err);
    process.exitCode = 1;
  } finally {
    try { await pool.end(); } catch {}
  }
}

main();
