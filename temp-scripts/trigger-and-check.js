const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: false });
  const page = await browser.newPage();

  console.log('Step 1: Triggering workflow manually...\n');

  // Go to the workflow page
  await page.goto('https://github.com/djutras/Metai/actions/workflows/crawl-topics.yml');
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(2000);

  // Click "Run workflow" button
  const runClicked = await page.evaluate(() => {
    const buttons = Array.from(document.querySelectorAll('button, summary')).filter(b =>
      b.textContent?.includes('Run workflow')
    );
    if (buttons.length > 0) {
      buttons[0].click();
      return true;
    }
    return false;
  });

  if (runClicked) {
    console.log('✓ Clicked "Run workflow" button');
    await page.waitForTimeout(1000);

    // Click the green "Run workflow" confirmation button
    const confirmClicked = await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('button')).filter(b =>
        b.textContent?.includes('Run workflow') && b.className.includes('Button--primary')
      );
      if (buttons.length > 0) {
        buttons[0].click();
        return true;
      }
      return false;
    });

    if (confirmClicked) {
      console.log('✓ Confirmed workflow run');
    }
  }

  console.log('\nWaiting 30 seconds for workflow to complete...\n');
  await page.waitForTimeout(30000);

  console.log('Step 2: Checking workflow run status...\n');
  await page.goto('https://github.com/djutras/Metai/actions/workflows/crawl-topics.yml');
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(2000);

  const latestRun = await page.evaluate(() => {
    const runLinks = document.querySelectorAll('a[href*="/actions/runs/"]');
    if (runLinks.length > 0) {
      return runLinks[0].href;
    }
    return null;
  });

  if (latestRun) {
    console.log(`Latest run: ${latestRun}`);
    await page.goto(latestRun);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(3000);

    // Check status
    const status = await page.evaluate(() => {
      const body = document.body.textContent || '';
      return {
        succeeded: body.includes('Success') || body.includes('succeeded'),
        failed: body.includes('Failed') || body.includes('Failure'),
        inProgress: body.includes('In progress'),
      };
    });

    console.log('Status:', status);
  }

  console.log('\nStep 3: Checking Cron Report...\n');
  await page.goto('https://obscureai.netlify.app/admin/cron-report');
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(2000);

  // Try to login if needed
  const hasPassword = await page.locator('input[type="password"]').count() > 0;
  if (hasPassword) {
    console.log('Logging in...');
    await page.fill('input[type="password"]', '$$$Hfyj54hfmetai');
    await page.click('button[type="submit"]');
    await page.waitForTimeout(2000);
  }

  const cronReport = await page.evaluate(() => {
    return document.body.textContent || '';
  });

  const runCount = cronReport.match(/Showing last (\d+) crawl runs/);
  console.log('\n=== Cron Report ===');
  if (runCount) {
    console.log(`Number of runs: ${runCount[1]}`);
    console.log(`Report excerpt:\n${cronReport.substring(0, 500)}`);
  } else {
    console.log('Could not parse run count');
    console.log(`Report excerpt:\n${cronReport.substring(0, 500)}`);
  }

  console.log('\n\nKeeping browser open for 60 seconds for manual inspection...');
  await page.waitForTimeout(60000);

  await browser.close();
})();
