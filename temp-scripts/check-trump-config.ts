import { neon } from '@neondatabase/serverless';

const DATABASE_URL = 'postgresql://neondb_owner:npg_IZm4bMTkdxR5@ep-icy-pond-aevzfm4q-pooler.c-2.us-east-2.aws.neon.tech/neondb?sslmode=require';

async function checkTrumpConfig() {
  const sql = neon(DATABASE_URL);

  try {
    const [topic] = await sql`
      SELECT id, slug, name, query, includes, excludes, lang, freshness_hours, max_items, enabled
      FROM topics
      WHERE slug = 'Trump'
    `;

    console.log('=== Trump Topic Configuration ===\n');
    console.log('ID:', topic.id);
    console.log('Slug:', topic.slug);
    console.log('Name:', topic.name);
    console.log('Query:', topic.query);
    console.log('Includes:', topic.includes);
    console.log('Excludes:', topic.excludes);
    console.log('Languages:', topic.lang);
    console.log('Freshness Hours:', topic.freshness_hours);
    console.log('Max Items:', topic.max_items);
    console.log('Enabled:', topic.enabled);

    // Check if there are strict include filters that might be filtering out articles
    if (topic.includes && topic.includes.length > 0) {
      console.log('\n⚠️  INCLUDES filter is active! Articles must match at least one include keyword.');
      console.log('This might be filtering out valid Trump articles.');
    }

    if (topic.excludes && topic.excludes.length > 0) {
      console.log('\n⚠️  EXCLUDES filter is active! Articles matching exclude keywords will be rejected.');
    }

  } catch (error) {
    console.error('Error:', error);
  }
}

checkTrumpConfig();
