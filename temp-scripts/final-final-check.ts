import { chromium } from 'playwright';

async function finalFinalCheck() {
  const browser = await chromium.launch({ headless: false });
  const page = await browser.newPage();

  try {
    console.log('🔍 Final check after disabling connection cache...\n');
    await page.goto('http://localhost:3001/Trump?filter=all', { waitUntil: 'networkidle' });
    await page.waitForTimeout(3000);

    const count = await page.locator('article').count();
    const header = await page.textContent('header');

    console.log('=== FINAL RESULT ===');
    console.log(`Articles displayed: ${count}`);
    console.log(`Header: ${header?.trim()}\n`);

    await page.screenshot({ path: 'final-final-result.png', fullPage: true });

    if (count >= 81) {
      console.log('🎉🎉🎉 SUCCESS! All Trump articles are displayed!');
    } else if (count >= 100) {
      console.log('✅ Maximum articles displayed (100)');
    } else {
      console.log(`⚠️ Still only ${count} articles shown`);
    }

    console.log('\nKeeping browser open for 30 seconds...');
    await page.waitForTimeout(30000);

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await browser.close();
  }
}

finalFinalCheck();
