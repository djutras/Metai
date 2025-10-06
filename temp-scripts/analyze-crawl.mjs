import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';
import * as schema from './db/schema.ts';
import { eq, sql as drizzleSql } from 'drizzle-orm';
import dotenv from 'dotenv';

dotenv.config();

const sql = neon(process.env.DATABASE_URL);
const db = drizzle(sql, { schema });

// Get latest crawl for Trump topic
const [trumpTopic] = await db.select().from(schema.topics).where(eq(schema.topics.slug, 'Trump')).limit(1);

if (!trumpTopic) {
  console.log('Trump topic not found');
  process.exit(1);
}

// Get latest crawl
const latestCrawl = await db.select()
  .from(schema.crawls)
  .where(eq(schema.crawls.topicId, trumpTopic.id))
  .orderBy(drizzleSql`${schema.crawls.startedAt} DESC`)
  .limit(1);

if (latestCrawl.length === 0) {
  console.log('No crawls found');
  process.exit(1);
}

console.log('Latest Trump crawl:');
console.log(`  Started: ${latestCrawl[0].startedAt}`);
console.log(`  Finished: ${latestCrawl[0].finishedAt}`);
console.log(`  Stats: ${JSON.stringify(latestCrawl[0].statsJson, null, 2)}`);

// Get article count from this crawl
const articleCount = await db.select({ count: drizzleSql`COUNT(*)::int` })
  .from(schema.topicArticles)
  .where(eq(schema.topicArticles.topicId, trumpTopic.id));

console.log(`\nTotal articles in Trump topic: ${articleCount[0].count}`);

// Get sources with articles
const sourcesWithArticles = await db
  .select({
    domain: schema.sources.domain,
    articleCount: drizzleSql`COUNT(DISTINCT ${schema.articles.id})::int`
  })
  .from(schema.sources)
  .leftJoin(schema.articles, eq(schema.articles.sourceId, schema.sources.id))
  .leftJoin(schema.topicArticles, eq(schema.topicArticles.articleId, schema.articles.id))
  .where(eq(schema.topicArticles.topicId, trumpTopic.id))
  .groupBy(schema.sources.domain)
  .orderBy(drizzleSql`COUNT(DISTINCT ${schema.articles.id}) DESC`);

console.log(`\nSources with articles (${sourcesWithArticles.filter(s => s.articleCount > 0).length} sources):`);
sourcesWithArticles.forEach(s => {
  if (s.articleCount > 0) {
    console.log(`  ${s.domain}: ${s.articleCount} articles`);
  }
});

// Get total source count for Trump
const totalSources = await db.select({ count: drizzleSql`COUNT(*)::int` })
  .from(schema.sources)
  .where(eq(schema.sources.topicId, trumpTopic.id));

const sourcesWithContent = sourcesWithArticles.filter(s => s.articleCount > 0).length;
const coverage = (sourcesWithContent / totalSources[0].count * 100).toFixed(1);

console.log(`\n=== COVERAGE ===`);
console.log(`Sources with articles: ${sourcesWithContent}/${totalSources[0].count} (${coverage}%)`);
console.log(`Target: 19/24 (80%)`);
console.log(`Status: ${sourcesWithContent >= 19 ? 'SUCCESS!' : 'NEEDS IMPROVEMENT'}`);

process.exit(0);
