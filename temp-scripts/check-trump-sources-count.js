const { neon } = require('@neondatabase/serverless');
require('dotenv').config();

const sql = neon(process.env.DATABASE_URL);

async function checkTrumpSources() {
  try {
    // Get Trump topic ID
    const [topic] = await sql`
      SELECT id, name FROM topics WHERE slug = 'Trump'
    `;

    console.log(`\nTopic: ${topic.name} (ID: ${topic.id})\n`);

    // Get all sources configured for Trump topic
    const sources = await sql`
      SELECT s.id, s.name, s.domain
      FROM sources_topics st
      JOIN sources s ON st.source_id = s.id
      WHERE st.topic_id = ${topic.id}
      ORDER BY s.name
    `;

    console.log(`Total sources configured for Trump: ${sources.length}\n`);

    sources.forEach((source, idx) => {
      console.log(`${idx + 1}. ${source.name} (${source.domain})`);
    });

    // Check how many articles each source has for crawl #20
    console.log(`\n\nArticles found in crawl #20 by source:\n`);

    const crawlResults = await sql`
      SELECT
        s.id,
        s.name,
        COUNT(a.id) as article_count
      FROM sources_topics st
      JOIN sources s ON st.source_id = s.id
      LEFT JOIN articles a ON a.source_id = s.id
      LEFT JOIN topic_articles ta ON ta.article_id = a.id
        AND ta.topic_id = ${topic.id}
        AND ta.added_at >= '2025-10-05 11:34:00'
        AND ta.added_at <= '2025-10-05 11:44:00'
      WHERE st.topic_id = ${topic.id}
      GROUP BY s.id, s.name
      ORDER BY s.name
    `;

    crawlResults.forEach((result) => {
      console.log(`${result.name}: ${result.article_count} articles`);
    });

  } catch (error) {
    console.error('Error:', error);
  }
}

checkTrumpSources();
