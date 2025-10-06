import { chromium } from 'playwright';

async function testDiscoverSourcesFixed() {
  const browser = await chromium.launch({ headless: false });
  const page = await browser.newPage();

  try {
    console.log('Waiting for Netlify deploy and testing Discover Sources fix...\n');

    let deploySuccessful = false;
    const maxAttempts = 15;

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      console.log(`Attempt ${attempt}/${maxAttempts}...`);

      await page.goto('https://obscureai.netlify.app/admin/discover-sources', {
        waitUntil: 'domcontentloaded',
        timeout: 60000
      });
      await page.waitForTimeout(2000);

      // Login if needed
      const passwordInput = await page.locator('input[type="password"]').isVisible().catch(() => false);
      if (passwordInput) {
        console.log('Logging in...');
        await page.fill('input[type="password"]', '$$$Hfyj54hfmetai');
        await page.click('button:has-text("Login")');
        await page.waitForTimeout(3000);

        // Navigate to Discover Sources after login
        await page.goto('https://obscureai.netlify.app/admin/discover-sources', {
          waitUntil: 'domcontentloaded',
          timeout: 60000
        });
        await page.waitForTimeout(2000);
      }

      // Check if page loaded
      const title = await page.locator('h1:has-text("Discover New Sources")').isVisible().catch(() => false);
      if (!title) {
        console.log('⚠️ Page not loaded yet, waiting...');
        if (attempt < maxAttempts) {
          await page.waitForTimeout(30000);
        }
        continue;
      }

      console.log('✅ Page loaded');

      // Check for button
      const discoverButton = page.locator('button:has-text("Discover Sources")');
      const buttonExists = await discoverButton.isVisible().catch(() => false);

      if (!buttonExists) {
        console.log('❌ Discover button not found');
        if (attempt < maxAttempts) {
          await page.waitForTimeout(30000);
        }
        continue;
      }

      console.log('✅ Discover button found');

      // Check for topic dropdown
      const topicDropdown = await page.locator('select').count();
      if (topicDropdown === 0) {
        console.log('❌ Topic dropdown not found');
        if (attempt < maxAttempts) {
          await page.waitForTimeout(30000);
        }
        continue;
      }

      console.log('✅ Topic dropdown found');

      // Now test the actual discovery function
      console.log('\n--- Testing Discovery Function ---');
      console.log('Clicking Discover Sources button...');

      await discoverButton.click();
      await page.waitForTimeout(3000);

      // Check for error message
      const errorDiv = await page.locator('div:has-text("Discovery failed")').isVisible().catch(() => false);

      if (errorDiv) {
        console.log('❌ Discovery still failing, waiting for next deploy...');
        await page.screenshot({ path: 'temp-scripts/discover-error.png', fullPage: true });

        if (attempt < maxAttempts) {
          await page.waitForTimeout(30000);
        }
        continue;
      }

      // Check for success (either analyzing message or results)
      const analyzing = await page.locator('p:has-text("Analyzing articles")').isVisible().catch(() => false);
      const complete = await page.locator('h3:has-text("Discovery Complete")').isVisible().catch(() => false);

      if (analyzing || complete) {
        console.log('✅ Discovery function working!');

        if (analyzing) {
          console.log('⏳ Waiting for discovery to complete...');
          await page.waitForTimeout(120000); // Wait up to 2 minutes
        }

        const finalComplete = await page.locator('h3:has-text("Discovery Complete")').isVisible().catch(() => false);
        if (finalComplete) {
          console.log('✅ Discovery completed successfully!');

          const articlesAnalyzed = await page.locator('text=/Analyzed.*articles/').textContent().catch(() => null);
          const domainsFound = await page.locator('text=/Found.*potential sources/').textContent().catch(() => null);

          console.log(`\n${articlesAnalyzed || 'Articles analyzed'}`);
          console.log(`${domainsFound || 'Domains discovered'}`);
        }

        await page.screenshot({ path: 'temp-scripts/discover-success.png', fullPage: true });
        deploySuccessful = true;
        break;
      }

      console.log('⚠️ Unexpected state, retrying...');
      if (attempt < maxAttempts) {
        await page.waitForTimeout(30000);
      }
    }

    if (deploySuccessful) {
      console.log('\n🎉 SUCCESS! Discover Sources is now working!');
      console.log('\nKeeping browser open for 20 seconds...');
      await page.waitForTimeout(20000);
    } else {
      console.log('\n❌ Failed to verify deployment after all attempts');
    }

  } catch (error) {
    console.error('❌ Error:', error);
    await page.screenshot({ path: 'temp-scripts/discover-test-error.png', fullPage: true });
  } finally {
    await browser.close();
  }
}

testDiscoverSourcesFixed();
