import { neon } from '@neondatabase/serverless';
import dotenv from 'dotenv';

dotenv.config();

const sql = neon(process.env.DATABASE_URL);

// Get Trump topic
const topics = await sql`SELECT * FROM topics WHERE slug = 'Trump' LIMIT 1`;

if (topics.length === 0) {
  console.log('Trump topic not found');
  process.exit(1);
}

const topic = topics[0];
console.log(`Topic: ${topic.name} (id: ${topic.id})`);
console.log(`Settings: freshnessHours=${topic.freshness_hours}, includes=${topic.includes}, excludes=${topic.excludes}`);

// Get latest crawl
const crawls = await sql`
  SELECT * FROM crawls
  WHERE topic_id = ${topic.id}
  ORDER BY started_at DESC
  LIMIT 1
`;

if (crawls.length > 0) {
  console.log(`\nLatest crawl:`);
  console.log(`  Started: ${crawls[0].started_at}`);
  console.log(`  Finished: ${crawls[0].finished_at}`);
  console.log(`  Stats: ${JSON.stringify(crawls[0].stats_json, null, 2)}`);
}

// Get total sources for this topic (via junction table)
const sourcesCount = await sql`
  SELECT COUNT(DISTINCT s.id)::int as count
  FROM sources s
  JOIN sources_topics st ON st.source_id = s.id
  WHERE st.topic_id = ${topic.id}
`;
console.log(`\nTotal sources: ${sourcesCount[0].count}`);

// Get articles by source
const sourceStats = await sql`
  SELECT
    s.domain,
    COUNT(DISTINCT a.id)::int as article_count
  FROM sources s
  JOIN sources_topics st ON st.source_id = s.id
  LEFT JOIN articles a ON a.source_id = s.id
  LEFT JOIN topic_articles ta ON ta.article_id = a.id AND ta.topic_id = ${topic.id}
  WHERE st.topic_id = ${topic.id}
  GROUP BY s.domain
  ORDER BY article_count DESC
`;

console.log(`\nSources with articles:`);
let sourcesWithContent = 0;
sourceStats.forEach(s => {
  if (s.article_count > 0) {
    console.log(`  ${s.domain}: ${s.article_count} articles`);
    sourcesWithContent++;
  }
});

const coverage = (sourcesWithContent / sourcesCount[0].count * 100).toFixed(1);

console.log(`\n=== COVERAGE ===`);
console.log(`Sources with articles: ${sourcesWithContent}/${sourcesCount[0].count} (${coverage}%)`);
console.log(`Target: 19/24 (80%)`);
console.log(`Status: ${sourcesWithContent >= 19 ? '✓ SUCCESS!' : '✗ NEEDS IMPROVEMENT'}`);

process.exit(0);
