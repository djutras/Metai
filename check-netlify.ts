import { chromium } from '@playwright/test';

async function checkNetlifyDeploy() {
  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext();
  const page = await context.newPage();

  try {
    console.log('Navigating to Netlify deploys page...');
    await page.goto('https://app.netlify.com/projects/obscureai/deploys', { timeout: 60000 });

    // Wait for the page to load
    await page.waitForTimeout(5000);

    // Check for the most recent deploy status
    const firstDeploy = page.locator('[data-testid="deploy-card"]').first();
    const deployText = await firstDeploy.textContent().catch(() => '');
    console.log('First deploy status:', deployText?.substring(0, 200));

    // Look for failed deploy
    const failedButton = page.locator('text=Failed').first();
    const isVisible = await failedButton.isVisible({ timeout: 5000 }).catch(() => false);

    if (isVisible) {
      console.log('Found failed deploy, clicking...');
      await failedButton.click();
      await page.waitForTimeout(3000);

      // Click on "Building" section to expand it
      console.log('Looking for Building section...');
      const buildingSection = page.locator('text=Building').first();
      await buildingSection.click();
      await page.waitForTimeout(2000);

      // Take a screenshot after expanding
      await page.screenshot({ path: 'netlify-error-expanded.png', fullPage: true });
      console.log('Screenshot saved to netlify-error-expanded.png');

      // Try to get the error text
      const bodyText = await page.textContent('body');

      // Look for common error patterns
      const errorPatterns = [
        /Type error:.*?(?=\n\n|\n [0-9]|$)/gs,
        /Failed to compile.*?(?=\n\n|$)/gs,
        /Error:.*?(?=\n\n|$)/gs,
        /\.\/src\/.*?:[0-9]+:[0-9]+/g
      ];

      console.log('\n=== Searching for errors ===\n');
      for (const pattern of errorPatterns) {
        const matches = bodyText?.matchAll(pattern);
        if (matches) {
          for (const match of matches) {
            console.log(match[0]);
          }
        }
      }

    } else {
      console.log('No failed deploy found - checking current status...');
      const pageText = await page.textContent('body');
      console.log('Page status:', pageText?.substring(0, 500));
    }

    await page.waitForTimeout(5000);

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await browser.close();
  }
}

checkNetlifyDeploy();
