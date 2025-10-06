import { chromium } from 'playwright';

async function testCompletedCrawl() {
  const browser = await chromium.launch({ headless: false });
  const page = await browser.newPage();

  try {
    console.log('Finding a completed crawl with articles...\n');

    await page.goto('https://obscureai.netlify.app/admin/crawl-report', {
      waitUntil: 'domcontentloaded',
      timeout: 60000
    });
    await page.waitForTimeout(3000);

    // Get all dropdown options
    const options = await page.locator('select option').allTextContents();
    console.log(`Found ${options.length} total crawls\n`);

    // Try each option until we find one with articles
    for (let i = 0; i < Math.min(options.length, 10); i++) {
      console.log(`Trying crawl ${i + 1}: ${options[i].substring(0, 50)}...`);

      await page.locator('select').selectOption({ index: i });
      await page.waitForTimeout(2000);

      // Check if articles table exists
      const table = page.locator('table');
      const tableExists = await table.isVisible().catch(() => false);

      if (tableExists) {
        const rows = await page.locator('table tbody tr').count();
        console.log(`\n✅ FOUND! This crawl has ${rows} article row(s)`);

        // Get some article details
        const firstTitle = await page.locator('table tbody tr:first-child a').textContent();
        console.log(`First article: ${firstTitle?.substring(0, 60)}...`);

        // Check for source grouping
        const sources = await page.locator('table tbody td[rowspan]').count();
        console.log(`Sources with articles: ${sources}`);

        await page.screenshot({ path: 'temp-scripts/crawl-with-articles.png', fullPage: true });
        console.log('\n🎉 SUCCESS! Crawl report table is working correctly!');
        console.log('Screenshot saved: crawl-with-articles.png');
        break;
      } else {
        console.log('  No articles in this crawl, trying next...');
      }
    }

    console.log('\nKeeping browser open for 30 seconds...');
    await page.waitForTimeout(30000);

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await browser.close();
  }
}

testCompletedCrawl();
