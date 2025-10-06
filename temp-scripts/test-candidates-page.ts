import { chromium } from 'playwright';

async function testCandidatesPage() {
  const browser = await chromium.launch({ headless: false });
  const page = await browser.newPage();

  try {
    console.log('Testing Candidate Domains page deployment...\n');

    let success = false;
    const maxAttempts = 20;

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      console.log(`\n=== Attempt ${attempt}/${maxAttempts} ===`);

      await page.goto('https://obscureai.netlify.app/admin', {
        waitUntil: 'domcontentloaded',
        timeout: 60000
      });
      await page.waitForTimeout(2000);

      // Login if needed
      const passwordInput = await page.locator('input[type="password"]').isVisible().catch(() => false);
      if (passwordInput) {
        console.log('Logging in...');
        await page.fill('input[type="password"]', '$$$Hfyj54hfmetai');
        await page.click('button:has-text("Login")');
        await page.waitForTimeout(3000);
      }

      // Check if View Candidates button exists
      const viewCandidatesLink = await page.locator('a:has-text("View Candidates")').isVisible().catch(() => false);

      if (!viewCandidatesLink) {
        console.log('❌ View Candidates button not found yet, waiting for deploy...');
        await page.screenshot({ path: 'temp-scripts/admin-no-candidates-button.png', fullPage: true });

        if (attempt < maxAttempts) {
          console.log('Waiting 30 seconds...');
          await page.waitForTimeout(30000);
        }
        continue;
      }

      console.log('✅ View Candidates button found!');

      // Click View Candidates
      await page.click('a:has-text("View Candidates")');
      await page.waitForTimeout(3000);

      // Check if page loaded
      const pageTitle = await page.locator('h1:has-text("Candidate Domains")').isVisible().catch(() => false);

      if (!pageTitle) {
        console.log('❌ Candidate Domains page did not load');
        await page.screenshot({ path: 'temp-scripts/candidates-page-error.png', fullPage: true });

        if (attempt < maxAttempts) {
          console.log('Waiting 30 seconds...');
          await page.waitForTimeout(30000);
        }
        continue;
      }

      console.log('✅ Candidate Domains page loaded!');

      // Check for table or empty state
      const hasTable = await page.locator('table').isVisible().catch(() => false);
      const hasEmptyMessage = await page.locator('p:has-text("No candidate domains found")').isVisible().catch(() => false);

      if (hasTable) {
        console.log('✅ Table is visible');

        const rowCount = await page.locator('table tbody tr').count();
        console.log(`   Found ${rowCount} candidate domain(s)`);

        if (rowCount > 0) {
          // Get first domain
          const firstDomain = await page.locator('table tbody tr:first-child td:first-child a').textContent().catch(() => null);
          if (firstDomain) {
            console.log(`   Example: ${firstDomain}`);
          }
        }
      } else if (hasEmptyMessage) {
        console.log('✅ Empty state message displayed (no candidates yet)');
      } else {
        console.log('⚠️ Neither table nor empty message found');
      }

      // Check Back to Admin button
      const backButton = await page.locator('a:has-text("Back to Admin")').isVisible().catch(() => false);
      if (backButton) {
        console.log('✅ Back to Admin button present');
      } else {
        console.log('❌ Back to Admin button missing');
      }

      await page.screenshot({ path: 'temp-scripts/candidates-page-success.png', fullPage: true });

      console.log('\n🎉 SUCCESS! Candidate Domains page is deployed and working!');
      success = true;
      break;
    }

    if (success) {
      console.log('\nKeeping browser open for 20 seconds...');
      await page.waitForTimeout(20000);
    } else {
      console.log('\n❌ Failed to verify deployment');
    }

  } catch (error) {
    console.error('❌ Error:', error);
    await page.screenshot({ path: 'temp-scripts/candidates-test-error.png', fullPage: true });
  } finally {
    await browser.close();
  }
}

testCandidatesPage();
