const { Pool } = require('pg');
const fs = require('fs');

const pool = new Pool({
  connectionString: 'postgresql://neondb_owner:npg_IZm4bMTkdxR5@ep-icy-pond-aevzfm4q-pooler.c-2.us-east-2.aws.neon.tech/neondb?sslmode=require'
});

async function runMigration() {
  try {
    const sql = fs.readFileSync('./migrations/add_crawl_runs_table.sql', 'utf8');
    await pool.query(sql);
    console.log('✓ Migration completed: crawl_runs table created');
  } catch (error) {
    console.error('Migration failed:', error.message);
  } finally {
    await pool.end();
  }
}

runMigration();
