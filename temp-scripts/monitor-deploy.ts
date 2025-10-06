import { chromium } from 'playwright';

async function monitorDeploy() {
  const browser = await chromium.launch({ headless: false });
  const page = await browser.newPage();

  try {
    console.log('Opening Netlify deploys page...\n');
    await page.goto('https://app.netlify.com/sites/obscureai/deploys', {
      waitUntil: 'domcontentloaded',
      timeout: 60000
    });

    await page.waitForTimeout(5000);

    // Take screenshot
    await page.screenshot({ path: 'temp-scripts/deploys-list.png', fullPage: true });
    console.log('Screenshot saved');

    // Get the first deploy (most recent)
    const firstDeploy = page.locator('[data-testid="deploy-card"]').first();

    if (await firstDeploy.isVisible().catch(() => false)) {
      const deployText = await firstDeploy.textContent();
      console.log('\n=== Most Recent Deploy ===');
      console.log(deployText?.substring(0, 300));

      // Click to view details
      await firstDeploy.click();
      await page.waitForTimeout(3000);

      await page.screenshot({ path: 'temp-scripts/deploy-details.png', fullPage: true });

      // Check status
      const bodyText = await page.textContent('body');

      if (bodyText?.includes('Published') || bodyText?.includes('published')) {
        console.log('\n✅ Deploy is PUBLISHED!');
      } else if (bodyText?.includes('Building') || bodyText?.includes('building')) {
        console.log('\n⏳ Deploy is still building...');
        console.log('Waiting 30 seconds and checking again...');

        await page.waitForTimeout(30000);
        await page.reload();
        await page.waitForTimeout(3000);

        const updatedText = await page.textContent('body');
        if (updatedText?.includes('Published')) {
          console.log('✅ Deploy is now PUBLISHED!');
        } else if (updatedText?.includes('Failed')) {
          console.log('❌ Deploy failed');
        } else {
          console.log('⏳ Still building...');
        }
      } else if (bodyText?.includes('Failed') || bodyText?.includes('failed')) {
        console.log('\n❌ Deploy FAILED');

        // Click on Building section to see error
        const buildingSection = page.locator('text=Building').first();
        if (await buildingSection.isVisible().catch(() => false)) {
          await buildingSection.click();
          await page.waitForTimeout(2000);

          const logText = await page.textContent('pre, code');
          if (logText) {
            console.log('\nError log (last 500 chars):');
            console.log(logText.substring(Math.max(0, logText.length - 500)));
          }
        }
      }
    }

    console.log('\nKeeping browser open for 60 seconds...');
    await page.waitForTimeout(60000);

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await browser.close();
  }
}

monitorDeploy();
