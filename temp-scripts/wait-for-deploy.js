const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: false });
  const page = await browser.newPage();

  let attempt = 0;
  const maxAttempts = 10;

  while (attempt < maxAttempts) {
    attempt++;
    console.log(`\n=== Attempt ${attempt}/${maxAttempts} ===`);
    console.log('Checking https://obscureai.netlify.app/admin...');

    await page.goto('https://obscureai.netlify.app/admin', { waitUntil: 'networkidle' });

    // Login
    await page.fill('input[type="password"]', '$$$Hfyj54hfmetai');
    await page.click('button[type="submit"]');
    await page.waitForTimeout(3000);

    // Check if topics dropdown exists
    const topicDropdownExists = await page.evaluate(() => {
      const labels = Array.from(document.querySelectorAll('label'));
      const topicLabel = labels.find(l => l.textContent.includes('Topic (required)'));
      return !!topicLabel;
    });

    if (topicDropdownExists) {
      console.log('✓ Topic dropdown found!');

      // Check topics in dropdown
      const topicsCount = await page.evaluate(() => {
        const labels = Array.from(document.querySelectorAll('label'));
        const topicLabel = labels.find(l => l.textContent.includes('Topic (required)'));
        const select = topicLabel?.nextElementSibling;
        return select?.querySelectorAll('option').length || 0;
      });

      console.log(`Found ${topicsCount} options in topic dropdown`);

      if (topicsCount > 1) {
        console.log('\n✓✓✓ DEPLOYMENT SUCCESSFUL! ✓✓✓');
        console.log('Topic dropdown is working with topics loaded.\n');
        break;
      } else {
        console.log('Topic dropdown exists but no topics loaded yet...');
      }
    } else {
      console.log('✗ Topic dropdown not found - old version still deployed');
    }

    if (attempt < maxAttempts) {
      console.log('Waiting 10 seconds before retry...');
      await page.waitForTimeout(10000);
      await page.reload();
    }
  }

  if (attempt >= maxAttempts) {
    console.log('\n✗ Max attempts reached. Deployment may still be in progress.');
  }

  console.log('\nClosing in 5 seconds...');
  await page.waitForTimeout(5000);
  await browser.close();
})();
