import 'dotenv/config';
import { chromium } from 'playwright';

async function main() {
  console.log('=== Debugging Trump Page ===\n');

  const browser = await chromium.launch({ headless: false });
  const page = await browser.newPage();

  try {
    console.log('Navigating to http://localhost:3006/Trump?filter=all...');
    await page.goto('http://localhost:3006/Trump?filter=all', { waitUntil: 'domcontentloaded', timeout: 10000 });

    // Wait a bit for rendering
    await page.waitForTimeout(2000);

    // Get page HTML
    const html = await page.content();
    console.log('\nPage HTML length:', html.length);

    // Check for error messages
    const bodyText = await page.textContent('body');
    console.log('\nBody text:', bodyText?.substring(0, 500));

    // Check if there's an error
    if (bodyText?.includes('Error') || bodyText?.includes('error')) {
      console.log('\n❌ Page has error!');
    }

    // Check network requests
    console.log('\nWaiting for network to be idle...');
    await page.waitForLoadState('networkidle', { timeout: 5000 });

    // Take screenshot
    await page.screenshot({ path: 'debug-screenshot.png', fullPage: true });
    console.log('Screenshot saved to debug-screenshot.png');

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await browser.close();
  }
}

main().catch(console.error);
