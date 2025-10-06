import { chromium } from 'playwright';

async function victoryTest() {
  const browser = await chromium.launch({ headless: false });
  const page = await browser.newPage();

  try {
    console.log('🚀 Testing with raw SQL topic fetch...\n');
    await page.goto('http://localhost:3001/Trump?filter=all', { waitUntil: 'networkidle' });
    await page.waitForTimeout(3000);

    const count = await page.locator('article').count();
    const header = await page.textContent('header');

    console.log('═══════════════════════════════════');
    console.log('           FINAL RESULT');
    console.log('═══════════════════════════════════');
    console.log(`Articles displayed: ${count}`);
    console.log(`Header: ${header?.trim()}`);
    console.log('═══════════════════════════════════\n');

    await page.screenshot({ path: 'victory-screenshot.png', fullPage: true });

    if (count >= 100) {
      console.log('🎉🎉🎉 VICTORY! Displaying 100 articles!');
    } else if (count >= 81) {
      console.log('🎉 SUCCESS! All 81+ articles displayed!');
    } else {
      console.log(`Still showing ${count} articles`);
    }

    console.log('\nKeeping browser open for inspection...');
    await page.waitForTimeout(30000);

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await browser.close();
  }
}

victoryTest();
