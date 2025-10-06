import { chromium } from 'playwright';

async function waitForDeploy() {
  const browser = await chromium.launch({ headless: false });
  const page = await browser.newPage();

  try {
    console.log('Opening latest deploy...\n');

    await page.goto('https://app.netlify.com/sites/obscureai/deploys', {
      waitUntil: 'domcontentloaded',
      timeout: 60000
    });

    await page.waitForTimeout(5000);

    // Click on the first deploy (most recent)
    const firstDeploy = page.locator('[data-testid="deploy-card"]').first();
    if (await firstDeploy.isVisible().catch(() => false)) {
      await firstDeploy.click();
      await page.waitForTimeout(3000);
    }

    // Poll every 15 seconds for up to 5 minutes
    const maxAttempts = 20; // 20 * 15 seconds = 5 minutes
    let attempt = 0;

    while (attempt < maxAttempts) {
      attempt++;

      await page.reload();
      await page.waitForTimeout(3000);

      const bodyText = await page.textContent('body');

      console.log(`\n[Attempt ${attempt}/${maxAttempts}]`);

      if (bodyText?.includes('Published') && !bodyText?.includes('Publishing')) {
        console.log('✅✅✅ SUCCESS! Deploy is PUBLISHED! ✅✅✅');
        await page.screenshot({ path: 'temp-scripts/deploy-success.png', fullPage: true });
        console.log('Screenshot saved: deploy-success.png');
        break;

      } else if (bodyText?.includes('Failed')) {
        console.log('❌ Deploy FAILED');

        // Click Building section to expand error
        const buildingSection = page.locator('text=Building').first();
        if (await buildingSection.isVisible().catch(() => false)) {
          await buildingSection.click();
          await page.waitForTimeout(2000);
        }

        await page.screenshot({ path: 'temp-scripts/deploy-failed-detail.png', fullPage: true });

        // Try to extract error
        const logContent = await page.locator('pre, code').allTextContents();
        for (const log of logContent) {
          if (log.includes('Error') || log.includes('error') || log.includes('Failed')) {
            const lines = log.split('\n');
            const errorLines = lines.filter(l =>
              l.includes('error') || l.includes('Error') || l.includes('Failed') || l.includes('Type error')
            );
            if (errorLines.length > 0) {
              console.log('\nError details:');
              errorLines.forEach(line => console.log(line));
            }
          }
        }

        break;

      } else if (bodyText?.includes('Building') || bodyText?.includes('Initializing') || bodyText?.includes('Starting')) {
        console.log('⏳ Deploy is still building...');
        console.log('Waiting 15 seconds before next check...');
        await page.waitForTimeout(15000);

      } else {
        console.log('� Unknown state, waiting...');
        await page.waitForTimeout(15000);
      }
    }

    if (attempt >= maxAttempts) {
      console.log('\n⏰ Timeout: Deploy took longer than 5 minutes');
    }

    console.log('\nKeeping browser open for 30 seconds...');
    await page.waitForTimeout(30000);

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await browser.close();
  }
}

waitForDeploy();
