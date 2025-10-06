import { chromium } from 'playwright';

async function finalCheck() {
  const browser = await chromium.launch({ headless: false });
  const page = await browser.newPage();

  try {
    console.log('Opening Trump page on port 3000...\n');
    await page.goto('http://localhost:3000/Trump?filter=all', { waitUntil: 'networkidle' });
    await page.waitForTimeout(3000);

    const articleCount = await page.locator('article').count();
    const headerText = await page.textContent('header');

    console.log('=== RESULT ===');
    console.log(`Articles on page: ${articleCount}`);
    console.log(`Header text: ${headerText?.trim()}`);

    await page.screenshot({ path: 'final-result.png', fullPage: true });
    console.log('Screenshot: final-result.png\n');

    if (articleCount >= 81) {
      console.log('🎉 SUCCESS! All Trump articles are now displayed!');
    } else if (articleCount >= 100) {
      console.log('✅ Showing 100 articles (maxItems limit)');
    } else {
      console.log(`❌ ISSUE: Only showing ${articleCount} articles`);
    }

    console.log('\nKeeping browser open for 30 seconds...');
    await page.waitForTimeout(30000);

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await browser.close();
  }
}

finalCheck();
