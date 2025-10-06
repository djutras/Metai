import { neon } from '@neondatabase/serverless';

const DATABASE_URL = 'postgresql://neondb_owner:npg_IZm4bMTkdxR5@ep-icy-pond-aevzfm4q-pooler.c-2.us-east-2.aws.neon.tech/neondb?sslmode=require';

async function verifyMaxItems() {
  const sql = neon(DATABASE_URL);

  try {
    const [topic] = await sql`
      SELECT id, slug, name, max_items
      FROM topics
      WHERE slug = 'Trump'
    `;

    console.log('Current Trump topic in database:');
    console.log(JSON.stringify(topic, null, 2));

  } catch (error) {
    console.error('Error:', error);
  }
}

verifyMaxItems();
