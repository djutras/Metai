const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: false });
  const page = await browser.newPage();

  console.log('Adding secrets to GitHub repository...\n');

  // Go to secrets page
  await page.goto('https://github.com/djutras/Metai/settings/secrets/actions');
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(3000);

  const secrets = [
    {
      name: 'DATABASE_URL',
      value: 'postgresql://neondb_owner:npg_IZm4bMTkdxR5@ep-icy-pond-aevzfm4q-pooler.c-2.us-east-2.aws.neon.tech/neondb?sslmode=require'
    },
    {
      name: 'NETLIFY_SITE_URL',
      value: 'https://obscureai.netlify.app'
    }
  ];

  for (const secret of secrets) {
    console.log(`\nAdding secret: ${secret.name}...`);

    // Click "New repository secret" button
    const newSecretClicked = await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('a, button')).filter(b =>
        b.textContent?.includes('New repository secret') ||
        b.textContent?.includes('New secret')
      );
      if (buttons.length > 0) {
        buttons[0].click();
        return true;
      }
      return false;
    });

    if (!newSecretClicked) {
      console.log('Could not find "New repository secret" button');
      continue;
    }

    await page.waitForTimeout(2000);

    // Fill in the name
    const nameInput = page.locator('input[name="secret_name"], input[placeholder*="Name"], #secret_name');
    const nameCount = await nameInput.count();

    if (nameCount > 0) {
      await nameInput.first().fill(secret.name);
      console.log(`✓ Filled name: ${secret.name}`);
    }

    await page.waitForTimeout(500);

    // Fill in the value
    const valueInput = page.locator('textarea[name="secret_value"], textarea[placeholder*="Value"], #secret_value');
    const valueCount = await valueInput.count();

    if (valueCount > 0) {
      await valueInput.first().fill(secret.value);
      console.log(`✓ Filled value (${secret.value.substring(0, 30)}...)`);
    }

    await page.waitForTimeout(500);

    // Click "Add secret" button
    const addClicked = await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('button')).filter(b =>
        b.textContent?.includes('Add secret') ||
        b.textContent?.includes('Update secret')
      );
      if (buttons.length > 0) {
        buttons[0].click();
        return true;
      }
      return false;
    });

    if (addClicked) {
      console.log(`✓ Clicked "Add secret" button`);
      await page.waitForTimeout(2000);
    }

    // Go back to secrets page for next iteration
    await page.goto('https://github.com/djutras/Metai/settings/secrets/actions');
    await page.waitForTimeout(2000);
  }

  console.log('\n\n=== Verifying secrets were added ===\n');
  await page.goto('https://github.com/djutras/Metai/settings/secrets/actions');
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(2000);

  const verification = await page.evaluate(() => {
    const body = document.body.textContent || '';
    return {
      hasDATABASE_URL: body.includes('DATABASE_URL'),
      hasNETLIFY_SITE_URL: body.includes('NETLIFY_SITE_URL'),
    };
  });

  console.log('DATABASE_URL secret exists:', verification.hasDATABASE_URL);
  console.log('NETLIFY_SITE_URL secret exists:', verification.hasNETLIFY_SITE_URL);

  console.log('\n\nKeeping browser open for 60 seconds for manual inspection...');
  await page.waitForTimeout(60000);

  await browser.close();
})();
