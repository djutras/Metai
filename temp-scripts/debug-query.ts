import { neon } from '@neondatabase/serverless';

const DATABASE_URL = 'postgresql://neondb_owner:npg_IZm4bMTkdxR5@ep-icy-pond-aevzfm4q-pooler.c-2.us-east-2.aws.neon.tech/neondb?sslmode=require';

async function debugQuery() {
  const sql = neon(DATABASE_URL);

  try {
    const [topic] = await sql`SELECT id FROM topics WHERE slug = 'Trump'`;

    console.log('=== Simulating the Page Query ===\n');

    // This is the EXACT query from page.tsx
    const articles = await sql`
      SELECT
        a.id, a.canonical_url, a.title, a.summary, a.image_url,
        a.published_at, a.first_seen_at, a.paywalled_bool, a.lang,
        s.name as source_name, s.domain as source_domain,
        ta.added_at, ta.hidden_bool
      FROM topic_articles ta
      INNER JOIN articles a ON ta.article_id = a.id
      LEFT JOIN sources s ON a.source_id = s.id
      WHERE ta.topic_id = ${topic.id}
        AND ta.hidden_bool = false
      ORDER BY ta.added_at DESC
      LIMIT 100
    `;

    console.log(`Query returned ${articles.length} articles\n`);

    // Check the added_at timestamps
    console.log('Added_at timestamps for first 20 articles:');
    articles.slice(0, 20).forEach((art, i) => {
      console.log(`${i + 1}. ${art.added_at} - ${art.title.substring(0, 50)}...`);
    });

    // Check if there are articles with NULL added_at
    const nullAddedAt = await sql`
      SELECT COUNT(*) as count
      FROM topic_articles ta
      WHERE ta.topic_id = ${topic.id} AND ta.added_at IS NULL
    `;
    console.log(`\nArticles with NULL added_at: ${nullAddedAt[0].count}`);

    // Check articles grouped by added_at date
    const byDate = await sql`
      SELECT DATE(ta.added_at) as date, COUNT(*) as count
      FROM topic_articles ta
      WHERE ta.topic_id = ${topic.id} AND ta.hidden_bool = false
      GROUP BY DATE(ta.added_at)
      ORDER BY date DESC
    `;
    console.log('\nArticles by added_at date:');
    byDate.forEach(row => {
      console.log(`${row.date}: ${row.count} articles`);
    });

  } catch (error) {
    console.error('Error:', error);
  }
}

debugQuery();
