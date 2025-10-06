import { chromium } from 'playwright';

async function updateTrumpMaxItems() {
  const browser = await chromium.launch({ headless: false });
  const page = await browser.newPage();

  try {
    console.log('Logging into admin panel...');
    await page.goto('http://localhost:3001/admin', { waitUntil: 'networkidle' });
    await page.waitForTimeout(1000);

    // Enter password
    await page.fill('input[type="password"]', '$$$Hfyj54hfmetai');
    await page.click('button:has-text("Login")');
    await page.waitForTimeout(2000);

    console.log('Logged in successfully');

    // Take screenshot of admin dashboard
    await page.screenshot({ path: 'admin-dashboard.png', fullPage: true });
    console.log('Admin dashboard screenshot saved');

    // Find the Trump topic and click edit
    const trumpRow = page.locator('tr:has-text("Trump")').first();
    const isVisible = await trumpRow.isVisible().catch(() => false);

    if (isVisible) {
      console.log('\nFound Trump topic');

      // Click edit button for Trump topic
      await trumpRow.locator('button:has-text("Edit"), a:has-text("Edit")').click();
      await page.waitForTimeout(1000);

      // Find maxItems input field
      const maxItemsInput = page.locator('input[type="number"]').last(); // Usually the last number input
      const currentValue = await maxItemsInput.inputValue();
      console.log('Current maxItems:', currentValue);

      // Update to 100
      await maxItemsInput.fill('100');
      console.log('Updated maxItems to 100');

      // Click save
      await page.locator('button:has-text("Save"), button[type="submit"]').click();
      await page.waitForTimeout(2000);
      console.log('Changes saved!');

      // Navigate to Trump page to verify
      console.log('\nNavigating to Trump page to verify...');
      await page.goto('http://localhost:3001/Trump?filter=all', { waitUntil: 'networkidle' });
      await page.waitForTimeout(2000);

      const articleCount = await page.locator('article').count();
      console.log('Articles now showing:', articleCount);

      // Take final screenshot
      await page.screenshot({ path: 'trump-after-update.png', fullPage: true });
      console.log('Final screenshot saved');
    } else {
      console.log('Could not find Trump topic in admin');
      const bodyText = await page.textContent('body');
      console.log('Page content:', bodyText?.substring(0, 500));
    }

    console.log('\nBrowser will stay open for 30 seconds...');
    await page.waitForTimeout(30000);

  } catch (error) {
    console.error('Error:', error);
    await page.screenshot({ path: 'error-screenshot.png', fullPage: true });
  } finally {
    await browser.close();
  }
}

updateTrumpMaxItems();
