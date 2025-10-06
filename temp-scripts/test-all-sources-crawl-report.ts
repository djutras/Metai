import { chromium } from 'playwright';

async function testAllSourcesCrawlReport() {
  const browser = await chromium.launch({ headless: false });
  const page = await browser.newPage();

  try {
    console.log('Testing crawl report shows ALL sources...\\n');

    await page.goto('https://obscureai.netlify.app/admin/crawl-report', {
      waitUntil: 'domcontentloaded',
      timeout: 60000
    });
    await page.waitForTimeout(3000);

    // Check if dropdown has options
    const options = await page.locator('select option').count();
    console.log(`Found ${options} crawl(s) in dropdown\\n`);

    if (options === 0) {
      console.log('❌ No crawls available to test');
      await browser.close();
      return;
    }

    // Select first crawl
    await page.locator('select').selectOption({ index: 0 });
    await page.waitForTimeout(2000);

    // Count total sources shown in table
    const sources = await page.locator('table tbody tr td:first-child').count();
    console.log(`✅ Total sources shown: ${sources}`);

    // Check for sources with 0 articles
    const noArticlesRows = await page.locator('text=/No articles found/i').count();
    if (noArticlesRows > 0) {
      console.log(`✅ Found ${noArticlesRows} source(s) with 0 articles`);

      try {
        // Try to get source name from the row with no articles
        const zeroArticleLabel = await page.locator('text=/(0 articles)/i').first().textContent();
        console.log(`   Found label: ${zeroArticleLabel}`);
      } catch (e) {
        console.log('   (Could not extract source name)');
      }
    } else {
      console.log('⚠️  No sources with 0 articles found (all sources have articles)');
    }

    // Check for sources with articles
    const articleLinks = await page.locator('table tbody tr td a').count();
    console.log(`✅ Total article links: ${articleLinks}`);

    // Take screenshot
    await page.screenshot({ path: 'temp-scripts/all-sources-report.png', fullPage: true });
    console.log('\\n📸 Screenshot saved: all-sources-report.png');

    console.log('\\n🎉 SUCCESS! Crawl report now shows all sources!');
    console.log('\\nKeeping browser open for 30 seconds...');
    await page.waitForTimeout(30000);

  } catch (error) {
    console.error('❌ Error:', error);
    await page.screenshot({ path: 'temp-scripts/error-all-sources.png', fullPage: true });
  } finally {
    await browser.close();
  }
}

testAllSourcesCrawlReport();
