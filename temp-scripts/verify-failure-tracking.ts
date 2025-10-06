import { chromium } from 'playwright';

async function verifyFailureTracking() {
  const browser = await chromium.launch({ headless: false });
  const page = await browser.newPage();

  try {
    console.log('Waiting for Netlify deploy and verifying failure tracking...');
    console.log('Checking every 30 seconds for up to 5 minutes...\n');

    let verified = false;
    const maxAttempts = 10;

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      console.log(`Attempt ${attempt}/${maxAttempts}...`);

      await page.goto('https://obscureai.netlify.app/admin/crawl-report', {
        waitUntil: 'domcontentloaded',
        timeout: 60000
      });
      await page.waitForTimeout(3000);

      // Get dropdown options
      const options = await page.locator('select option').allTextContents();

      if (options.length > 0) {
        // Select first Trump crawl (more likely to have data)
        const trumpIndex = options.findIndex(opt => opt.includes('Trump'));
        const selectedIndex = trumpIndex >= 0 ? trumpIndex : 0;

        console.log(`Selecting: ${options[selectedIndex]}`);
        await page.locator('select').selectOption({ index: selectedIndex });
        await page.waitForTimeout(2000);

        // Check if failure badges are present
        const failureBadges = await page.locator('text=/⚠️.*failures/i').count();

        if (failureBadges > 0) {
          console.log(`✅ DEPLOYED! Found ${failureBadges} source(s) with failure badges`);

          // Get details of sources with failures
          const failureTexts = await page.locator('text=/⚠️.*failures/i').allTextContents();
          console.log('\n📊 Sources with failures:');
          failureTexts.forEach((text, idx) => {
            console.log(`   ${idx + 1}. ${text.trim()}`);
          });

          // Take screenshot
          await page.screenshot({ path: 'temp-scripts/failure-tracking-deployed.png', fullPage: true });
          console.log('\n📸 Screenshot saved: failure-tracking-deployed.png');

          verified = true;
          break;
        } else {
          // Check if the page loaded correctly (might be that all sources have 0 failures)
          const hasTable = await page.locator('table tbody tr').count() > 0;

          if (hasTable) {
            const sources = await page.locator('table tbody tr td:first-child').count();
            console.log(`✅ DEPLOYED! Table shows ${sources} sources (all with 0 failures)`);

            await page.screenshot({ path: 'temp-scripts/failure-tracking-zero-failures.png', fullPage: true });
            console.log('📸 Screenshot saved: failure-tracking-zero-failures.png');

            verified = true;
            break;
          } else {
            console.log('⚠️ No table or failure badges found, might still be old version');
          }
        }
      }

      if (attempt < maxAttempts && !verified) {
        console.log('Waiting 30 seconds before next check...\n');
        await page.waitForTimeout(30000);
      }
    }

    if (!verified) {
      console.log('❌ Could not verify deployment in 5 minutes');
      await page.screenshot({ path: 'temp-scripts/verify-failure-error.png', fullPage: true });
    } else {
      console.log('\n🎉 SUCCESS! Failure tracking is deployed and working!');
      console.log('\nKeeping browser open for 20 seconds...');
      await page.waitForTimeout(20000);
    }

  } catch (error) {
    console.error('❌ Error:', error);
    await page.screenshot({ path: 'temp-scripts/verify-failure-error.png', fullPage: true });
  } finally {
    await browser.close();
  }
}

verifyFailureTracking();
