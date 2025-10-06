import { chromium } from 'playwright';

async function verifyDiscoverSources() {
  const browser = await chromium.launch({ headless: false });
  const page = await browser.newPage();

  try {
    console.log('Waiting for deploy and verifying Discover Sources page...\n');

    let verified = false;
    const maxAttempts = 10;

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      console.log(`Attempt ${attempt}/${maxAttempts}...`);

      // Go to admin page
      await page.goto('https://obscureai.netlify.app/admin', {
        waitUntil: 'domcontentloaded',
        timeout: 60000
      });
      await page.waitForTimeout(2000);

      // Login if needed
      const passwordInput = await page.locator('input[type="password"]').isVisible().catch(() => false);
      if (passwordInput) {
        await page.fill('input[type="password"]', '$$$Hfyj54hfmetai');
        await page.click('button:has-text("Login")');
        await page.waitForTimeout(3000);
      }

      // Check if Discover Sources link exists
      const discoverLink = page.locator('a:has-text("Discover Sources")');
      const linkExists = await discoverLink.isVisible().catch(() => false);

      if (linkExists) {
        console.log('✅ DEPLOYED! Discover Sources link found');

        // Click link
        await discoverLink.click();
        await page.waitForTimeout(3000);

        // Verify page loaded
        const pageTitle = await page.locator('h1').textContent();
        console.log(`Page title: ${pageTitle}`);

        // Check for topic dropdown
        const dropdown = await page.locator('select').count();
        console.log(`Dropdowns found: ${dropdown}`);

        // Check for Discover button
        const discoverButton = page.locator('button:has-text("Discover Sources")');
        const buttonExists = await discoverButton.isVisible().catch(() => false);

        if (buttonExists) {
          console.log('✅ Page fully loaded with dropdown and button');

          await page.screenshot({ path: 'temp-scripts/discover-sources-page.png', fullPage: true });
          console.log('📸 Screenshot saved: discover-sources-page.png');

          verified = true;
          break;
        }
      } else {
        console.log('⚠️ Discover Sources link not found yet');
      }

      if (attempt < maxAttempts && !verified) {
        console.log('Waiting 30 seconds...\n');
        await page.waitForTimeout(30000);
      }
    }

    if (verified) {
      console.log('\n🎉 SUCCESS! Discover Sources feature is live!');
      console.log('\nKeeping browser open for 20 seconds...');
      await page.waitForTimeout(20000);
    } else {
      console.log('❌ Could not verify deployment');
    }

  } catch (error) {
    console.error('❌ Error:', error);
    await page.screenshot({ path: 'temp-scripts/verify-discover-error.png', fullPage: true });
  } finally {
    await browser.close();
  }
}

verifyDiscoverSources();
