require('dotenv').config();
const { db } = require('./src/lib/db');
const { sourcesTopics, sources, topics } = require('./db/schema');
const { eq } = require('drizzle-orm');

(async () => {
  try {
    const trumpSources = await db
      .select({
        sourceId: sourcesTopics.sourceId,
        topicId: sourcesTopics.topicId,
        sourceName: sources.name,
        sourceDomain: sources.domain,
        topicName: topics.name,
      })
      .from(sourcesTopics)
      .innerJoin(sources, eq(sourcesTopics.sourceId, sources.id))
      .innerJoin(topics, eq(sourcesTopics.topicId, topics.id))
      .where(eq(topics.slug, 'Trump'));

    console.log(`\nFound ${trumpSources.length} sources linked to Trump topic:`);
    console.log('='.repeat(60));
    for (const source of trumpSources) {
      console.log(`${source.sourceName} (${source.sourceDomain})`);
    }

    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
})();
