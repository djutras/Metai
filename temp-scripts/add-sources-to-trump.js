const { neon } = require('@neondatabase/serverless');

const DATABASE_URL = 'postgresql://neondb_owner:npg_IZm4bMTkdxR5@ep-icy-pond-aevzfm4q-pooler.c-2.us-east-2.aws.neon.tech/neondb?sslmode=require';

const sourceDomains = [
  'wired.com',
  'techcrunch.com',
  'arstechnica.com',
  'theverge.com',
  'theguardian.com',
  'cnn.com',
  'npr.org',
  'aljazeera.com',
  'nytimes.com',
  'washingtonpost.com',
  'bloomberg.com',
  'ft.com',
  'economist.com',
  'politico.com',
  'thehill.com',
  'axios.com',
  'propublica.org',
  'theatlantic.com',
  'vox.com',
  'vice.com',
  'apnews.com',
  'bbc.com',
  'reuters.com',
];

(async () => {
  const sql = neon(DATABASE_URL);

  console.log('Adding sources to Trump topic (topic_id: 2)...\n');

  let added = 0;
  let alreadyLinked = 0;
  let notFound = 0;

  for (const domain of sourceDomains) {
    try {
      // Get source ID
      const source = await sql`
        SELECT id, name FROM sources WHERE domain = ${domain}
      `;

      if (source.length === 0) {
        console.log(`⊘ Source not found: ${domain}`);
        notFound++;
        continue;
      }

      const sourceId = source[0].id;
      const sourceName = source[0].name;

      // Check if already linked to topic 2
      const existing = await sql`
        SELECT id FROM sources_topics
        WHERE source_id = ${sourceId} AND topic_id = 2
      `;

      if (existing.length > 0) {
        console.log(`⊘ Already linked: ${sourceName} (${domain})`);
        alreadyLinked++;
        continue;
      }

      // Add to sources_topics junction table
      await sql`
        INSERT INTO sources_topics (source_id, topic_id)
        VALUES (${sourceId}, 2)
      `;

      console.log(`✓ Added: ${sourceName} (${domain})`);
      added++;
    } catch (error) {
      console.error(`✗ Failed to add ${domain}: ${error.message}`);
    }
  }

  console.log(`\n=== Summary ===`);
  console.log(`Added to Trump topic: ${added}`);
  console.log(`Already linked: ${alreadyLinked}`);
  console.log(`Not found: ${notFound}`);
  console.log(`Total processed: ${sourceDomains.length}`);

  // Show sources that are now in multiple topics
  console.log(`\n=== Sources in multiple topics ===`);
  const multiTopic = await sql`
    SELECT s.name, s.domain, COUNT(st.topic_id) as topic_count
    FROM sources s
    JOIN sources_topics st ON s.id = st.source_id
    GROUP BY s.id, s.name, s.domain
    HAVING COUNT(st.topic_id) > 1
    ORDER BY s.name
  `;

  if (multiTopic.length > 0) {
    multiTopic.forEach(row => {
      console.log(`  ${row.name} (${row.domain}) - in ${row.topic_count} topics`);
    });
  } else {
    console.log('  (none)');
  }
})();
