const { neon } = require('@neondatabase/serverless');

const DATABASE_URL = 'postgresql://neondb_owner:npg_IZm4bMTkdxR5@ep-icy-pond-aevzfm4q-pooler.c-2.us-east-2.aws.neon.tech/neondb?sslmode=require';

const sources = [
  { name: 'Wired', domain: 'wired.com' },
  { name: 'TechCrunch', domain: 'techcrunch.com' },
  { name: 'Ars Technica', domain: 'arstechnica.com' },
  { name: 'The Verge', domain: 'theverge.com' },
  { name: 'The Guardian', domain: 'theguardian.com' },
  { name: 'CNN', domain: 'cnn.com' },
  { name: 'NPR', domain: 'npr.org' },
  { name: 'Al Jazeera', domain: 'aljazeera.com' },
  { name: 'The New York Times', domain: 'nytimes.com' },
  { name: 'The Washington Post', domain: 'washingtonpost.com' },
  { name: 'Bloomberg', domain: 'bloomberg.com' },
  { name: 'Financial Times', domain: 'ft.com' },
  { name: 'The Economist', domain: 'economist.com' },
  { name: 'Politico', domain: 'politico.com' },
  { name: 'The Hill', domain: 'thehill.com' },
  { name: 'Axios', domain: 'axios.com' },
  { name: 'ProPublica', domain: 'propublica.org' },
  { name: 'The Atlantic', domain: 'theatlantic.com' },
  { name: 'Vox', domain: 'vox.com' },
  { name: 'Vice News', domain: 'vice.com' },
  { name: 'AP News', domain: 'apnews.com' },
  { name: 'BBC', domain: 'bbc.com' },
  { name: 'Reuters', domain: 'reuters.com' },
];

(async () => {
  const sql = neon(DATABASE_URL);

  console.log('Adding sources for Trump (topic_id: 2)...\n');

  let added = 0;
  let skipped = 0;

  for (const source of sources) {
    try {
      // Check if already exists
      const existing = await sql`
        SELECT id FROM sources WHERE domain = ${source.domain}
      `;

      if (existing.length > 0) {
        console.log(`⊘ Skipped ${source.name} (${source.domain}) - already exists`);
        skipped++;
        continue;
      }

      // Insert new source
      await sql`
        INSERT INTO sources (name, domain, type, points, topic_id, enabled)
        VALUES (${source.name}, ${source.domain}, 'custom_crawler', 0, 2, true)
      `;

      console.log(`✓ Added ${source.name} (${source.domain})`);
      added++;
    } catch (error) {
      console.error(`✗ Failed to add ${source.name}: ${error.message}`);
    }
  }

  console.log(`\n=== Summary ===`);
  console.log(`Added: ${added}`);
  console.log(`Skipped: ${skipped}`);
  console.log(`Total: ${sources.length}`);
})();
