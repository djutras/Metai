const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: false });
  const page = await browser.newPage();

  console.log('Navigating to admin page...');
  await page.goto('https://obscureai.netlify.app/admin');
  await page.waitForLoadState('networkidle');

  // Enter password
  console.log('Entering password...');
  await page.fill('input[type="password"]', '$$$Hfyj54hfmetai');
  await page.click('button[type="submit"]');

  // Wait for admin panel to load
  await page.waitForTimeout(2000);

  // Scroll to the Add Source section
  console.log('Scrolling to Add Source section...');
  await page.evaluate(() => {
    const heading = Array.from(document.querySelectorAll('h2')).find(h => h.textContent.includes('Add Source'));
    if (heading) heading.scrollIntoView({ behavior: 'smooth' });
  });
  await page.waitForTimeout(1000);

  // Check the topic dropdown
  console.log('\n=== Checking Topic Dropdown ===');
  const dropdown = await page.locator('select').nth(1); // Second select (first is Type)

  // Get all options
  const options = await dropdown.locator('option').all();
  console.log(`\nFound ${options.length} options in dropdown:`);

  for (let i = 0; i < options.length; i++) {
    const text = await options[i].textContent();
    const value = await options[i].getAttribute('value');
    console.log(`  ${i + 1}. Value: "${value}" | Text: "${text}"`);
  }

  // Check if topics are being loaded
  const topicsVisible = options.length > 1;
  if (topicsVisible) {
    console.log('\n✓ Topics are visible in dropdown');
  } else {
    console.log('\n✗ No topics found in dropdown (only placeholder)');
  }

  // Keep browser open for inspection
  console.log('\nBrowser will stay open for 30 seconds for inspection...');
  await page.waitForTimeout(30000);

  await browser.close();
})();
