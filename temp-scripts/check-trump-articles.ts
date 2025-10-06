import 'dotenv/config';
import { db } from './src/lib/db';
import { articles, topics, articlesTopics } from './db/schema';
import { eq, desc } from 'drizzle-orm';

async function main() {
  const trumpArticles = await db
    .select({
      title: articles.title,
      url: articles.canonicalUrl,
      source: articles.sourceDomain,
      publishedAt: articles.publishedAt
    })
    .from(articles)
    .innerJoin(articlesTopics, eq(articles.id, articlesTopics.articleId))
    .innerJoin(topics, eq(articlesTopics.topicId, topics.id))
    .where(eq(topics.slug, 'Trump'))
    .orderBy(desc(articles.publishedAt))
    .limit(100);

  console.log(`Found ${trumpArticles.length} Trump articles in database\n`);

  // Count by source
  const bySource = new Map<string, number>();
  trumpArticles.forEach(a => {
    bySource.set(a.source, (bySource.get(a.source) || 0) + 1);
  });

  console.log('Articles by source:');
  Array.from(bySource.entries())
    .sort((a, b) => b[1] - a[1])
    .forEach(([source, count]) => {
      console.log(`  ${source}: ${count} articles`);
    });
}

main().catch(console.error);
