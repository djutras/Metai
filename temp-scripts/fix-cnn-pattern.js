require('dotenv').config();
const { db } = require('./src/lib/db');
const { sources } = require('./db/schema');
const { eq } = require('drizzle-orm');

(async () => {
  const [source] = await db.select().from(sources).where(eq(sources.domain, 'cnn.com')).limit(1);

  // Update pattern to allow single or double-digit months/days
  const newConfig = {
    ...source.apiConfig,
    articlePattern: '^https?://(?:www\\.)?cnn\\.com/\\d{4}/\\d{1,2}/\\d{1,2}/[a-z]+/[a-z0-9-]+(?:/[a-z0-9-]+)?(?:/index\\.html)?(?:\\?.*)?$',
    manuallyFixed: true,
  };

  await db.update(sources)
    .set({ apiConfig: newConfig })
    .where(eq(sources.domain, 'cnn.com'));

  console.log('✓ Updated CNN pattern to allow single-digit dates');
  console.log('New pattern:', newConfig.articlePattern);
  process.exit(0);
})();
