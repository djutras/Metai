const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: false });
  const page = await browser.newPage();

  console.log('Checking GitHub repository secrets...\n');

  await page.goto('https://github.com/djutras/Metai/settings/secrets/actions');
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(3000);

  const secretsInfo = await page.evaluate(() => {
    const body = document.body.textContent || '';

    // Look for secret names
    const hasDATABASE_URL = body.includes('DATABASE_URL');
    const hasNETLIFY_SITE_URL = body.includes('NETLIFY_SITE_URL');

    // Count secrets
    const secretElements = document.querySelectorAll('[data-testid="secret-name"], .secret-name, .secret');

    return {
      hasDATABASE_URL,
      hasNETLIFY_SITE_URL,
      secretCount: secretElements.length,
      pageIncludes: {
        secrets: body.includes('Secrets'),
        actions: body.includes('Actions'),
        repository: body.includes('Repository'),
      },
      bodyExcerpt: body.substring(0, 1000),
    };
  });

  console.log('=== Secrets Check ===');
  console.log(`DATABASE_URL found: ${secretsInfo.hasDATABASE_URL}`);
  console.log(`NETLIFY_SITE_URL found: ${secretsInfo.hasNETLIFY_SITE_URL}`);
  console.log(`Secret elements found: ${secretsInfo.secretCount}`);
  console.log('\nPage includes:', secretsInfo.pageIncludes);
  console.log('\nBody excerpt:');
  console.log(secretsInfo.bodyExcerpt);

  console.log('\n\nKeeping browser open for 60 seconds for manual inspection...');
  await page.waitForTimeout(60000);

  await browser.close();
})();
