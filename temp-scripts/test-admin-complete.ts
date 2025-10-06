import { chromium } from 'playwright';

async function testAdminComplete() {
  const browser = await chromium.launch({ headless: false });
  const page = await browser.newPage();

  try {
    console.log('Testing complete admin panel functionality...\n');

    let allWorking = true;

    // Go to admin
    await page.goto('https://obscureai.netlify.app/admin', {
      waitUntil: 'domcontentloaded',
      timeout: 60000
    });
    await page.waitForTimeout(2000);

    // Login if needed
    const passwordInput = await page.locator('input[type="password"]').isVisible().catch(() => false);
    if (passwordInput) {
      console.log('Logging in...');
      await page.fill('input[type="password"]', '$$$Hfyj54hfmetai');
      await page.click('button:has-text("Login")');
      await page.waitForTimeout(3000);
    }

    // Check all navigation links exist
    const expectedLinks = ['Cron Report', 'Search Configured', 'Crawl Report', 'Discover Sources'];
    console.log('Checking navigation links...');

    for (const linkText of expectedLinks) {
      const link = await page.locator(`a:has-text("${linkText}")`).isVisible().catch(() => false);
      if (link) {
        console.log(`✅ ${linkText}`);
      } else {
        console.log(`❌ ${linkText} - MISSING`);
        allWorking = false;
      }
    }

    // Test Crawl Report
    console.log('\n--- Testing Crawl Report ---');
    await page.click('a:has-text("Crawl Report")');
    await page.waitForTimeout(3000);

    const crawlDropdown = await page.locator('select').count();
    if (crawlDropdown > 0) {
      console.log('✅ Crawl dropdown found');

      // Select first crawl
      await page.locator('select').selectOption({ index: 0 });
      await page.waitForTimeout(2000);

      const hasSources = await page.locator('table tbody tr td:first-child').count() > 0;
      if (hasSources) {
        console.log('✅ Sources table showing data');
      } else {
        console.log('⚠️ No sources in table');
      }
    } else {
      console.log('❌ Crawl dropdown not found');
      allWorking = false;
    }

    await page.screenshot({ path: 'temp-scripts/admin-crawl-report.png', fullPage: true });

    // Test Discover Sources
    console.log('\n--- Testing Discover Sources ---');
    await page.click('a:has-text("Back to Admin")');
    await page.waitForTimeout(2000);
    await page.click('a:has-text("Discover Sources")');
    await page.waitForTimeout(3000);

    const discoverTitle = await page.locator('h1:has-text("Discover New Sources")').isVisible().catch(() => false);
    if (discoverTitle) {
      console.log('✅ Discover Sources page loaded');

      const topicDropdown = await page.locator('select').count();
      const discoverButton = await page.locator('button:has-text("Discover Sources")').isVisible().catch(() => false);

      if (topicDropdown > 0 && discoverButton) {
        console.log('✅ Topic dropdown and Discover button present');
      } else {
        console.log('❌ Missing dropdown or button');
        allWorking = false;
      }
    } else {
      console.log('❌ Discover Sources page not loaded');
      allWorking = false;
    }

    await page.screenshot({ path: 'temp-scripts/admin-discover-sources.png', fullPage: true });

    // Final summary
    console.log('\n===================');
    if (allWorking) {
      console.log('🎉 ALL TESTS PASSED! Admin panel is fully functional!');
    } else {
      console.log('⚠️ Some issues detected - see above');
    }
    console.log('===================\n');

    console.log('Keeping browser open for 20 seconds...');
    await page.waitForTimeout(20000);

  } catch (error) {
    console.error('❌ Error during testing:', error);
    await page.screenshot({ path: 'temp-scripts/admin-test-error.png', fullPage: true });
  } finally {
    await browser.close();
  }
}

testAdminComplete();
