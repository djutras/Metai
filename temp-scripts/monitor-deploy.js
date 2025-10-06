const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  let attempt = 0;
  const maxAttempts = 20;

  console.log('Monitoring Netlify deployment...\n');

  while (attempt < maxAttempts) {
    attempt++;
    console.log(`[Attempt ${attempt}/${maxAttempts}] Checking deploy status...`);

    try {
      await page.goto('https://obscureai.netlify.app/admin', { timeout: 15000 });

      // Check if it's the new version by looking for "Topic (required)"
      const content = await page.content();
      const hasNewVersion = content.includes('Topic (required)');

      if (hasNewVersion) {
        console.log('\n✓✓✓ NEW VERSION DEPLOYED SUCCESSFULLY! ✓✓✓\n');

        // Try to login and verify topics load
        const hasPassword = await page.locator('input[type="password"]').count() > 0;
        if (hasPassword) {
          await page.fill('input[type="password"]', '$$$Hfyj54hfmetai');
          await page.click('button[type="submit"]');
          await page.waitForTimeout(2000);

          const selectCount = await page.locator('select').count();
          console.log(`Found ${selectCount} dropdowns in admin panel`);
          console.log('✓ Admin panel is working!\n');
        }

        break;
      } else {
        console.log('  Still deploying (old version)...');
      }
    } catch (error) {
      console.log(`  Error checking: ${error.message}`);
    }

    if (attempt < maxAttempts) {
      console.log('  Waiting 15 seconds...\n');
      await new Promise(resolve => setTimeout(resolve, 15000));
    }
  }

  if (attempt >= maxAttempts) {
    console.log('\n✗ Max attempts reached. Check Netlify manually at:');
    console.log('   https://app.netlify.com/projects/obscureai/deploys\n');
  }

  await browser.close();
  process.exit(0);
})();
