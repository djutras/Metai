import { chromium } from 'playwright';

async function fixNetlifyDeploy() {
  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext();
  const page = await context.newPage();

  try {
    console.log('Opening Netlify deploy page...\n');
    await page.goto('https://app.netlify.com/projects/obscureai/deploys/68e2b71613baf5000884058c', {
      waitUntil: 'domcontentloaded',
      timeout: 60000
    });

    await page.waitForTimeout(5000);

    // Take screenshot to see current state
    await page.screenshot({ path: 'netlify-deploy-page.png', fullPage: true });
    console.log('Screenshot saved: netlify-deploy-page.png');

    // Check if we need to log in
    const loginDetected = await page.locator('input[type="email"], input[type="password"]').count() > 0;

    if (loginDetected) {
      console.log('\n⚠️  Login required. Please log in manually.');
      console.log('Keeping browser open for manual login...');
      await page.waitForTimeout(60000); // Wait 1 minute for manual login

      // After login, navigate back to deploy page
      await page.goto('https://app.netlify.com/projects/obscureai/deploys/68e2b71613baf5000884058c', {
        waitUntil: 'networkidle'
      });
      await page.waitForTimeout(3000);
    }

    // Get page content to analyze the deploy status
    const pageText = await page.textContent('body');
    console.log('\n=== Deploy Status ===');

    // Check for common deploy states
    if (pageText?.includes('Failed') || pageText?.includes('failed')) {
      console.log('❌ Deploy failed');

      // Look for error messages
      const errorSection = await page.locator('[class*="error"], [class*="Error"]').first();
      if (await errorSection.isVisible().catch(() => false)) {
        const errorText = await errorSection.textContent();
        console.log('\nError details:', errorText?.substring(0, 500));
      }

      // Try to find retry button
      const retryButton = page.locator('button:has-text("Retry"), button:has-text("retry"), button:has-text("Redeploy")');
      const retryExists = await retryButton.count() > 0;

      if (retryExists) {
        console.log('\n🔄 Found retry button, clicking...');
        await retryButton.first().click();
        await page.waitForTimeout(3000);
        console.log('Deploy retry triggered');
      }

    } else if (pageText?.includes('Building') || pageText?.includes('building')) {
      console.log('⏳ Deploy is currently building...');

    } else if (pageText?.includes('Published') || pageText?.includes('published')) {
      console.log('✅ Deploy is published and live!');

    } else if (pageText?.includes('Queued') || pageText?.includes('queued')) {
      console.log('⏳ Deploy is queued...');
    }

    // Get deploy logs
    console.log('\n=== Checking for deploy logs ===');
    const logsButton = page.locator('button:has-text("Deploy log"), a:has-text("Deploy log"), [class*="log"]').first();
    if (await logsButton.isVisible().catch(() => false)) {
      console.log('Found deploy logs button, clicking...');
      await logsButton.click();
      await page.waitForTimeout(2000);

      const logText = await page.textContent('pre, code, [class*="log"]');
      if (logText) {
        console.log('\nRecent log output (last 1000 chars):');
        console.log(logText.substring(Math.max(0, logText.length - 1000)));
      }
    }

    // Take final screenshot
    await page.screenshot({ path: 'netlify-deploy-final.png', fullPage: true });
    console.log('\nFinal screenshot saved: netlify-deploy-final.png');

    console.log('\nKeeping browser open for 60 seconds for manual inspection...');
    await page.waitForTimeout(60000);

  } catch (error) {
    console.error('Error:', error);
    await page.screenshot({ path: 'netlify-error.png', fullPage: true });
  } finally {
    await browser.close();
  }
}

fixNetlifyDeploy();
