const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: false });
  const page = await browser.newPage();

  console.log('Checking Crawl Topics workflow runs...\n');

  await page.goto('https://github.com/djutras/Metai/actions/workflows/crawl-topics.yml');
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(3000);

  // Get the workflow runs
  const runs = await page.evaluate(() => {
    // Try to find workflow run items
    const runLinks = document.querySelectorAll('a[href*="/actions/runs/"]');
    const results = [];

    for (let i = 0; i < Math.min(10, runLinks.length); i++) {
      const link = runLinks[i];
      const parent = link.closest('.Box-row, [data-testid="list-view-item"]');

      results.push({
        href: link.href,
        text: parent ? parent.textContent?.replace(/\s+/g, ' ').trim().substring(0, 200) : link.textContent?.trim().substring(0, 100),
      });
    }

    return results;
  });

  console.log(`Found ${runs.length} workflow runs:\n`);
  runs.forEach((run, i) => {
    console.log(`\n=== Run ${i + 1} ===`);
    console.log(`URL: ${run.href}`);
    console.log(`Info: ${run.text}`);
  });

  // Click on the first run if it exists
  if (runs.length > 0) {
    console.log(`\n\nClicking on first run: ${runs[0].href}`);
    await page.goto(runs[0].href);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    // Get the job status
    const jobInfo = await page.evaluate(() => {
      const body = document.body.textContent || '';

      return {
        hasSuccess: body.includes('Success') || body.includes('✓'),
        hasFailed: body.includes('Failure') || body.includes('Failed'),
        hasInProgress: body.includes('In progress') || body.includes('queued'),
        pageText: body.substring(0, 1000),
      };
    });

    console.log('\n=== Job Status ===');
    console.log(`Success: ${jobInfo.hasSuccess}`);
    console.log(`Failed: ${jobInfo.hasFailed}`);
    console.log(`In Progress: ${jobInfo.hasInProgress}`);
    console.log(`\nPage excerpt:\n${jobInfo.pageText}`);
  } else {
    console.log('\n⚠️ No workflow runs found!');
  }

  console.log('\n\nKeeping browser open for 60 seconds for manual inspection...');
  await page.waitForTimeout(60000);

  await browser.close();
})();
