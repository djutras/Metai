import { neon } from '@neondatabase/serverless';

const DATABASE_URL = 'postgresql://neondb_owner:npg_IZm4bMTkdxR5@ep-icy-pond-aevzfm4q-pooler.c-2.us-east-2.aws.neon.tech/neondb?sslmode=require';

async function investigateTrumpArticles() {
  const sql = neon(DATABASE_URL);

  try {
    // Get Trump topic ID
    const [topic] = await sql`
      SELECT id, slug, name
      FROM topics
      WHERE slug = 'Trump'
    `;
    console.log('Trump topic:', topic);

    // Check total articles about Trump in the articles table
    console.log('\n=== Articles Table Analysis ===');
    const totalArticles = await sql`
      SELECT COUNT(*) as count
      FROM articles
      WHERE title ILIKE '%trump%' OR summary ILIKE '%trump%'
    `;
    console.log('Total articles mentioning Trump in articles table:', totalArticles[0].count);

    // Check topic_articles table
    console.log('\n=== Topic Articles Table ===');
    const topicArticles = await sql`
      SELECT COUNT(*) as count
      FROM topic_articles
      WHERE topic_id = ${topic.id}
    `;
    console.log('Total articles linked to Trump topic:', topicArticles[0].count);

    const hiddenCount = await sql`
      SELECT COUNT(*) as count
      FROM topic_articles
      WHERE topic_id = ${topic.id} AND hidden_bool = true
    `;
    console.log('Hidden Trump articles:', hiddenCount[0].count);

    const visibleCount = await sql`
      SELECT COUNT(*) as count
      FROM topic_articles
      WHERE topic_id = ${topic.id} AND hidden_bool = false
    `;
    console.log('Visible Trump articles:', visibleCount[0].count);

    // Check sources linked to Trump topic
    console.log('\n=== Sources for Trump Topic ===');
    const sources = await sql`
      SELECT s.id, s.name, s.domain, s.type, COUNT(a.id) as article_count
      FROM sources s
      LEFT JOIN source_topics st ON s.id = st.source_id
      LEFT JOIN articles a ON s.id = a.source_id
      WHERE st.topic_id = ${topic.id}
      GROUP BY s.id, s.name, s.domain, s.type
      ORDER BY article_count DESC
    `;
    console.log('Sources configured for Trump:', sources);

    // Check if there are articles about Trump that aren't linked
    console.log('\n=== Unlinked Trump Articles ===');
    const unlinkedArticles = await sql`
      SELECT COUNT(*) as count
      FROM articles a
      WHERE (a.title ILIKE '%trump%' OR a.summary ILIKE '%trump%')
        AND a.id NOT IN (
          SELECT article_id FROM topic_articles WHERE topic_id = ${topic.id}
        )
    `;
    console.log('Articles mentioning Trump but not linked to topic:', unlinkedArticles[0].count);

    // Sample some recent articles
    console.log('\n=== Recent Trump Articles in DB ===');
    const recentArticles = await sql`
      SELECT a.title, a.published_at, s.domain
      FROM topic_articles ta
      JOIN articles a ON ta.article_id = a.id
      LEFT JOIN sources s ON a.source_id = s.id
      WHERE ta.topic_id = ${topic.id}
      ORDER BY ta.added_at DESC
      LIMIT 5
    `;
    console.log('Recent articles:', recentArticles);

  } catch (error) {
    console.error('Error:', error);
  }
}

investigateTrumpArticles();
