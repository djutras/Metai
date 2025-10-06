import { chromium } from '@playwright/test';

async function checkSite() {
  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext();
  const page = await context.newPage();

  try {
    console.log('Navigating to https://obscureai.netlify.app/...');
    await page.goto('https://obscureai.netlify.app/', { timeout: 30000 });

    await page.waitForTimeout(3000);

    // Take a screenshot
    await page.screenshot({ path: 'site-screenshot.png', fullPage: true });
    console.log('Screenshot saved to site-screenshot.png');

    // Get page title
    const title = await page.title();
    console.log('Page title:', title);

    // Get page content summary
    const bodyText = await page.textContent('body');
    console.log('\n=== Page Content (first 1000 chars) ===\n');
    console.log(bodyText?.substring(0, 1000));

    // Check for any error messages
    const hasError = bodyText?.toLowerCase().includes('error') ||
                     bodyText?.toLowerCase().includes('404') ||
                     bodyText?.toLowerCase().includes('not found');

    if (hasError) {
      console.log('\n⚠️  Possible error detected on page');
    } else {
      console.log('\n✅ Site appears to be working');
    }

    await page.waitForTimeout(5000);

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await browser.close();
  }
}

checkSite();
