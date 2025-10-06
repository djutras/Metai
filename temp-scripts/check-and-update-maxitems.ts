import { chromium } from 'playwright';

async function checkAndUpdateMaxItems() {
  const browser = await chromium.launch({ headless: false });
  const page = await browser.newPage();

  try {
    // First, let's check the current Trump topic page to see the count
    console.log('Checking Trump topic page...');
    await page.goto('http://localhost:3001/Trump?filter=all', { waitUntil: 'networkidle' });
    await page.waitForTimeout(2000);

    const articleCountText = await page.textContent('body');
    console.log('Page shows:', articleCountText?.match(/\d+ articles?/)?.[0]);

    // Now let's check if there's an admin page or API to update maxItems
    console.log('\nNavigating to admin page...');
    await page.goto('http://localhost:3001/admin', { waitUntil: 'networkidle' });
    await page.waitForTimeout(2000);

    // Take screenshot of admin page
    await page.screenshot({ path: 'admin-page.png', fullPage: true });
    console.log('Admin page screenshot saved');

    // Try to find and update the Trump topic
    const trumpTopicExists = await page.locator('text=/Trump/i').first().isVisible().catch(() => false);
    if (trumpTopicExists) {
      console.log('\nFound Trump topic in admin, attempting to update maxItems...');

      // Look for edit button or maxItems field
      const editButton = await page.locator('button:has-text("Edit"), a:has-text("Edit")').first().isVisible().catch(() => false);
      if (editButton) {
        await page.locator('button:has-text("Edit"), a:has-text("Edit")').first().click();
        await page.waitForTimeout(1000);

        // Look for maxItems input
        const maxItemsInput = await page.locator('input[type="number"]').first();
        const currentValue = await maxItemsInput.inputValue();
        console.log('Current maxItems value:', currentValue);

        // Update to 100 to ensure we get all 81 articles
        await maxItemsInput.fill('100');
        console.log('Updated maxItems to 100');

        // Save
        await page.locator('button:has-text("Save"), button[type="submit"]').first().click();
        await page.waitForTimeout(2000);
        console.log('Saved changes');
      }
    }

    console.log('\nBrowser will stay open for 30 seconds...');
    await page.waitForTimeout(30000);

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await browser.close();
  }
}

checkAndUpdateMaxItems();
