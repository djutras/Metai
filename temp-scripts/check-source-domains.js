require('dotenv').config();
const { db } = require('./src/lib/db');
const { sources, sourcesTopics, topics } = require('./db/schema');
const { eq } = require('drizzle-orm');

(async () => {
  // Get all sources for Trump topic
  const trumpSources = await db
    .select({ domain: sources.domain, pattern: sources.apiConfig })
    .from(sources)
    .innerJoin(sourcesTopics, eq(sources.id, sourcesTopics.sourceId))
    .innerJoin(topics, eq(sourcesTopics.topicId, topics.id))
    .where(eq(topics.slug, 'Trump'));

  console.log('Sources for Trump topic:');
  trumpSources.slice(0, 8).forEach(s => {
    console.log(`  ${s.domain}: ${s.pattern?.articlePattern?.substring(0, 80) || 'no pattern'}`);
  });

  process.exit(0);
})();
