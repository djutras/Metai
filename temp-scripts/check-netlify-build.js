const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: false });
  const page = await browser.newPage();

  console.log('Checking Netlify deploy status...\n');

  await page.goto('https://app.netlify.com/projects/obscureai/deploys');
  await page.waitForLoadState('networkidle');

  // Check for latest deploy status
  await page.waitForTimeout(2000);

  // Get the first deploy item
  const deployStatus = await page.evaluate(() => {
    const statusElements = document.querySelectorAll('[class*="status"], [data-test*="status"]');
    const firstDeploy = document.querySelector('[class*="deploy-card"], [class*="Deploy"]');

    return {
      text: firstDeploy?.textContent?.substring(0, 200) || 'Not found',
      hasPublished: firstDeploy?.textContent?.includes('Published') || false,
      hasFailed: firstDeploy?.textContent?.includes('Failed') || false,
      hasBuilding: firstDeploy?.textContent?.includes('building') || firstDeploy?.textContent?.includes('Building') || false,
    };
  });

  console.log('Latest deploy status:');
  console.log(deployStatus);

  if (deployStatus.hasPublished) {
    console.log('\n✓ Latest deploy is PUBLISHED!');
  } else if (deployStatus.hasFailed) {
    console.log('\n✗ Latest deploy FAILED! Check the logs.');
  } else if (deployStatus.hasBuilding) {
    console.log('\n⏳ Deploy is still BUILDING...');
  }

  console.log('\nKeeping browser open for 60 seconds for manual inspection...');
  await page.waitForTimeout(60000);

  await browser.close();
})();
