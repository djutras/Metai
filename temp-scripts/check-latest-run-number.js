const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: false });
  const page = await browser.newPage();

  await page.goto('https://github.com/djutras/Metai/actions/workflows/crawl-topics.yml');
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(3000);

  const runs = await page.evaluate(() => {
    const runElements = Array.from(document.querySelectorAll('a[href*="/actions/runs/"]'));
    const results = [];

    runElements.forEach((elem, i) => {
      if (i < 5) {
        const parent = elem.closest('.Box-row, [data-testid="list-view-item"]');
        const text = parent ? parent.textContent?.replace(/\s+/g, ' ').trim() : '';

        // Extract run number
        const match = text.match(/#(\d+)/);
        const runNumber = match ? match[1] : 'unknown';

        results.push({
          runNumber,
          url: elem.href,
          info: text.substring(0, 150),
        });
      }
    });

    return results;
  });

  console.log(`\nFound ${runs.length} recent runs:\n`);

  runs.forEach(run => {
    console.log(`Run #${run.runNumber}`);
    console.log(`URL: ${run.url}`);
    console.log(`Info: ${run.info}`);
    console.log('');
  });

  // Click on the first (latest) run
  if (runs.length > 0) {
    console.log(`\nNavigating to latest run #${runs[0].runNumber}...`);
    await page.goto(runs[0].url);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    // Check if it has our updated code (check commit hash)
    const commitInfo = await page.evaluate(() => {
      const body = document.body.textContent || '';
      const hasA3fb6f8 = body.includes('a3fb6f8'); // Latest commit
      const hasC75fc5c = body.includes('c75fc5c'); // Previous commit
      const hasOlder = body.includes('3351f5e') || body.includes('f981378');

      return { hasA3fb6f8, hasC75fc5c, hasOlder };
    });

    console.log('\nCommit check:');
    console.log(`  Has latest commit (a3fb6f8): ${commitInfo.hasA3fb6f8}`);
    console.log(`  Has previous commit (c75fc5c): ${commitInfo.hasC75fc5c}`);
    console.log(`  Has older commits: ${commitInfo.hasOlder}`);
  }

  console.log('\n\nKeeping browser open for 60 seconds...');
  await page.waitForTimeout(60000);

  await browser.close();
})();
