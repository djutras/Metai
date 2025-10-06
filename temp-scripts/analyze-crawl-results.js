require('dotenv').config();
const { db } = require('./src/lib/db');
const { articles, sources, topicArticles, topics, sourcesTopics } = require('./db/schema');
const { eq, sql } = require('drizzle-orm');

(async () => {
  try {
    console.log('\n=== Trump Topic Crawl Analysis ===\n');

    // Get Trump topic
    const [topic] = await db
      .select()
      .from(topics)
      .where(eq(topics.slug, 'Trump'))
      .limit(1);

    if (!topic) {
      console.log('Trump topic not found');
      process.exit(1);
    }

    // Count total articles for Trump
    const totalArticles = await db
      .select({ count: sql`count(*)` })
      .from(topicArticles)
      .where(eq(topicArticles.topicId, topic.id));

    console.log(`Total Trump articles: ${totalArticles[0].count}`);

    // Get all sources linked to Trump topic
    const trumpSources = await db
      .select({
        sourceId: sourcesTopics.sourceId,
        sourceName: sources.name,
        sourceDomain: sources.domain,
      })
      .from(sourcesTopics)
      .innerJoin(sources, eq(sourcesTopics.sourceId, sources.id))
      .where(eq(sourcesTopics.topicId, topic.id));

    console.log(`\nTotal sources for Trump topic: ${trumpSources.length}\n`);

    // For each source, count articles
    console.log('Articles per source:');
    console.log('='.repeat(60));

    const sourcesWithArticles = [];
    const sourcesWithoutArticles = [];

    for (const source of trumpSources) {
      const articleCount = await db
        .select({ count: sql`count(*)` })
        .from(articles)
        .innerJoin(topicArticles, eq(articles.id, topicArticles.articleId))
        .where(
          sql`${articles.sourceId} = ${source.sourceId} AND ${topicArticles.topicId} = ${topic.id}`
        );

      const count = parseInt(articleCount[0].count);

      if (count > 0) {
        sourcesWithArticles.push({ ...source, count });
        console.log(`✓ ${source.sourceName.padEnd(30)} ${count} articles`);
      } else {
        sourcesWithoutArticles.push(source);
      }
    }

    if (sourcesWithoutArticles.length > 0) {
      console.log('\nSources with NO articles:');
      console.log('='.repeat(60));
      for (const source of sourcesWithoutArticles) {
        console.log(`✗ ${source.sourceName} (${source.sourceDomain})`);
      }
    }

    console.log('\n=== Summary ===');
    console.log(`Sources with articles: ${sourcesWithArticles.length}/${trumpSources.length}`);
    console.log(`Sources without articles: ${sourcesWithoutArticles.length}/${trumpSources.length}`);
    console.log(`Coverage: ${Math.round((sourcesWithArticles.length / trumpSources.length) * 100)}%`);

    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
})();
