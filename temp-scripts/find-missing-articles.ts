import { neon } from '@neondatabase/serverless';

const DATABASE_URL = 'postgresql://neondb_owner:npg_IZm4bMTkdxR5@ep-icy-pond-aevzfm4q-pooler.c-2.us-east-2.aws.neon.tech/neondb?sslmode=require';

async function findMissingArticles() {
  const sql = neon(DATABASE_URL);

  try {
    const [topic] = await sql`
      SELECT id FROM topics WHERE slug = 'Trump'
    `;

    console.log('=== All Trump Articles by Status ===');

    // Total in topic_articles
    const total = await sql`
      SELECT COUNT(*) as count FROM topic_articles WHERE topic_id = ${topic.id}
    `;
    console.log(`Total in topic_articles: ${total[0].count}`);

    // Visible
    const visible = await sql`
      SELECT COUNT(*) as count FROM topic_articles
      WHERE topic_id = ${topic.id} AND hidden_bool = false
    `;
    console.log(`Visible (hidden_bool = false): ${visible[0].count}`);

    // Hidden
    const hidden = await sql`
      SELECT COUNT(*) as count FROM topic_articles
      WHERE topic_id = ${topic.id} AND hidden_bool = true
    `;
    console.log(`Hidden (hidden_bool = true): ${hidden[0].count}`);

    // Check time filters
    console.log('\n=== Articles by Time Range ===');
    const now = new Date();
    const ranges = [
      { name: '24h', hours: 24 },
      { name: '48h', hours: 48 },
      { name: '7d', hours: 168 }
    ];

    for (const range of ranges) {
      const cutoff = new Date(now.getTime() - range.hours * 60 * 60 * 1000);
      const count = await sql`
        SELECT COUNT(*) as count
        FROM topic_articles ta
        JOIN articles a ON ta.article_id = a.id
        WHERE ta.topic_id = ${topic.id}
          AND ta.hidden_bool = false
          AND a.published_at >= ${cutoff.toISOString()}
      `;
      console.log(`${range.name}: ${count[0].count} articles`);
    }

    // Check recent articles
    console.log('\n=== Sample of Recent Trump Articles ===');
    const recentSample = await sql`
      SELECT a.id, a.title, a.published_at, a.first_seen_at, ta.hidden_bool, s.domain
      FROM topic_articles ta
      JOIN articles a ON ta.article_id = a.id
      LEFT JOIN sources s ON a.source_id = s.id
      WHERE ta.topic_id = ${topic.id}
      ORDER BY ta.added_at DESC
      LIMIT 25
    `;
    console.log(`Showing ${recentSample.length} most recent articles:`);
    recentSample.forEach((art, i) => {
      const status = art.hidden_bool ? '[HIDDEN]' : '[VISIBLE]';
      console.log(`${i + 1}. ${status} ${art.title.substring(0, 60)}... (${art.domain}) - Published: ${art.published_at}`);
    });

    // Check if there are Trump articles in the articles table that haven't been linked
    console.log('\n=== Checking for Unlinked Trump Articles in Last Crawl ===');
    const lastCrawlTime = new Date(Date.now() - 3 * 60 * 60 * 1000); // last 3 hours
    const unlinked = await sql`
      SELECT COUNT(*) as count
      FROM articles a
      WHERE a.first_seen_at >= ${lastCrawlTime.toISOString()}
        AND (a.title ILIKE '%trump%' OR a.summary ILIKE '%trump%')
        AND a.id NOT IN (
          SELECT article_id FROM topic_articles WHERE topic_id = ${topic.id}
        )
    `;
    console.log(`Articles from last 3 hours mentioning Trump but not linked to topic: ${unlinked[0].count}`);

    if (unlinked[0].count > 0) {
      const unlinkedSample = await sql`
        SELECT a.id, a.title, a.published_at, s.domain
        FROM articles a
        LEFT JOIN sources s ON a.source_id = s.id
        WHERE a.first_seen_at >= ${lastCrawlTime.toISOString()}
          AND (a.title ILIKE '%trump%' OR a.summary ILIKE '%trump%')
          AND a.id NOT IN (
            SELECT article_id FROM topic_articles WHERE topic_id = ${topic.id}
          )
        LIMIT 10
      `;
      console.log('\nSample of unlinked articles:');
      unlinkedSample.forEach((art, i) => {
        console.log(`${i + 1}. ${art.title.substring(0, 70)}... (${art.domain})`);
      });
    }

  } catch (error) {
    console.error('Error:', error);
  }
}

findMissingArticles();
