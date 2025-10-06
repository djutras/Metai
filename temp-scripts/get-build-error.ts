import { chromium } from 'playwright';

async function getBuildError() {
  const browser = await chromium.launch({ headless: false });
  const page = await browser.newPage();

  try {
    console.log('Opening Netlify deploy page...\n');
    await page.goto('https://app.netlify.com/projects/obscureai/deploys/68e2b71613baf5000884058c', {
      waitUntil: 'domcontentloaded',
      timeout: 60000
    });

    await page.waitForTimeout(3000);

    // Click on the "Building" section to expand it
    console.log('Expanding Building section...');
    const buildingSection = page.locator('text=Building').first();
    await buildingSection.click();
    await page.waitForTimeout(2000);

    // Take screenshot
    await page.screenshot({ path: 'build-error-expanded.png', fullPage: true });
    console.log('Screenshot saved: build-error-expanded.png');

    // Try to get the error log text
    const logContent = await page.locator('pre, code, [class*="log"]').allTextContents();

    console.log('\n=== BUILD ERROR LOG ===\n');
    for (const log of logContent) {
      if (log.includes('error') || log.includes('Error') || log.includes('failed')) {
        console.log(log);
      }
    }

    // Get all text to find the error
    const bodyText = await page.textContent('body');

    // Find error lines
    const lines = bodyText?.split('\n') || [];
    const errorLines = lines.filter(line =>
      line.includes('error') ||
      line.includes('Error') ||
      line.includes('failed') ||
      line.includes('Failed')
    );

    console.log('\n=== ERROR LINES ===');
    errorLines.forEach(line => console.log(line.trim()));

    console.log('\nKeeping browser open for 30 seconds...');
    await page.waitForTimeout(30000);

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await browser.close();
  }
}

getBuildError();
