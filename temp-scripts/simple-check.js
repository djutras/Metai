const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  console.log('Checking admin page...\n');
  await page.goto('https://obscureai.netlify.app/admin');

  const hasPassword = await page.locator('input[type="password"]').count() > 0;

  if (hasPassword) {
    await page.fill('input[type="password"]', '$$$Hfyj54hfmetai');
    await page.click('button[type="submit"]');
    await page.waitForTimeout(2000);
  }

  // Check for Topic dropdown
  const pageContent = await page.content();
  const hasTopicDropdown = pageContent.includes('Topic (required)');
  const hasOldLabel = pageContent.includes('ID_Topics');

  console.log('Status:');
  console.log(`  - Has "Topic (required)" label: ${hasTopicDropdown ? '✓ YES' : '✗ NO'}`);
  console.log(`  - Has old "ID_Topics" label: ${hasOldLabel ? '✗ YES (old version)' : '✓ NO'}`);

  if (hasTopicDropdown) {
    // Count select elements
    const selectCount = await page.locator('select').count();
    console.log(`  - Total select dropdowns: ${selectCount}`);

    console.log('\n✓ New version is deployed!');
  } else {
    console.log('\n✗ Old version still deployed - wait for Netlify build to complete');
  }

  await browser.close();
})();
