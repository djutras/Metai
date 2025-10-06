require('dotenv').config();
const { runTopic } = require('./src/jobs/runTopic');

(async () => {
  console.log('Starting Trump topic crawl...\n');
  console.log(`DATABASE_URL: ${process.env.DATABASE_URL ? 'Set' : 'NOT SET'}\n`);

  try {
    const result = await runTopic('Trump');

    console.log('\n=== Crawl Results ===');
    console.log(JSON.stringify(result, (key, value) =>
      typeof value === 'bigint' ? value.toString() : value
    , null, 2));
  } catch (error) {
    console.error('Crawl failed:', error.message);
    console.error('Full error:', error);
    process.exit(1);
  }
})();
