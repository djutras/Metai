const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: false });
  const page = await browser.newPage();

  console.log('Viewing latest workflow run logs...\n');

  // Go to the actions page
  await page.goto('https://github.com/djutras/Metai/actions');
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(2000);

  // Click on the first (latest) run
  const clicked = await page.evaluate(() => {
    const firstRun = document.querySelector('a[href*="/actions/runs/"]');
    if (firstRun) {
      firstRun.click();
      return true;
    }
    return false;
  });

  if (!clicked) {
    console.log('Could not find latest run');
    await browser.close();
    return;
  }

  await page.waitForTimeout(3000);

  // Click on the "crawl" job
  await page.evaluate(() => {
    const jobLinks = Array.from(document.querySelectorAll('a')).filter(a =>
      a.textContent?.trim() === 'crawl' ||
      (a.textContent?.includes('crawl') && a.href.includes('/job/'))
    );
    if (jobLinks.length > 0) {
      jobLinks[0].click();
    }
  });

  await page.waitForTimeout(3000);

  // Click on "Log crawl run start" to expand it
  const expanded = await page.evaluate(() => {
    // Find all elements that might contain "Log crawl run start"
    const allElements = Array.from(document.querySelectorAll('*'));
    const logStep = allElements.find(el =>
      el.textContent?.includes('Log crawl run start') &&
      el.textContent?.length < 200
    );

    if (logStep) {
      // Find the clickable summary/button
      let current = logStep;
      while (current) {
        if (current.tagName === 'SUMMARY' || current.tagName === 'BUTTON' || current.tagName === 'DETAILS') {
          current.click();
          return true;
        }
        current = current.parentElement;
      }
    }
    return false;
  });

  console.log(`Expanded log step: ${expanded}`);
  await page.waitForTimeout(2000);

  // Get the text content after the "Log crawl run start" heading
  const logContent = await page.evaluate(() => {
    const body = document.body.textContent || '';

    // Find "Log crawl run start" and get the next ~2000 characters
    const idx = body.indexOf('Log crawl run start');
    if (idx !== -1) {
      return body.substring(idx, idx + 2000);
    }

    return 'Could not find log content';
  });

  console.log('\n=== Log Content ===');
  console.log(logContent);
  console.log('\n==================\n');

  // Also try to get the raw log lines
  const rawLog = await page.evaluate(() => {
    const logLines = document.querySelectorAll('.react-code-text, .blob-code, [class*="log-line"]');
    const lines = [];

    logLines.forEach((line, i) => {
      if (i < 50) { // First 50 lines
        const text = line.textContent?.trim();
        if (text && text.length > 0) {
          lines.push(text);
        }
      }
    });

    return lines;
  });

  if (rawLog.length > 0) {
    console.log('=== Raw Log Lines ===');
    rawLog.forEach((line, i) => {
      console.log(`${i + 1}: ${line}`);
    });
  }

  console.log('\n\nKeeping browser open for 2 minutes for manual inspection...');
  console.log('Scroll to "Log crawl run start" step and expand it to see the error');
  await page.waitForTimeout(120000);

  await browser.close();
})();
