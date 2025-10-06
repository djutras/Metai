require('dotenv').config();
const { db } = require('./src/lib/db');
const { articles } = require('./db/schema');
const { desc } = require('drizzle-orm');

(async () => {
  try {
    const recentArticles = await db
      .select({
        id: articles.id,
        title: articles.title,
        publishedAt: articles.publishedAt,
        sourceId: articles.sourceId,
      })
      .from(articles)
      .orderBy(desc(articles.id))
      .limit(5);

    console.log('\nRecent Articles:');
    console.log('================');
    for (const article of recentArticles) {
      console.log(`ID: ${article.id.toString()}`);
      console.log(`Title: ${article.title}`);
      console.log(`Published: ${article.publishedAt}`);
      console.log(`Source ID: ${article.sourceId}`);
      console.log('---');
    }

    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
})();
