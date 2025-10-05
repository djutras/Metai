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
  await page.waitForTimeout(3000);

  // Check all select elements
  console.log('\n=== All Select Elements ===');
  const selects = await page.locator('select').all();
  console.log(`Found ${selects.length} select dropdowns\n`);

  for (let i = 0; i < selects.length; i++) {
    const label = await page.evaluate((idx) => {
      const selects = document.querySelectorAll('select');
      const select = selects[idx];
      const parent = select.closest('div');
      const label = parent?.querySelector('label');
      return label?.textContent || 'No label';
    }, i);

    console.log(`Select ${i + 1}: ${label}`);

    const options = await selects[i].locator('option').all();
    for (let j = 0; j < options.length; j++) {
      const text = await options[j].textContent();
      const value = await options[j].getAttribute('value');
      console.log(`  - Value: "${value}" | Text: "${text}"`);
    }
    console.log('');
  }

  // Check for JavaScript errors
  console.log('=== Checking for errors ===');
  page.on('console', msg => {
    if (msg.type() === 'error') {
      console.log('Browser error:', msg.text());
    }
  });

  // Wait to see the page
  console.log('Keeping browser open for 30 seconds...');
  await page.waitForTimeout(30000);

  await browser.close();
})();
