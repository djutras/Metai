require('dotenv').config();
const { db } = require('./src/lib/db');
const { sources } = require('./db/schema');
const { eq } = require('drizzle-orm');

(async () => {
  const [source] = await db.select().from(sources).where(eq(sources.domain, 'theguardian.com')).limit(1);

  // Update pattern to make www optional
  const newConfig = {
    ...source.apiConfig,
    articlePattern: '^https?://(?:www\\.)?theguardian\\.com/[a-z-]+/(?:live/|video/)?\\d{4}/\\w{3}/\\d{1,2}/[a-z0-9-]+(?:\\.html)?(?:\\?.*)?$',
    wwwFixed: true,
  };

  await db.update(sources)
    .set({ apiConfig: newConfig })
    .where(eq(sources.domain, 'theguardian.com'));

  console.log('✓ Updated Guardian pattern to make www optional');
  console.log('New pattern:', newConfig.articlePattern);
  process.exit(0);
})();
