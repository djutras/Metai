import { chromium } from 'playwright';

async function verifyAllCrawlsDropdown() {
  const browser = await chromium.launch({ headless: false });
  const page = await browser.newPage();

  try {
    console.log('Waiting for Netlify deploy and verifying dropdown...');
    console.log('Checking every 20 seconds for up to 3 minutes...\n');

    let verified = false;
    const maxAttempts = 9;

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      console.log(`Attempt ${attempt}/${maxAttempts}...`);

      await page.goto('https://obscureai.netlify.app/admin/crawl-report', {
        waitUntil: 'domcontentloaded',
        timeout: 60000
      });
      await page.waitForTimeout(3000);

      // Get all dropdown options
      const options = await page.locator('select option').allTextContents();
      console.log(`Found ${options.length} crawls in dropdown\n`);

      // Check if we have World News crawls (these typically have no articles)
      const worldNewsCrawls = options.filter(opt => opt.includes('World News'));
      console.log(`World News crawls: ${worldNewsCrawls.length}`);

      if (worldNewsCrawls.length > 0) {
        console.log('✅ DEPLOYED! Dropdown now shows all crawls including World News\n');

        // Show first few options
        console.log('📋 First 10 crawls in dropdown:');
        options.slice(0, 10).forEach((opt, idx) => {
          console.log(`   ${idx + 1}. ${opt}`);
        });

        // Test selecting a World News crawl
        const worldNewsIndex = options.findIndex(opt => opt.includes('World News'));
        if (worldNewsIndex >= 0) {
          console.log(`\nSelecting World News crawl at index ${worldNewsIndex}...`);
          await page.locator('select').selectOption({ index: worldNewsIndex });
          await page.waitForTimeout(2000);

          // Check what's displayed
          const hasTable = await page.locator('table tbody tr').count() > 0;
          const noArticlesMsg = await page.locator('text=/No articles found for this crawl/i').isVisible().catch(() => false);

          if (hasTable) {
            const sources = await page.locator('table tbody tr td:first-child').count();
            console.log(`✅ Shows table with ${sources} source(s)`);
          } else if (noArticlesMsg) {
            console.log('✅ Shows "No articles found for this crawl" message');
          } else {
            console.log('⚠️ Shows something else');
          }
        }

        await page.screenshot({ path: 'temp-scripts/verify-dropdown.png', fullPage: true });
        console.log('\n📸 Screenshot saved: verify-dropdown.png');

        verified = true;
        break;
      } else {
        console.log('⚠️ No World News crawls found yet, still on old version\n');
      }

      if (attempt < maxAttempts && !verified) {
        console.log('Waiting 20 seconds before next check...\n');
        await page.waitForTimeout(20000);
      }
    }

    if (!verified) {
      console.log('❌ Deploy did not complete in 3 minutes or no World News crawls exist');
    } else {
      console.log('\n🎉 SUCCESS! All crawls are showing in dropdown!');
      console.log('\nKeeping browser open for 20 seconds...');
      await page.waitForTimeout(20000);
    }

  } catch (error) {
    console.error('❌ Error:', error);
    await page.screenshot({ path: 'temp-scripts/verify-error.png', fullPage: true });
  } finally {
    await browser.close();
  }
}

verifyAllCrawlsDropdown();
