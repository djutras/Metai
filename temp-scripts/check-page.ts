import 'dotenv/config';
import { chromium } from 'playwright';
import { db } from './src/lib/db';
import { articles, topics, topicArticles } from './db/schema';
import { eq, and } from 'drizzle-orm';

async function main() {
  console.log('=== Checking Trump Page with Playwright ===\n');

  // Get expected article count from database
  const trumpTopic = await db
    .select({ id: topics.id })
    .from(topics)
    .where(eq(topics.slug, 'Trump'))
    .limit(1);

  if (trumpTopic.length === 0) {
    console.error('Trump topic not found in database');
    process.exit(1);
  }

  const dbArticles = await db
    .select({
      id: articles.id,
      title: articles.title,
      publishedAt: articles.publishedAt
    })
    .from(topicArticles)
    .innerJoin(articles, eq(topicArticles.articleId, articles.id))
    .where(
      and(
        eq(topicArticles.topicId, trumpTopic[0].id),
        eq(topicArticles.hiddenBool, false)
      )
    );

  console.log(`Expected articles in database: ${dbArticles.length}`);

  // Launch browser
  const browser = await chromium.launch({ headless: false });
  const page = await browser.newPage();

  try {
    // Navigate to the page
    await page.goto('http://localhost:3006/Trump?filter=all', { waitUntil: 'networkidle' });

    // Wait for articles to load
    await page.waitForSelector('article.card', { timeout: 5000 });

    // Check filter buttons
    const filterButtons = await page.$$eval('.chip', buttons =>
      buttons.map(b => b.textContent?.trim())
    );
    console.log(`\nFilter buttons: ${filterButtons.join(', ')}`);

    // Check if "All" button is active
    const activeFilter = await page.$eval('.chip.active', el => el.textContent?.trim());
    console.log(`Active filter: ${activeFilter}`);

    // Count articles on page
    const pageArticles = await page.$$('article.card');
    console.log(`\nArticles displayed on page: ${pageArticles.length}`);

    // Get article titles from page
    const pageTitles = await page.$$eval('article.card h2', headers =>
      headers.map(h => h.textContent?.trim())
    );

    console.log('\nFirst 5 articles on page:');
    pageTitles.slice(0, 5).forEach((title, i) => {
      console.log(`  ${i + 1}. ${title}`);
    });

    // Check for issues
    console.log('\n=== Diagnostic Results ===');

    if (!filterButtons.includes('All')) {
      console.log('❌ ISSUE: "All" filter button not found');
    } else {
      console.log('✅ "All" filter button exists');
    }

    if (activeFilter !== 'All') {
      console.log(`❌ ISSUE: Active filter is "${activeFilter}", should be "All"`);
    } else {
      console.log('✅ "All" filter is active');
    }

    if (pageArticles.length < dbArticles.length) {
      console.log(`❌ ISSUE: Page shows ${pageArticles.length} articles but database has ${dbArticles.length}`);
      console.log(`   Missing ${dbArticles.length - pageArticles.length} articles`);
    } else if (pageArticles.length === dbArticles.length) {
      console.log(`✅ All ${pageArticles.length} articles are displayed`);
    } else {
      console.log(`⚠️  Page shows ${pageArticles.length} articles, database has ${dbArticles.length}`);
    }

    // Take screenshot
    await page.screenshot({ path: 'trump-page-screenshot.png', fullPage: true });
    console.log('\n📸 Screenshot saved to trump-page-screenshot.png');

  } catch (error) {
    console.error('Error during page check:', error);
  } finally {
    await browser.close();
  }
}

main().catch(console.error);
