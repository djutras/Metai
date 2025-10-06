import { neon } from '@neondatabase/serverless';

const DATABASE_URL = 'postgresql://neondb_owner:npg_IZm4bMTkdxR5@ep-icy-pond-aevzfm4q-pooler.c-2.us-east-2.aws.neon.tech/neondb?sslmode=require';

async function linkTrumpArticles() {
  const sql = neon(DATABASE_URL);

  try {
    // Get Trump topic ID
    const [topic] = await sql`
      SELECT id FROM topics WHERE slug = 'Trump'
    `;
    console.log(`Trump topic ID: ${topic.id}`);

    // Find all articles mentioning Trump that aren't linked
    const unlinkedArticles = await sql`
      SELECT a.id, a.title, a.published_at, s.domain
      FROM articles a
      LEFT JOIN sources s ON a.source_id = s.id
      WHERE (a.title ILIKE '%trump%' OR a.summary ILIKE '%trump%')
        AND a.id NOT IN (
          SELECT article_id FROM topic_articles WHERE topic_id = ${topic.id}
        )
      ORDER BY a.published_at DESC
    `;

    console.log(`\nFound ${unlinkedArticles.length} unlinked Trump articles`);

    if (unlinkedArticles.length === 0) {
      console.log('No articles to link!');
      return;
    }

    console.log('\nLinking articles to Trump topic...');

    // Insert in batches
    let linked = 0;
    for (const article of unlinkedArticles) {
      try {
        await sql`
          INSERT INTO topic_articles (topic_id, article_id, hidden_bool, added_at)
          VALUES (${topic.id}, ${article.id}, false, NOW())
          ON CONFLICT DO NOTHING
        `;
        linked++;
        if (linked % 10 === 0) {
          console.log(`Linked ${linked}/${unlinkedArticles.length} articles...`);
        }
      } catch (error) {
        console.error(`Error linking article ${article.id}:`, error);
      }
    }

    console.log(`\n✅ Successfully linked ${linked} articles to Trump topic!`);

    // Verify total count
    const totalCount = await sql`
      SELECT COUNT(*) as count
      FROM topic_articles
      WHERE topic_id = ${topic.id} AND hidden_bool = false
    `;
    console.log(`\nTotal visible Trump articles in database: ${totalCount[0].count}`);

    // Show sample of linked articles
    console.log('\nSample of newly linked articles:');
    const sampleArticles = unlinkedArticles.slice(0, 10);
    sampleArticles.forEach((art, i) => {
      console.log(`${i + 1}. ${art.title.substring(0, 70)}... (${art.domain})`);
    });

  } catch (error) {
    console.error('Error:', error);
  }
}

linkTrumpArticles();
