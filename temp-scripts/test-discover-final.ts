import { chromium } from 'playwright';

async function testDiscoverFinal() {
  const browser = await chromium.launch({ headless: false });
  const page = await browser.newPage();

  let lastStatus = 0;
  page.on('response', async (response) => {
    if (response.url().includes('discover-sources') && response.request().method() === 'POST') {
      lastStatus = response.status();
      console.log(`\n>>> Response status: ${lastStatus}`);
      if (lastStatus !== 200) {
        try {
          const body = await response.text();
          console.log(`>>> Body: ${body.substring(0, 200)}`);
        } catch (e) {}
      }
    }
  });

  try {
    console.log('Testing final timeout fix (3 articles, no crawlability tests)...\n');

    let success = false;
    for (let attempt = 1; attempt <= 20; attempt++) {
      console.log(`\n=== Attempt ${attempt}/20 ===`);

      await page.goto('https://obscureai.netlify.app/admin/discover-sources', {
        waitUntil: 'domcontentloaded',
        timeout: 60000
      });
      await page.waitForTimeout(2000);

      const passwordInput = await page.locator('input[type="password"]').isVisible().catch(() => false);
      if (passwordInput) {
        await page.fill('input[type="password"]', '$$$Hfyj54hfmetai');
        await page.click('button:has-text("Login")');
        await page.waitForTimeout(3000);
        await page.goto('https://obscureai.netlify.app/admin/discover-sources', {
          waitUntil: 'domcontentloaded'
        });
        await page.waitForTimeout(2000);
      }

      console.log('Clicking Discover...');
      lastStatus = 0;

      await page.click('button:has-text("Discover Sources")');
      await page.waitForTimeout(12000);

      if (lastStatus === 504) {
        console.log('❌ Still 504, waiting for deploy...');
        if (attempt < 20) {
          await page.waitForTimeout(30000);
        }
        continue;
      }

      if (lastStatus === 200) {
        console.log('✅ Got 200 response!');

        const complete = await page.locator('h3:has-text("Discovery Complete")').isVisible().catch(() => false);
        const error = await page.locator('div:has-text("Discovery failed")').isVisible().catch(() => false);

        if (complete) {
          console.log('🎉 SUCCESS! Discovery works!');
          const stats = await page.locator('div:has(h3)').textContent().catch(() => '');
          console.log(stats);
          await page.screenshot({ path: 'temp-scripts/discover-success-final.png', fullPage: true });
          success = true;
          break;
        } else if (error) {
          console.log('⚠️ Got error, checking details...');
          const errorText = await page.locator('div').filter({ hasText: 'Discovery failed' }).textContent().catch(() => '');
          console.log(errorText);
          await page.screenshot({ path: 'temp-scripts/discover-error-details.png', fullPage: true });
        }
      }

      if (attempt < 20) {
        console.log('Waiting 30s...');
        await page.waitForTimeout(30000);
      }
    }

    if (success) {
      console.log('\n✅ FINAL FIX WORKS!\n');
      await page.waitForTimeout(20000);
    } else {
      console.log(`\n❌ Failed - Last status: ${lastStatus}\n`);
    }

  } catch (error) {
    console.error('Error:', error);
    await page.screenshot({ path: 'temp-scripts/discover-crash.png', fullPage: true });
  } finally {
    await browser.close();
  }
}

testDiscoverFinal();
