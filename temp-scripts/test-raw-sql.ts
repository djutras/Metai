import { chromium } from 'playwright';

async function test() {
  const browser = await chromium.launch({ headless: false });
  const page = await browser.newPage();

  try {
    await page.goto('http://localhost:3001/Trump?filter=all', { waitUntil: 'networkidle' });
    await page.waitForTimeout(2000);

    console.log('Check the dev server console for raw SQL output');
    console.log('Keeping browser open...');
    await page.waitForTimeout(30000);

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await browser.close();
  }
}

test();
