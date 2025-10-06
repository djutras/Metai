require('dotenv').config();
const { fetchHtml } = require('./src/lib/http');
const { extractArticle } = require('./src/lib/extract');
const { isArticle, topicMatchScore } = require('./src/lib/quality');

const url = process.argv[2];

if (!url) {
  console.log('Usage: npx tsx test-single-url.js <url>');
  process.exit(1);
}

(async () => {
  try {
    console.log(`\nTesting: ${url}\n`);

    // Fetch HTML
    console.log('1. Fetching HTML...');
    const result = await fetchHtml(url, { timeoutMs: 15000 });
    console.log(`   Status: ${result.status}`);

    if (result.status !== 200) {
      console.log('   ✗ Failed to fetch');
      process.exit(1);
    }

    console.log(`   ✓ Fetched ${result.html.length} bytes\n`);

    // Extract article
    console.log('2. Extracting article...');
    const article = await extractArticle(url, result.html);

    if (!article) {
      console.log('   ✗ Extraction failed');
      console.log('   (Readability returned null or required fields missing)\n');
      process.exit(1);
    }

    console.log(`   ✓ Title: ${article.title}`);
    console.log(`   ✓ Published: ${article.published_at}`);
    console.log(`   ✓ Summary length: ${article.summary?.length || 0} chars`);
    console.log(`   ✓ Lang: ${article.lang}`);
    console.log(`   ✓ Paywalled: ${article.paywalled_bool}\n`);

    // Quality check
    console.log('3. Quality check...');
    const topicConfig = {
      freshnessHours: 72,
      query: 'Trump',
      includes: [],
      excludes: [],
    };

    const passesQuality = isArticle(article, topicConfig);
    console.log(`   Quality check: ${passesQuality ? '✓ PASS' : '✗ FAIL'}`);

    if (!passesQuality) {
      // Check individual criteria
      const titleLen = article.title?.length || 0;
      const summaryLen = article.summary?.length || 0;
      const summaryWords = article.summary?.split(/\s+/).filter(Boolean).length || 0;

      console.log(`\n   Failure analysis:`);
      console.log(`   - Title length: ${titleLen} (must be ≥ 10)`);
      console.log(`   - Summary words: ${summaryWords} (must be 150-3000)`);

      if (article.published_at) {
        const hoursAgo = (Date.now() - article.published_at.getTime()) / (1000 * 60 * 60);
        console.log(`   - Freshness: ${Math.round(hoursAgo)} hours ago (must be ≤ 72)`);
      } else {
        console.log(`   - Published date: MISSING`);
      }
    }

    // Topic match
    console.log('\n4. Topic matching...');
    const matchScore = topicMatchScore(article, topicConfig);
    console.log(`   Match score: ${matchScore} (threshold: 0.3)`);
    console.log(`   ${matchScore >= 0.3 ? '✓ MATCHES topic' : '✗ Does not match topic'}\n`);

    process.exit(0);
  } catch (error) {
    console.error('✗ Error:', error.message);
    console.error(error);
    process.exit(1);
  }
})();
