import { test, expect } from '@playwright/test';

test.describe('Monitor obscureai.netlify.app deployment', () => {
  test('should check if site is accessible and working', async ({ page }) => {
    test.setTimeout(120000); // 2 minutes timeout

    let attempts = 0;
    const maxAttempts = 20;
    let siteWorking = false;

    while (attempts < maxAttempts && !siteWorking) {
      try {
        console.log(`Attempt ${attempts + 1}/${maxAttempts}: Checking obscureai.netlify.app...`);

        const response = await page.goto('https://obscureai.netlify.app', {
          waitUntil: 'networkidle',
          timeout: 30000,
        });

        if (response && response.ok()) {
          console.log(`✅ Site is up! Status: ${response.status()}`);

          // Check for common error messages
          const pageContent = await page.textContent('body');

          if (pageContent?.includes('Page Not Found') ||
              pageContent?.includes('404') ||
              pageContent?.includes('Error')) {
            console.log('⚠️  Site loaded but shows error page');
            attempts++;
            await page.waitForTimeout(10000); // Wait 10 seconds
            continue;
          }

          // Site is working!
          console.log('✅ Site is fully operational!');
          siteWorking = true;

          // Take screenshot
          await page.screenshot({ path: 'site-working.png' });

        } else {
          console.log(`❌ Site returned status: ${response?.status()}`);
          attempts++;
          await page.waitForTimeout(10000);
        }
      } catch (error) {
        console.log(`❌ Error accessing site: ${error instanceof Error ? error.message : 'Unknown'}`);
        attempts++;

        if (attempts < maxAttempts) {
          console.log(`Waiting 10 seconds before retry...`);
          await page.waitForTimeout(10000);
        }
      }
    }

    expect(siteWorking).toBe(true);
  });
});
