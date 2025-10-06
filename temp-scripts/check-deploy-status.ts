import { chromium } from 'playwright';

async function checkDeployStatus() {
  const browser = await chromium.launch({ headless: false });
  const page = await browser.newPage();

  try {
    console.log('Checking deploy ff811e5...\n');

    // Try to go directly to the deploy page based on the pattern
    await page.goto('https://app.netlify.com/sites/obscureai/deploys', {
      waitUntil: 'domcontentloaded',
      timeout: 60000
    });

    await page.waitForTimeout(5000);

    // Look for the ff811e5 deploy
    const deployCard = page.locator('text=/ff811e5/i').first();

    if (await deployCard.isVisible().catch(() => false)) {
      await deployCard.click();
      await page.waitForTimeout(3000);

      await page.screenshot({ path: 'temp-scripts/current-deploy.png', fullPage: true });

      const bodyText = await page.textContent('body');

      console.log('=== Deploy Status ===');

      if (bodyText?.includes('Published') || bodyText?.includes('published')) {
        console.log('✅ SUCCESS! Deploy is PUBLISHED!');
        console.log('\nThe site should now be live with all 100 Trump articles!');
      } else if (bodyText?.includes('Building') || bodyText?.includes('building') || bodyText?.includes('Starting')) {
        console.log('⏳ Deploy is still in progress...');
        console.log('Waiting 60 seconds and checking again...');

        // Wait and check again
        for (let i = 0; i < 3; i++) {
          await page.waitForTimeout(20000);
          await page.reload();
          await page.waitForTimeout(3000);

          const updatedText = await page.textContent('body');

          if (updatedText?.includes('Published')) {
            console.log('\n✅ SUCCESS! Deploy is now PUBLISHED!');
            await page.screenshot({ path: 'temp-scripts/deploy-success.png', fullPage: true });
            break;
          } else if (updatedText?.includes('Failed')) {
            console.log('\n❌ Deploy FAILED');

            // Get error details
            const buildingSection = page.locator('text=Building').first();
            if (await buildingSection.isVisible().catch(() => false)) {
              await buildingSection.click();
              await page.waitForTimeout(2000);
              await page.screenshot({ path: 'temp-scripts/deploy-failed.png', fullPage: true });
            }
            break;
          } else {
            console.log(`⏳ Still building... (check ${i + 1}/3)`);
          }
        }
      } else if (bodyText?.includes('Failed') || bodyText?.includes('failed')) {
        console.log('❌ Deploy FAILED');

        // Expand building section to see error
        const buildingSection = page.locator('text=Building').first();
        if (await buildingSection.isVisible().catch(() => false)) {
          await buildingSection.click();
          await page.waitForTimeout(2000);

          await page.screenshot({ path: 'temp-scripts/deploy-error.png', fullPage: true });

          const errorLogs = await page.textContent('pre, code');
          if (errorLogs) {
            console.log('\nError (last 500 chars):');
            console.log(errorLogs.substring(Math.max(0, errorLogs.length - 500)));
          }
        }
      }
    }

    console.log('\nKeeping browser open for 30 seconds...');
    await page.waitForTimeout(30000);

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await browser.close();
  }
}

checkDeployStatus();
