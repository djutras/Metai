const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: false });
  const page = await browser.newPage();

  console.log('Step 1: Triggering workflow manually...\n');

  await page.goto('https://github.com/djutras/Metai/actions/workflows/crawl-topics.yml');
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(2000);

  // Click "Run workflow" dropdown
  await page.evaluate(() => {
    const summaries = Array.from(document.querySelectorAll('summary, button')).filter(s =>
      s.textContent?.includes('Run workflow')
    );
    if (summaries.length > 0) {
      summaries[0].click();
    }
  });

  await page.waitForTimeout(1000);

  // Click the confirmation button
  await page.evaluate(() => {
    const buttons = Array.from(document.querySelectorAll('button')).filter(b =>
      b.textContent?.trim() === 'Run workflow' &&
      (b.className.includes('btn-primary') || b.className.includes('Button--primary'))
    );
    if (buttons.length > 0) {
      buttons[0].click();
    }
  });

  console.log('✓ Triggered workflow, waiting 40 seconds for it to complete...\n');
  await page.waitForTimeout(40000);

  // Refresh and get the latest run
  await page.goto('https://github.com/djutras/Metai/actions/workflows/crawl-topics.yml');
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(2000);

  const latestRunUrl = await page.evaluate(() => {
    const links = Array.from(document.querySelectorAll('a')).filter(a =>
      a.href.includes('/actions/runs/')
    );
    return links.length > 0 ? links[0].href : null;
  });

  if (!latestRunUrl) {
    console.log('Could not find latest run URL');
    await browser.close();
    return;
  }

  console.log(`Latest run: ${latestRunUrl}\n`);
  await page.goto(latestRunUrl);
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(2000);

  // Click on the "crawl" job
  await page.evaluate(() => {
    const links = Array.from(document.querySelectorAll('a')).filter(a =>
      a.textContent?.includes('crawl') && !a.textContent?.includes('Crawl Topics')
    );
    if (links.length > 0) {
      links[0].click();
    }
  });

  await page.waitForTimeout(3000);

  // Expand the "Log crawl run start" step
  console.log('Looking for "Log crawl run start" step...\n');

  await page.evaluate(() => {
    const elements = Array.from(document.querySelectorAll('button, summary, div, span'));
    const logStep = elements.find(el =>
      el.textContent?.includes('Log crawl run start')
    );

    if (logStep) {
      // Find the clickable parent (summary or button)
      let clickable = logStep;
      while (clickable && clickable.tagName !== 'SUMMARY' && clickable.tagName !== 'BUTTON') {
        clickable = clickable.parentElement;
      }
      if (clickable) {
        clickable.click();
      }
    }
  });

  await page.waitForTimeout(2000);

  // Get the log content
  const logContent = await page.evaluate(() => {
    return document.body.textContent || '';
  });

  console.log('=== Checking for key phrases in logs ===');
  console.log(`Contains "npx tsx": ${logContent.includes('npx tsx')}`);
  console.log(`Contains "log-crawl-run": ${logContent.includes('log-crawl-run')}`);
  console.log(`Contains "Logged crawl run": ${logContent.includes('Logged crawl run')}`);
  console.log(`Contains "Failed to log": ${logContent.includes('Failed to log')}`);
  console.log(`Contains "Error": ${logContent.includes('Error')}`);

  // Try to extract the actual log output
  const logMatch = logContent.match(/Log crawl run start[\s\S]{0,500}/);
  if (logMatch) {
    console.log('\n=== Log excerpt ===');
    console.log(logMatch[0]);
  }

  console.log('\n\nKeeping browser open for 90 seconds to manually inspect logs...');
  console.log('Expand the "Log crawl run start" step to see the full output');
  await page.waitForTimeout(90000);

  await browser.close();
})();
