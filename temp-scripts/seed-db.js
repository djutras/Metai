const { Pool } = require('pg');

const pool = new Pool({
  connectionString: 'postgresql://neondb_owner:npg_IZm4bMTkdxR5@ep-icy-pond-aevzfm4q-pooler.c-2.us-east-2.aws.neon.tech/neondb?sslmode=require'
});

async function seedDatabase() {
  try {
    // Insert sources (skipping first 3 already in DB)
    await pool.query(`
      INSERT INTO sources (name, domain, type, points, enabled) VALUES
        ('The Guardian', 'theguardian.com', 'custom_crawler', 0, true),
        ('CNN', 'cnn.com', 'custom_crawler', 0, true),
        ('NPR', 'npr.org', 'custom_crawler', 0, true),
        ('Al Jazeera', 'aljazeera.com', 'custom_crawler', 0, true),
        ('The New York Times', 'nytimes.com', 'custom_crawler', 0, true),
        ('The Washington Post', 'washingtonpost.com', 'custom_crawler', 0, true),
        ('Bloomberg', 'bloomberg.com', 'custom_crawler', 0, true),
        ('Financial Times', 'ft.com', 'custom_crawler', 0, true),
        ('The Economist', 'economist.com', 'custom_crawler', 0, true),
        ('Politico', 'politico.com', 'custom_crawler', 0, true),
        ('The Hill', 'thehill.com', 'custom_crawler', 0, true),
        ('Axios', 'axios.com', 'custom_crawler', 0, true),
        ('ProPublica', 'propublica.org', 'custom_crawler', 0, true),
        ('The Atlantic', 'theatlantic.com', 'custom_crawler', 0, true),
        ('Vox', 'vox.com', 'custom_crawler', 0, true),
        ('Vice News', 'vice.com', 'custom_crawler', 0, true),
        ('TechCrunch', 'techcrunch.com', 'custom_crawler', 0, true),
        ('Ars Technica', 'arstechnica.com', 'custom_crawler', 0, true),
        ('The Verge', 'theverge.com', 'custom_crawler', 0, true),
        ('Wired', 'wired.com', 'custom_crawler', 0, true)
    `);
    console.log('✓ 20 additional sources inserted');

    // Skip topic (already exists)
    console.log('✓ Skipped topic (already exists)');

    console.log('\nSample data inserted successfully!');
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await pool.end();
  }
}

seedDatabase();
