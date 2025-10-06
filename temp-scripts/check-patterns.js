require('dotenv').config();
const { db } = require('./src/lib/db');
const { sources } = require('./db/schema');
const { eq, inArray } = require('drizzle-orm');

(async () => {
  const domains = ['cnn.com', 'theguardian.com', 'www.aljazeera.com', 'aljazeera.com'];

  const results = await db
    .select()
    .from(sources)
    .where(inArray(sources.domain, domains));

  for (const source of results) {
    console.log(`\n${source.domain}:`);
    console.log(`  Pattern: ${source.apiConfig?.articlePattern || 'none'}`);
    console.log(`  Learned: ${source.apiConfig?.learned || false}`);
    console.log(`  Confidence: ${source.apiConfig?.confidence || 'n/a'}`);
  }

  process.exit(0);
})();
