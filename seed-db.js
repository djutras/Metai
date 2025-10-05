const { Pool } = require('pg');

const pool = new Pool({
  connectionString: 'postgresql://neondb_owner:npg_IZm4bMTkdxR5@ep-icy-pond-aevzfm4q-pooler.c-2.us-east-2.aws.neon.tech/neondb?sslmode=require'
});

async function seedDatabase() {
  try {
    // Insert sources
    await pool.query(`
      INSERT INTO sources (name, domain, type, points, enabled) VALUES
        ('Reuters', 'reuters.com', 'custom_crawler', 0, true),
        ('AP News', 'apnews.com', 'custom_crawler', 0, true),
        ('BBC', 'bbc.com', 'custom_crawler', 0, true)
    `);
    console.log('✓ Sources inserted');

    // Insert topic
    await pool.query(`
      INSERT INTO topics (slug, name, query, includes, excludes, lang, freshness_hours, max_items, enabled) VALUES
        ('world-news', 'World News', 'world international global', '{}', '{}', '{"en"}', 72, 30, true)
    `);
    console.log('✓ Topic inserted');

    console.log('\nSample data inserted successfully!');
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await pool.end();
  }
}

seedDatabase();
