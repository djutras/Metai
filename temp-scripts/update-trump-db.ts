import { neon } from '@neondatabase/serverless';

const DATABASE_URL = 'postgresql://neondb_owner:npg_IZm4bMTkdxR5@ep-icy-pond-aevzfm4q-pooler.c-2.us-east-2.aws.neon.tech/neondb?sslmode=require';

async function updateTrumpMaxItems() {
  const sql = neon(DATABASE_URL);

  try {
    // First, check current value
    console.log('Checking current Trump topic settings...');
    const currentTopic = await sql`
      SELECT id, slug, name, max_items as "maxItems"
      FROM topics
      WHERE slug = 'Trump'
    `;
    console.log('Current Trump topic:', currentTopic);

    if (currentTopic.length === 0) {
      console.log('Trump topic not found!');
      return;
    }

    // Count total articles
    const articleCount = await sql`
      SELECT COUNT(*) as count
      FROM topic_articles
      WHERE topic_id = ${currentTopic[0].id} AND hidden_bool = false
    `;
    console.log('Total Trump articles in database:', articleCount[0].count);

    // Update maxItems to 100
    console.log('\nUpdating maxItems to 100...');
    await sql`
      UPDATE topics
      SET max_items = 100
      WHERE slug = 'Trump'
    `;

    // Verify update
    const updatedTopic = await sql`
      SELECT id, slug, name, max_items as "maxItems"
      FROM topics
      WHERE slug = 'Trump'
    `;
    console.log('Updated Trump topic:', updatedTopic);
    console.log('\nSuccess! maxItems updated to 100');

  } catch (error) {
    console.error('Error:', error);
  }
}

updateTrumpMaxItems();
