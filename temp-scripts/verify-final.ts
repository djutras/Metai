import { chromium } from 'playwright';

async function verifyFinal() {
  const browser = await chromium.launch({ headless: false });
  const page = await browser.newPage();

  try {
    console.log('Navigating to Trump topic page (port 3002)...');
    await page.goto('http://localhost:3002/Trump?filter=all', { waitUntil: 'networkidle' });
    await page.waitForTimeout(3000);

    // Count articles
    const articleCount = await page.locator('article').count();
    console.log(`\n✅ Articles displayed: ${articleCount}`);

    // Get header info
    const headerText = await page.textContent('header');
    console.log('Header text:', headerText?.substring(0, 100));

    // Take screenshot
    await page.screenshot({ path: 'trump-verification-after-restart.png', fullPage: true });
    console.log('Screenshot saved');

    console.log(`\n${ articleCount >= 81 ? '🎉 SUCCESS!' : '⚠️  Still not enough articles'}`);
    console.log(`Expected: 81+ articles, Got: ${articleCount} articles`);

    console.log('\nBrowser open for 30 seconds...');
    await page.waitForTimeout(30000);

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await browser.close();
  }
}

verifyFinal();
