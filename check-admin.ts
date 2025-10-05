import { chromium } from '@playwright/test';

async function checkAdmin() {
  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext();
  const page = await context.newPage();

  try {
    console.log('Checking main site...');
    await page.goto('https://obscureai.netlify.app/', { timeout: 30000 });

    // Clear cache and reload
    await context.clearCookies();
    await page.reload({ waitUntil: 'networkidle' });
    await page.waitForTimeout(2000);

    console.log('\nAttempting to navigate to /admin...');
    await page.goto('https://obscureai.netlify.app/admin', { timeout: 30000, waitUntil: 'networkidle' });
    await page.waitForTimeout(3000);

    const pageTitle = await page.title();
    const bodyText = await page.textContent('body');

    console.log('Page title:', pageTitle);
    console.log('\nPage content (first 500 chars):');
    console.log(bodyText?.substring(0, 500));

    // Take screenshot
    await page.screenshot({ path: 'admin-page.png', fullPage: true });
    console.log('\nScreenshot saved to admin-page.png');

    // Check if admin page exists
    if (bodyText?.includes('Admin') || bodyText?.includes('password') || bodyText?.includes('Password')) {
      console.log('\n✅ Admin page found!');
    } else {
      console.log('\n⚠️  Admin page not found or not accessible');
    }

    await page.waitForTimeout(5000);

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await browser.close();
  }
}

checkAdmin();
