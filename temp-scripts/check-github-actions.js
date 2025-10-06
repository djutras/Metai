const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: false });
  const page = await browser.newPage();

  console.log('Checking GitHub Actions runs...\n');

  await page.goto('https://github.com/djutras/Metai/actions');
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(3000);

  // Get the workflow runs
  const runs = await page.evaluate(() => {
    const runElements = document.querySelectorAll('[data-testid="list-view-item"], .Box-row, [class*="run"]');
    const results = [];

    for (let i = 0; i < Math.min(5, runElements.length); i++) {
      const elem = runElements[i];
      results.push({
        text: elem.textContent?.substring(0, 300) || 'Not found',
      });
    }

    return results;
  });

  console.log('Recent workflow runs:');
  runs.forEach((run, i) => {
    console.log(`\n=== Run ${i + 1} ===`);
    console.log(run.text);
  });

  console.log('\n\nKeeping browser open for 60 seconds for manual inspection...');
  await page.waitForTimeout(60000);

  await browser.close();
})();
