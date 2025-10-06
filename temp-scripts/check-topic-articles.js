require('dotenv').config();
const { db } = require('./src/lib/db');
const { topicArticles, articles, topics } = require('./db/schema');
const { eq } = require('drizzle-orm');

(async () => {
  try {
    const trumpArticles = await db
      .select({
        articleId: topicArticles.articleId,
        topicId: topicArticles.topicId,
        title: articles.title,
        topicName: topics.name,
      })
      .from(topicArticles)
      .innerJoin(articles, eq(topicArticles.articleId, articles.id))
      .innerJoin(topics, eq(topicArticles.topicId, topics.id))
      .where(eq(topics.slug, 'Trump'));

    console.log(`\nFound ${trumpArticles.length} articles linked to Trump topic:`);
    console.log('='.repeat(60));
    for (const article of trumpArticles) {
      console.log(`Article ID: ${article.articleId.toString()}`);
      console.log(`Topic: ${article.topicName} (ID: ${article.topicId})`);
      console.log(`Title: ${article.title}`);
      console.log('---');
    }

    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
})();
