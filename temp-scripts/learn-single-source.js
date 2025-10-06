require('dotenv').config();
const { learnSource } = require('./src/jobs/learnSource');

const domain = process.argv[2];

if (!domain) {
  console.log('Usage: npx tsx learn-single-source.js <domain>');
  console.log('Example: npx tsx learn-single-source.js theguardian.com');
  process.exit(1);
}

(async () => {
  try {
    await learnSource(domain);
    console.log('\n✓ Learning complete!');
    process.exit(0);
  } catch (error) {
    console.error('\n✗ Learning failed:', error.message);
    process.exit(1);
  }
})();
