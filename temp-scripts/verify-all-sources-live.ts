import { chromium } from 'playwright';

async function verifyAllSourcesLive() {
  const browser = await chromium.launch({ headless: false });
  const page = await browser.newPage();

  try {
    console.log('Waiting for Netlify deploy to complete...');
    console.log('Checking every 30 seconds for up to 5 minutes...\n');

    let deployed = false;
    const maxAttempts = 10; // 10 attempts * 30 seconds = 5 minutes

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      console.log(`Attempt ${attempt}/${maxAttempts}...`);

      await page.goto('https://obscureai.netlify.app/admin/crawl-report', {
        waitUntil: 'domcontentloaded',
        timeout: 60000
      });
      await page.waitForTimeout(3000);

      // Check if we can access the page
      const hasDropdown = await page.locator('select').count() > 0;

      if (hasDropdown) {
        // Select a crawl with articles (Trump crawl #20)
        const options = await page.locator('select option').allTextContents();
        const trumpCrawlIndex = options.findIndex(opt => opt.includes('Trump') && opt.includes('11:34 AM'));

        if (trumpCrawlIndex >= 0) {
          await page.locator('select').selectOption({ index: trumpCrawlIndex });
          await page.waitForTimeout(2000);

          // Count sources
          const sources = await page.locator('table tbody tr td:first-child').count();

          console.log(`\n✅ Found ${sources} sources in the table`);

          if (sources >= 20) { // Expecting ~25 sources for Trump
            console.log('🎉 DEPLOYED! All sources are showing!');
            deployed = true;

            // Verify sources with 0 articles
            const noArticlesCount = await page.locator('text=/No articles found/i').count();
            console.log(`✅ Sources with 0 articles: ${noArticlesCount}`);

            // Take screenshot
            await page.screenshot({ path: 'temp-scripts/final-verification.png', fullPage: true });
            console.log('📸 Screenshot saved: final-verification.png\n');

            // List all sources
            console.log('📋 All sources:');
            const sourceNames = await page.locator('table tbody tr td:first-child div:first-child').allTextContents();
            sourceNames.forEach((name, idx) => {
              console.log(`   ${idx + 1}. ${name}`);
            });

            break;
          } else {
            console.log(`⚠️  Only ${sources} sources found, expected 25. Still on old version.\n`);
          }
        }
      }

      if (attempt < maxAttempts && !deployed) {
        console.log('Waiting 30 seconds before next check...\n');
        await page.waitForTimeout(30000);
      }
    }

    if (!deployed) {
      console.log('❌ Deploy did not complete in 5 minutes');
    } else {
      console.log('\nKeeping browser open for 30 seconds...');
      await page.waitForTimeout(30000);
    }

  } catch (error) {
    console.error('❌ Error:', error);
    await page.screenshot({ path: 'temp-scripts/verify-error.png', fullPage: true });
  } finally {
    await browser.close();
  }
}

verifyAllSourcesLive();
