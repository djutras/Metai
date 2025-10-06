import { chromium } from 'playwright';

async function checkWithLogs() {
  const browser = await chromium.launch({ headless: false });
  const page = await browser.newPage();

  try {
    console.log('Opening Trump page and waiting for logs...\n');
    await page.goto('http://localhost:3000/Trump?filter=all', { waitUntil: 'networkidle' });
    await page.waitForTimeout(5000);

    const articleCount = await page.locator('article').count();
    console.log(`Articles on page: ${articleCount}`);
    console.log('\nCheck the dev server console for the log output showing how many articles the query returned.');
    console.log('Browser will stay open for inspection...');

    await page.waitForTimeout(30000);

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await browser.close();
  }
}

checkWithLogs();
