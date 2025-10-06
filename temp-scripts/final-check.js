const { chromium } = require('playwright');
const { neon } = require('@neondatabase/serverless');

const DATABASE_URL = 'postgresql://neondb_owner:npg_IZm4bMTkdxR5@ep-icy-pond-aevzfm4q-pooler.c-2.us-east-2.aws.neon.tech/neondb?sslmode=require';

(async () => {
  const browser = await chromium.launch({ headless: false });
  const page = await browser.newPage();
  const sql = neon(DATABASE_URL);

  console.log('=== FINAL WORKFLOW CHECK ===\n');

  // Trigger workflow
  console.log('Triggering workflow...');
  await page.goto('https://github.com/djutras/Metai/actions/workflows/crawl-topics.yml');
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(2000);

  await page.evaluate(() => {
    const btn = Array.from(document.querySelectorAll('summary, button')).find(s =>
      s.textContent?.includes('Run workflow')
    );
    if (btn) btn.click();
  });

  await page.waitForTimeout(1000);

  await page.evaluate(() => {
    const btn = Array.from(document.querySelectorAll('button')).find(b =>
      b.textContent?.trim() === 'Run workflow' && b.className.includes('primary')
    );
    if (btn) btn.click();
  });

  console.log('✓ Workflow triggered\n');

  // Wait 1 minute for workflow to complete
  console.log('Waiting 60 seconds for workflow to complete...\n');

  for (let i = 60; i > 0; i -= 10) {
    console.log(`  ${i} seconds remaining...`);
    await new Promise(resolve => setTimeout(resolve, 10000));
  }

  // Check database
  console.log('\nChecking database...\n');

  const runs = await sql`
    SELECT workflow_name, run_id, started_at, metadata
    FROM crawl_runs
    ORDER BY started_at DESC
    LIMIT 3
  `;

  if (runs.length > 0) {
    console.log(`\n✓✓✓ SUCCESS! Found ${runs.length} crawl run(s)! ✓✓✓\n`);

    runs.forEach((run, i) => {
      console.log(`=== Run ${i + 1} ===`);
      console.log(`Workflow: ${run.workflow_name}`);
      console.log(`Run ID: ${run.run_id}`);
      console.log(`Started: ${run.started_at}`);
      console.log('');
    });
  } else {
    console.log('\n✗ No crawl runs found in database yet.\n');
    console.log('Checking workflow run status on GitHub...\n');

    await page.goto('https://github.com/djutras/Metai/actions');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    const firstRun = await page.evaluate(() => {
      const link = document.querySelector('a[href*="/actions/runs/"]');
      return link ? link.href : null;
    });

    if (firstRun) {
      console.log(`Latest run: ${firstRun}`);
      console.log('\nNavigating to run to check logs...');

      await page.goto(firstRun);
      await page.waitForTimeout(2000);
    }
  }

  console.log('\n\nKeeping browser open for manual inspection...');
  await page.waitForTimeout(120000);

  await browser.close();
})();
