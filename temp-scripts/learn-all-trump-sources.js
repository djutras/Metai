require('dotenv').config();
const { db } = require('./src/lib/db');
const { sources, sourcesTopics, topics } = require('./db/schema');
const { eq } = require('drizzle-orm');
const { learnSource } = require('./src/jobs/learnSource');

(async () => {
  // Get all sources for Trump topic
  const trumpSources = await db
    .select({ domain: sources.domain, name: sources.name })
    .from(sources)
    .innerJoin(sourcesTopics, eq(sources.id, sourcesTopics.sourceId))
    .innerJoin(topics, eq(sourcesTopics.topicId, topics.id))
    .where(eq(topics.slug, 'Trump'));

  console.log(`Found ${trumpSources.length} sources for Trump topic\n`);

  let learned = 0;
  let failed = 0;
  let skipped = 0;

  for (const source of trumpSources) {
    try {
      // Check if already learned
      const [existing] = await db
        .select({ apiConfig: sources.apiConfig })
        .from(sources)
        .where(eq(sources.domain, source.domain))
        .limit(1);

      if (existing.apiConfig?.learned && !existing.apiConfig?.wwwFixed && !existing.apiConfig?.manuallyFixed) {
        console.log(`✓ ${source.domain} already learned (skipping)`);
        skipped++;
        continue;
      }

      await learnSource(source.domain);
      learned++;

      // Small delay to avoid rate limits
      await new Promise(resolve => setTimeout(resolve, 1000));
    } catch (error) {
      console.error(`✗ Failed to learn ${source.domain}:`, error.message);
      failed++;
    }
  }

  console.log(`\n=== Learning Complete ===`);
  console.log(`Learned: ${learned}, Skipped: ${skipped}, Failed: ${failed}`);
  process.exit(0);
})();
