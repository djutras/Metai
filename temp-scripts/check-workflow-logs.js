const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: false });
  const page = await browser.newPage();

  console.log('Checking workflow logs...\n');

  // Go directly to the most recent manual run
  await page.goto('https://github.com/djutras/Metai/actions/runs/18258335916');
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(2000);

  // Click on the "crawl" job to see details
  const jobClicked = await page.evaluate(() => {
    const jobLinks = Array.from(document.querySelectorAll('a')).filter(a =>
      a.textContent?.includes('crawl') || a.href.includes('/job/')
    );
    if (jobLinks.length > 0) {
      jobLinks[0].click();
      return true;
    }
    return false;
  });

  if (jobClicked) {
    console.log('Clicked on job link, waiting for logs...');
    await page.waitForTimeout(3000);
  }

  // Try to find and click "Log crawl run start" step
  await page.evaluate(() => {
    const steps = Array.from(document.querySelectorAll('[data-testid], button, summary')).filter(el =>
      el.textContent?.includes('Log crawl run start') ||
      el.textContent?.includes('log-crawl-run')
    );
    if (steps.length > 0) {
      steps[0].click();
    }
  });

  await page.waitForTimeout(2000);

  // Get the log content
  const logs = await page.evaluate(() => {
    const logElements = document.querySelectorAll('.react-code-text, .blob-code, pre, code, [class*="log"]');
    const results = [];

    for (const elem of logElements) {
      const text = elem.textContent?.trim();
      if (text && text.length > 10) {
        results.push(text);
      }
    }

    // Also get all visible text
    const allText = document.body.textContent || '';

    return {
      logElements: results.slice(0, 10),
      bodyIncludes: {
        logCrawlRun: allText.includes('log-crawl-run'),
        npxTsx: allText.includes('npx tsx'),
        DATABASE_URL: allText.includes('DATABASE_URL'),
        success: allText.includes('Logged crawl run'),
        error: allText.includes('Error') || allText.includes('error'),
      },
    };
  });

  console.log('\n=== Log Analysis ===');
  console.log('Body includes:');
  console.log(JSON.stringify(logs.bodyIncludes, null, 2));

  console.log('\n=== Log Elements ===');
  logs.logElements.forEach((log, i) => {
    console.log(`\n--- Element ${i + 1} ---`);
    console.log(log.substring(0, 500));
  });

  console.log('\n\nKeeping browser open for 90 seconds for manual inspection...');
  console.log('Look for the "Log crawl run start" step and click to expand it');
  await page.waitForTimeout(90000);

  await browser.close();
})();
