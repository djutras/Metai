const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: false });
  const page = await browser.newPage();

  console.log('Checking Run #12 logs...\n');

  // Go to run #12
  await page.goto('https://github.com/djutras/Metai/actions/runs/18258550697');
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(3000);

  // Click on "crawl" job
  await page.evaluate(() => {
    const links = Array.from(document.querySelectorAll('a')).filter(a =>
      a.textContent?.toLowerCase().includes('crawl') &&
      !a.textContent?.includes('Crawl Topics') &&
      a.href.includes('/job/')
    );
    if (links.length > 0) {
      links[0].click();
    }
  });

  await page.waitForTimeout(3000);

  console.log('Expanding all steps...\n');

  // Try to expand all collapsed steps
  await page.evaluate(() => {
    const summaries = document.querySelectorAll('summary');
    summaries.forEach(s => {
      if (!s.hasAttribute('open')) {
        s.click();
      }
    });
  });

  await page.waitForTimeout(2000);

  // Get all the step content
  const steps = await page.evaluate(() => {
    const stepElements = document.querySelectorAll('[class*="step"], .js-details-container');
    const results = [];

    stepElements.forEach(step => {
      const heading = step.querySelector('summary, .js-details-target');
      const stepName = heading ? heading.textContent?.trim().substring(0, 100) : '';

      if (stepName.includes('Log crawl') || stepName.includes('Install') || stepName.includes('Trigger')) {
        const content = step.textContent || '';
        results.push({
          name: stepName,
          excerpt: content.substring(0, 1000),
          hasError: content.toLowerCase().includes('error'),
          hasSuccess: content.toLowerCase().includes('success') || content.includes('✓'),
        });
      }
    });

    return results;
  });

  console.log('=== Step Analysis ===\n');

  steps.forEach((step, i) => {
    console.log(`Step ${i + 1}: ${step.name}`);
    console.log(`Has error: ${step.hasError}`);
    console.log(`Has success: ${step.hasSuccess}`);
    console.log(`Excerpt:\n${step.excerpt}\n`);
    console.log('---\n');
  });

  // Also get full page text to search for specific errors
  const fullText = await page.evaluate(() => document.body.textContent || '');

  console.log('=== Full Page Analysis ===');
  console.log(`Contains "tsx": ${fullText.includes('tsx')}`);
  console.log(`Contains "Cannot find module": ${fullText.includes('Cannot find module')}`);
  console.log(`Contains "ENOENT": ${fullText.includes('ENOENT')}`);
  console.log(`Contains "Permission denied": ${fullText.includes('Permission denied')}`);
  console.log(`Contains "Logged crawl run": ${fullText.includes('Logged crawl run')}`);

  console.log('\n\nKeeping browser open for 90 seconds...');
  console.log('Manually inspect the "Log crawl run start" step in the browser');
  await page.waitForTimeout(90000);

  await browser.close();
})();
