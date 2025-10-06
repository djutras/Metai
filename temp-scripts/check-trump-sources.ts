import { neon } from '@neondatabase/serverless';

const DATABASE_URL = 'postgresql://neondb_owner:npg_IZm4bMTkdxR5@ep-icy-pond-aevzfm4q-pooler.c-2.us-east-2.aws.neon.tech/neondb?sslmode=require';

async function checkTrumpSources() {
  const sql = neon(DATABASE_URL);

  try {
    // Get Trump topic
    const [topic] = await sql`
      SELECT id, slug, name
      FROM topics
      WHERE slug = 'Trump'
    `;
    console.log('Trump topic:', topic);

    // Check sources configured for Trump topic
    console.log('\n=== Sources for Trump Topic ===');
    const sources = await sql`
      SELECT s.id, s.name, s.domain, s.type, s.enabled
      FROM sources s
      JOIN sources_topics st ON s.id = st.source_id
      WHERE st.topic_id = ${topic.id}
      ORDER BY s.name
    `;
    console.log(`Found ${sources.length} sources configured for Trump:`);
    sources.forEach(s => console.log(`  - ${s.name} (${s.domain}) [${s.type}] ${s.enabled ? '✓' : '✗'}`));

    // Check how many articles each source has contributed
    console.log('\n=== Articles per Source (for Trump topic) ===');
    const articlesBySource = await sql`
      SELECT s.name, s.domain, COUNT(ta.id) as article_count
      FROM sources s
      JOIN sources_topics st ON s.id = st.source_id
      LEFT JOIN articles a ON s.id = a.source_id
      LEFT JOIN topic_articles ta ON (a.id = ta.article_id AND ta.topic_id = ${topic.id})
      WHERE st.topic_id = ${topic.id}
      GROUP BY s.id, s.name, s.domain
      ORDER BY article_count DESC
    `;
    console.log('Articles contributed by each source:');
    articlesBySource.forEach(s => console.log(`  - ${s.name}: ${s.article_count} articles`));

    // Check last crawl for Trump
    console.log('\n=== Last Crawl for Trump ===');
    const lastCrawl = await sql`
      SELECT id, started_at, finished_at, ok_bool, stats_json
      FROM crawls
      WHERE topic_id = ${topic.id}
      ORDER BY started_at DESC
      LIMIT 1
    `;
    if (lastCrawl.length > 0) {
      console.log('Last crawl:', lastCrawl[0]);
    } else {
      console.log('No crawls found for Trump topic');
    }

    // Check for articles about Trump from sources NOT linked to topic
    console.log('\n=== Trump Articles from Unlinked Sources ===');
    const unlinkedSourceArticles = await sql`
      SELECT s.name, s.domain, COUNT(a.id) as article_count
      FROM articles a
      LEFT JOIN sources s ON a.source_id = s.id
      WHERE (a.title ILIKE '%trump%' OR a.summary ILIKE '%trump%')
        AND a.source_id NOT IN (
          SELECT source_id FROM sources_topics WHERE topic_id = ${topic.id}
        )
      GROUP BY s.id, s.name, s.domain
      ORDER BY article_count DESC
      LIMIT 10
    `;
    console.log('Articles about Trump from sources NOT configured for Trump topic:');
    unlinkedSourceArticles.forEach(s => console.log(`  - ${s.name || 'Unknown'}: ${s.article_count} articles`));

  } catch (error) {
    console.error('Error:', error);
  }
}

checkTrumpSources();
