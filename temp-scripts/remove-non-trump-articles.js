require('dotenv').config();
const { neon } = require('@neondatabase/serverless');
const { drizzle } = require('drizzle-orm/neon-http');
const { sql } = require('drizzle-orm');

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  throw new Error('DATABASE_URL environment variable is required');
}

const neonSql = neon(DATABASE_URL);
const db = drizzle(neonSql);

async function removeNonTrumpArticles() {
  console.log('Finding articles without "Trump" in title or summary...');

  // Delete articles that don't contain "Trump" (case insensitive) in either title or summary
  const result = await db.execute(sql`
    DELETE FROM articles
    WHERE
      title NOT ILIKE '%Trump%'
      AND (summary IS NULL OR summary NOT ILIKE '%Trump%')
    RETURNING id, title
  `);

  console.log(`Removed ${result.rowCount} articles that don't mention Trump`);

  if (result.rows && result.rows.length > 0) {
    console.log('\nSample of removed articles:');
    result.rows.slice(0, 10).forEach(row => {
      console.log(`- ID ${row.id}: ${row.title}`);
    });

    if (result.rows.length > 10) {
      console.log(`... and ${result.rows.length - 10} more`);
    }
  }
}

removeNonTrumpArticles()
  .then(() => {
    console.log('\nDone!');
    process.exit(0);
  })
  .catch(err => {
    console.error('Error:', err);
    process.exit(1);
  });
