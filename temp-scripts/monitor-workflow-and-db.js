const { chromium } = require('playwright');
const { neon } = require('@neondatabase/serverless');

const DATABASE_URL = 'postgresql://neondb_owner:npg_IZm4bMTkdxR5@ep-icy-pond-aevzfm4q-pooler.c-2.us-east-2.aws.neon.tech/neondb?sslmode=require';

(async () => {
  const browser = await chromium.launch({ headless: false });
  const page = await browser.newPage();
  const sql = neon(DATABASE_URL);

  console.log('=== WORKFLOW TRIGGER & MONITOR ===\n');

  // Step 1: Trigger the workflow
  console.log('Step 1: Triggering workflow...\n');

  await page.goto('https://github.com/djutras/Metai/actions/workflows/crawl-topics.yml');
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(2000);

  const triggered = await page.evaluate(() => {
    const summaries = Array.from(document.querySelectorAll('summary, button')).filter(s =>
      s.textContent?.includes('Run workflow')
    );
    if (summaries.length > 0) {
      summaries[0].click();
      return true;
    }
    return false;
  });

  if (triggered) {
    await page.waitForTimeout(1000);

    await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('button')).filter(b =>
        b.textContent?.trim() === 'Run workflow' &&
        (b.className.includes('btn-primary') || b.className.includes('Button--primary'))
      );
      if (buttons.length > 0) {
        buttons[0].click();
      }
    });

    console.log('✓ Workflow triggered!\n');
  }

  // Step 2: Monitor for completion
  console.log('Step 2: Waiting 35 seconds for workflow to complete...\n');
  await page.waitForTimeout(35000);

  // Step 3: Check database for new entry
  console.log('Step 3: Checking database for crawl runs...\n');

  for (let attempt = 1; attempt <= 3; attempt++) {
    console.log(`  Attempt ${attempt}/3...`);

    const runs = await sql`
      SELECT workflow_name, run_id, started_at, metadata
      FROM crawl_runs
      ORDER BY started_at DESC
      LIMIT 5
    `;

    if (runs.length > 0) {
      console.log(`\n✓✓✓ SUCCESS! Found ${runs.length} crawl runs in database! ✓✓✓\n`);

      runs.forEach((run, i) => {
        console.log(`=== Run ${i + 1} ===`);
        console.log(`Workflow: ${run.workflow_name}`);
        console.log(`Run ID: ${run.run_id}`);
        console.log(`Started: ${run.started_at}`);
        if (run.metadata) {
          const meta = typeof run.metadata === 'string' ? JSON.parse(run.metadata) : run.metadata;
          console.log(`Actor: ${meta.actor || 'N/A'}`);
          console.log(`Event: ${meta.event || 'N/A'}`);
        }
        console.log('');
      });

      break;
    } else {
      console.log(`  No runs found yet...`);

      if (attempt < 3) {
        console.log('  Waiting 10 more seconds...\n');
        await page.waitForTimeout(10000);
      }
    }
  }

  // Step 4: Check the latest workflow run logs
  console.log('\nStep 4: Checking workflow run logs on GitHub...\n');

  await page.goto('https://github.com/djutras/Metai/actions/workflows/crawl-topics.yml');
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(2000);

  const latestInfo = await page.evaluate(() => {
    const firstRun = document.querySelector('a[href*="/actions/runs/"]');
    if (!firstRun) return null;

    const parent = firstRun.closest('.Box-row, [data-testid="list-view-item"]');
    return {
      url: firstRun.href,
      text: parent ? parent.textContent?.replace(/\s+/g, ' ').trim().substring(0, 150) : '',
    };
  });

  if (latestInfo) {
    console.log(`Latest run: ${latestInfo.url}`);
    console.log(`Info: ${latestInfo.text}\n`);
  }

  console.log('\nKeeping browser open for 60 seconds for manual inspection...');
  await page.waitForTimeout(60000);

  await browser.close();
})();
