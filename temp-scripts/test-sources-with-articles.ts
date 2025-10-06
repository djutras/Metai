import { chromium } from 'playwright';

async function testSourcesWithArticles() {
  const browser = await chromium.launch({ headless: false });
  const page = await browser.newPage();

  try {
    console.log('Testing crawl report with articles...\\n');

    await page.goto('https://obscureai.netlify.app/admin/crawl-report', {
      waitUntil: 'domcontentloaded',
      timeout: 60000
    });
    await page.waitForTimeout(3000);

    // Get all dropdown options
    const options = await page.locator('select option').allTextContents();
    console.log(`Found ${options.length} crawls\\n`);

    // Try each crawl until we find one with a table
    for (let i = 0; i < Math.min(options.length, 10); i++) {
      console.log(`Testing crawl ${i + 1}: ${options[i].substring(0, 60)}...`);

      await page.locator('select').selectOption({ index: i });
      await page.waitForTimeout(2000);

      // Check if table exists
      const tableExists = await page.locator('table tbody tr').count() > 0;

      if (tableExists) {
        const totalRows = await page.locator('table tbody tr').count();
        const sources = await page.locator('table tbody tr td:first-child').count();
        const noArticlesRows = await page.locator('text=/No articles found/i').count();
        const articleLinks = await page.locator('table tbody tr td a').count();

        console.log(`\\n✅ FOUND TABLE!`);
        console.log(`   Total rows: ${totalRows}`);
        console.log(`   Total sources: ${sources}`);
        console.log(`   Sources with 0 articles: ${noArticlesRows}`);
        console.log(`   Total article links: ${articleLinks}`);

        // List all sources
        console.log(`\\n📋 All sources in this crawl:`);
        const sourceNames = await page.locator('table tbody tr td:first-child div:first-child').allTextContents();
        sourceNames.forEach((name, idx) => {
          console.log(`   ${idx + 1}. ${name}`);
        });

        await page.screenshot({ path: 'temp-scripts/crawl-with-all-sources.png', fullPage: true });
        console.log('\\n📸 Screenshot saved: crawl-with-all-sources.png');

        console.log('\\n🎉 SUCCESS! Crawl report shows all sources!');
        break;
      } else {
        console.log('   No table in this crawl, trying next...');
      }
    }

    console.log('\\nKeeping browser open for 30 seconds...');
    await page.waitForTimeout(30000);

  } catch (error) {
    console.error('❌ Error:', error);
    await page.screenshot({ path: 'temp-scripts/error-sources.png', fullPage: true });
  } finally {
    await browser.close();
  }
}

testSourcesWithArticles();
