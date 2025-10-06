import { chromium } from 'playwright';

async function testCrawlReport() {
  const browser = await chromium.launch({ headless: false });
  const page = await browser.newPage();

  try {
    console.log('Testing crawl report on live site...\n');

    // Navigate to admin page
    console.log('1. Going to admin page...');
    await page.goto('https://obscureai.netlify.app/admin', {
      waitUntil: 'domcontentloaded',
      timeout: 60000
    });
    await page.waitForTimeout(2000);

    // Login
    console.log('2. Logging in...');
    await page.fill('input[type="password"]', '$$$Hfyj54hfmetai');
    await page.click('button:has-text("Login")');
    await page.waitForTimeout(3000);

    // Check if Crawl Report link exists
    console.log('3. Checking for Crawl Report link...');
    const crawlReportLink = page.locator('a:has-text("Crawl Report")');
    const linkExists = await crawlReportLink.isVisible().catch(() => false);

    if (!linkExists) {
      console.log('❌ Crawl Report link not found on admin page!');
      await page.screenshot({ path: 'temp-scripts/admin-no-link.png', fullPage: true });
      console.log('Waiting for deploy to complete...');
      await page.waitForTimeout(60000);
      await page.reload();
      await page.waitForTimeout(3000);
    }

    // Click Crawl Report link
    console.log('4. Clicking Crawl Report link...');
    await crawlReportLink.click();
    await page.waitForTimeout(3000);

    await page.screenshot({ path: 'temp-scripts/crawl-report-page.png', fullPage: true });

    // Check for dropdown
    console.log('5. Checking for crawl dropdown...');
    const dropdown = page.locator('select');
    const dropdownExists = await dropdown.isVisible().catch(() => false);

    if (!dropdownExists) {
      console.log('❌ Dropdown not found!');
      const bodyText = await page.textContent('body');
      if (bodyText?.includes('error') || bodyText?.includes('Error')) {
        console.log('Error detected on page:');
        console.log(bodyText.substring(0, 500));
      }
      await page.waitForTimeout(30000);
      await browser.close();
      return;
    }

    console.log('✅ Dropdown found!');

    // Check dropdown options
    const options = await page.locator('select option').count();
    console.log(`6. Found ${options} crawl(s) in dropdown`);

    if (options === 0) {
      console.log('⚠️  No crawls available (this is okay if no crawls ran in last 48h)');
    } else {
      // Select first option and check table
      console.log('7. Selecting first crawl...');
      await dropdown.selectOption({ index: 0 });
      await page.waitForTimeout(2000);

      // Check for table
      const table = page.locator('table');
      const tableExists = await table.isVisible().catch(() => false);

      if (tableExists) {
        const rows = await page.locator('table tbody tr').count();
        console.log(`✅ Table found with ${rows} row(s)`);

        // Check crawl summary
        const summaryExists = await page.locator('h2:has-text("Crawl Summary")').isVisible().catch(() => false);
        if (summaryExists) {
          console.log('✅ Crawl Summary section found');
        }

        // Take final screenshot
        await page.screenshot({ path: 'temp-scripts/crawl-report-loaded.png', fullPage: true });
        console.log('\n🎉 SUCCESS! Crawl report is working!');
      } else {
        console.log('⚠️  No table found - might be no articles for this crawl');
        const noArticlesMsg = await page.locator('text=/No articles/i').isVisible().catch(() => false);
        if (noArticlesMsg) {
          console.log('✅ "No articles" message shown (expected for empty crawl)');
        }
      }
    }

    console.log('\nKeeping browser open for 30 seconds...');
    await page.waitForTimeout(30000);

  } catch (error) {
    console.error('❌ Error:', error);
    await page.screenshot({ path: 'temp-scripts/crawl-report-error.png', fullPage: true });
  } finally {
    await browser.close();
  }
}

testCrawlReport();
