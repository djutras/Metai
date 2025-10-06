import { chromium } from 'playwright';

async function testDiscoverTimeoutFix() {
  const browser = await chromium.launch({ headless: false });
  const page = await browser.newPage();

  // Capture network responses
  let lastResponseStatus = 0;
  let lastResponseBody = '';

  page.on('response', async (response) => {
    if (response.url().includes('discover-sources') && response.request().method() === 'POST') {
      lastResponseStatus = response.status();
      try {
        lastResponseBody = await response.text();
        console.log(`\n=== discover-sources Response ===`);
        console.log(`Status: ${lastResponseStatus}`);
        if (lastResponseStatus !== 200) {
          console.log(`Body: ${lastResponseBody}`);
        }
      } catch (e) {
        console.log('Could not read response body');
      }
    }
  });

  try {
    console.log('Waiting for deployment and testing timeout fix...\n');

    let success = false;
    const maxAttempts = 15;

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      console.log(`\n=== Attempt ${attempt}/${maxAttempts} ===`);

      lastResponseStatus = 0;
      lastResponseBody = '';

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

        await page.goto('https://obscureai.netlify.app/admin/discover-sources', {
          waitUntil: 'domcontentloaded',
          timeout: 60000
        });
        await page.waitForTimeout(2000);
      }

      console.log('Clicking Discover Sources button...');
      const discoverButton = page.locator('button:has-text("Discover Sources")');
      await discoverButton.click();

      // Wait for response
      await page.waitForTimeout(15000);

      if (lastResponseStatus === 504) {
        console.log('❌ Still timing out (504), waiting for next deploy...');
        await page.screenshot({ path: 'temp-scripts/discover-timeout.png', fullPage: true });

        if (attempt < maxAttempts) {
          console.log('Waiting 30 seconds before retry...');
          await page.waitForTimeout(30000);
        }
        continue;
      }

      if (lastResponseStatus === 200) {
        console.log('✅ Function returned 200 - checking results...');

        // Check for success message
        const completeMsg = await page.locator('h3:has-text("Discovery Complete")').isVisible().catch(() => false);
        const analyzingMsg = await page.locator('p:has-text("Analyzing articles")').isVisible().catch(() => false);

        if (completeMsg) {
          console.log('✅ Discovery completed successfully!');

          const stats = await page.locator('div:has(h3:has-text("Discovery Complete"))').textContent().catch(() => '');
          console.log(`\nResults:\n${stats}`);

          await page.screenshot({ path: 'temp-scripts/discover-working.png', fullPage: true });
          success = true;
          break;
        } else if (analyzingMsg) {
          console.log('⏳ Still processing, waiting...');
          await page.waitForTimeout(10000);

          const completeMsg2 = await page.locator('h3:has-text("Discovery Complete")').isVisible().catch(() => false);
          if (completeMsg2) {
            console.log('✅ Discovery completed!');
            await page.screenshot({ path: 'temp-scripts/discover-working.png', fullPage: true });
            success = true;
            break;
          }
        } else {
          // Check for error
          const errorMsg = await page.locator('div:has-text("Discovery failed")').textContent().catch(() => null);
          if (errorMsg) {
            console.log(`⚠️ Got 200 but with error: ${errorMsg}`);
            await page.screenshot({ path: 'temp-scripts/discover-error-200.png', fullPage: true });
          }
        }
      }

      if (attempt < maxAttempts && !success) {
        console.log('Waiting 30 seconds before retry...');
        await page.waitForTimeout(30000);
      }
    }

    if (success) {
      console.log('\n🎉 SUCCESS! Discover Sources is working without timeout!');
      console.log('\nKeeping browser open for 20 seconds...');
      await page.waitForTimeout(20000);
    } else {
      console.log('\n❌ Could not verify fix after all attempts');
      console.log(`Last status: ${lastResponseStatus}`);
    }

  } catch (error) {
    console.error('❌ Error:', error);
    await page.screenshot({ path: 'temp-scripts/discover-test-error.png', fullPage: true });
  } finally {
    await browser.close();
  }
}

testDiscoverTimeoutFix();
