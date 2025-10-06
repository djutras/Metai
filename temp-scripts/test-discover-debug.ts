import { chromium } from 'playwright';

async function debugDiscoverSources() {
  const browser = await chromium.launch({ headless: false });
  const page = await browser.newPage();

  // Capture network requests to see the actual error
  page.on('response', async (response) => {
    if (response.url().includes('discover-sources')) {
      console.log(`\n=== Response from discover-sources ===`);
      console.log(`Status: ${response.status()}`);
      console.log(`Status Text: ${response.statusText()}`);
      try {
        const body = await response.text();
        console.log(`Body: ${body}`);
      } catch (e) {
        console.log('Could not read body');
      }
    }
  });

  try {
    console.log('Testing Discover Sources and capturing error details...\n');

    await page.goto('https://obscureai.netlify.app/admin/discover-sources', {
      waitUntil: 'domcontentloaded',
      timeout: 60000
    });
    await page.waitForTimeout(2000);

    // Login if needed
    const passwordInput = await page.locator('input[type="password"]').isVisible().catch(() => false);
    if (passwordInput) {
      console.log('Logging in...');
      await page.fill('input[type="password"]', '$$$Hfyj54hfmetai');
      await page.click('button:has-text("Login")');
      await page.waitForTimeout(3000);

      await page.goto('https://obscureai.netlify.app/admin/discover-sources', {
        waitUntil: 'domcontentloaded',
        timeout: 60000
      });
      await page.waitForTimeout(2000);
    }

    console.log('✅ Page loaded, clicking Discover Sources...');

    const discoverButton = page.locator('button:has-text("Discover Sources")');
    await discoverButton.click();

    console.log('Waiting for response...');
    await page.waitForTimeout(10000);

    // Check for error
    const errorText = await page.locator('div').filter({ hasText: 'Discovery failed' }).textContent().catch(() => null);
    if (errorText) {
      console.log(`\n❌ Error on page: ${errorText}`);
    }

    await page.screenshot({ path: 'temp-scripts/discover-debug.png', fullPage: true });

    console.log('\nKeeping browser open for 30 seconds to review...');
    await page.waitForTimeout(30000);

  } catch (error) {
    console.error('❌ Error:', error);
    await page.screenshot({ path: 'temp-scripts/discover-debug-error.png', fullPage: true });
  } finally {
    await browser.close();
  }
}

debugDiscoverSources();
