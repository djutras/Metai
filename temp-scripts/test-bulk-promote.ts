import { chromium } from 'playwright';

async function testBulkPromote() {
  const browser = await chromium.launch({ headless: false });
  const page = await browser.newPage();

  try {
    console.log('Testing bulk promote all candidates feature...\n');

    let success = false;
    const maxAttempts = 20;

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      console.log(`\n=== Attempt ${attempt}/${maxAttempts} ===`);

      await page.goto('https://obscureai.netlify.app/admin/candidates', {
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
        await page.goto('https://obscureai.netlify.app/admin/candidates', {
          waitUntil: 'domcontentloaded'
        });
        await page.waitForTimeout(2000);
      }

      // Check for bulk section
      const bulkSection = await page.locator('div:has-text("Bulk Add All Candidates")').isVisible().catch(() => false);

      if (!bulkSection) {
        console.log('❌ Bulk Add section not found, waiting for deploy...');
        await page.screenshot({ path: 'temp-scripts/no-bulk-section.png', fullPage: true });

        if (attempt < maxAttempts) {
          console.log('Waiting 30 seconds...');
          await page.waitForTimeout(30000);
        }
        continue;
      }

      console.log('✅ Bulk Add section found!');

      // Check for bulk topic dropdown
      const bulkDropdown = await page.locator('select').first().isVisible().catch(() => false);
      if (!bulkDropdown) {
        console.log('❌ Bulk dropdown not found');
        if (attempt < maxAttempts) {
          await page.waitForTimeout(30000);
        }
        continue;
      }

      console.log('✅ Bulk dropdown found!');

      // Check for Add All button
      const addAllButton = await page.locator('button:has-text("Add All")').isVisible().catch(() => false);
      if (!addAllButton) {
        console.log('❌ Add All button not found');
        if (attempt < maxAttempts) {
          await page.waitForTimeout(30000);
        }
        continue;
      }

      console.log('✅ Add All button found!');

      // Count candidates before
      const candidatesBefore = await page.locator('table tbody tr').count();
      console.log(`   ${candidatesBefore} candidates listed`);

      if (candidatesBefore === 0) {
        console.log('   No candidates to test with');
        success = true;
        break;
      }

      // Select topic (Trump)
      console.log('\n--- Testing Bulk Promotion ---');
      await page.locator('select').first().selectOption({ index: 1 });
      await page.waitForTimeout(500);

      const selectedTopic = await page.locator('select option:checked').first().textContent();
      console.log(`Selected topic: ${selectedTopic}`);

      // Click Add All
      await page.click('button:has-text("Add All")');
      console.log('Clicked Add All button');

      // Wait for processing (could take a while with many candidates)
      console.log(`Waiting for ${candidatesBefore} candidates to be added...`);
      await page.waitForTimeout(candidatesBefore * 2000 + 5000); // ~2s per candidate + buffer

      // Check for success message
      const successMessage = await page.locator('div:has-text("Successfully promoted")').isVisible().catch(() => false);

      if (successMessage) {
        console.log('✅ Success message displayed!');

        const messageText = await page.locator('div:has-text("Successfully promoted")').textContent().catch(() => '');
        console.log(`   ${messageText}`);

        // Verify candidates list
        const candidatesAfter = await page.locator('table tbody tr').count().catch(() => 0);
        console.log(`   Candidates after: ${candidatesAfter}`);

        if (candidatesAfter === 0) {
          console.log('✅ All candidates promoted and removed from list!');
        } else {
          console.log(`   ${candidatesBefore - candidatesAfter} candidates removed`);
        }

        await page.screenshot({ path: 'temp-scripts/bulk-promote-success.png', fullPage: true });

        success = true;
        break;
      } else {
        console.log('⚠️ No success message found yet');
        await page.screenshot({ path: 'temp-scripts/bulk-promote-waiting.png', fullPage: true });
      }

      if (attempt < maxAttempts && !success) {
        console.log('Waiting 30 seconds...');
        await page.waitForTimeout(30000);
      }
    }

    if (success) {
      console.log('\n🎉 SUCCESS! Bulk promote feature works!');
      console.log('\nKeeping browser open for 20 seconds...');
      await page.waitForTimeout(20000);
    } else {
      console.log('\n❌ Failed to verify bulk promotion');
    }

  } catch (error) {
    console.error('❌ Error:', error);
    await page.screenshot({ path: 'temp-scripts/bulk-test-error.png', fullPage: true });
  } finally {
    await browser.close();
  }
}

testBulkPromote();
