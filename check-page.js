const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();

  await page.goto('http://localhost:8888');
  await page.waitForLoadState('networkidle');

  const title = await page.title();
  const h1 = await page.locator('h1').first().textContent().catch(() => 'No h1 found');
  const bodyText = await page.locator('body').textContent();

  console.log('=== PAGE INFO ===');
  console.log('Title:', title);
  console.log('H1:', h1);
  console.log('\n=== BODY TEXT (first 500 chars) ===');
  console.log(bodyText.substring(0, 500));

  await browser.close();
})();
