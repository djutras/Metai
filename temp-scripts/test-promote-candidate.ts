import { chromium } from 'playwright';

async function testPromoteCandidate() {
  const browser = await chromium.launch({ headless: false });
  const page = await browser.newPage();

  try {
    console.log('Testing candidate promotion functionality...\n');

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

      // Check if page has topic dropdown
      const hasTopicDropdown = await page.locator('table select').first().isVisible().catch(() => false);

      if (!hasTopicDropdown) {
        console.log('❌ Topic dropdown not found yet, waiting for deploy...');
        await page.screenshot({ path: 'temp-scripts/candidates-no-dropdown.png', fullPage: true });

        if (attempt < maxAttempts) {
          console.log('Waiting 30 seconds...');
          await page.waitForTimeout(30000);
        }
        continue;
      }

      console.log('✅ Topic dropdown found!');

      // Check for Add button
      const hasAddButton = await page.locator('button:has-text("Add")').first().isVisible().catch(() => false);

      if (!hasAddButton) {
        console.log('❌ Add button not found');
        await page.screenshot({ path: 'temp-scripts/candidates-no-add-button.png', fullPage: true });

        if (attempt < maxAttempts) {
          console.log('Waiting 30 seconds...');
          await page.waitForTimeout(30000);
        }
        continue;
      }

      console.log('✅ Add button found!');

      // Count candidates before promotion
      const candidateCountBefore = await page.locator('table tbody tr').count();
      console.log(`   ${candidateCountBefore} candidates listed`);

      // Select first candidate's dropdown and promote
      console.log('\n--- Testing Promotion ---');

      // Get first candidate domain for verification
      const firstDomain = await page.locator('table tbody tr:first-child td:first-child a').textContent().catch(() => 'unknown');
      console.log(`Promoting: ${firstDomain}`);

      // Select topic (first option after "Select topic...")
      await page.locator('table tbody tr:first-child select').selectOption({ index: 1 });
      await page.waitForTimeout(500);

      const selectedTopic = await page.locator('table tbody tr:first-child select option:checked').textContent();
      console.log(`Selected topic: ${selectedTopic}`);

      // Click Add button
      await page.click('table tbody tr:first-child button:has-text("Add")');
      console.log('Clicked Add button');

      // Wait for response
      await page.waitForTimeout(5000);

      // Check for success message
      const successMessage = await page.locator('div:has-text("Successfully promoted")').isVisible().catch(() => false);

      if (successMessage) {
        console.log('✅ Success message displayed!');

        const messageText = await page.locator('div:has-text("Successfully promoted")').textContent().catch(() => '');
        console.log(`   Message: ${messageText}`);

        // Verify candidate was removed from list
        const candidateCountAfter = await page.locator('table tbody tr').count();
        console.log(`   Candidates after: ${candidateCountAfter}`);

        if (candidateCountAfter < candidateCountBefore) {
          console.log('✅ Candidate removed from list!');
        } else {
          console.log('⚠️ Candidate count unchanged');
        }

        await page.screenshot({ path: 'temp-scripts/promote-success.png', fullPage: true });

        success = true;
        break;
      } else {
        // Check for error
        const errorMessage = await page.locator('div[style*="f8d7da"]').textContent().catch(() => null);
        if (errorMessage) {
          console.log(`⚠️ Error message: ${errorMessage}`);
        } else {
          console.log('⚠️ No success or error message found');
        }

        await page.screenshot({ path: 'temp-scripts/promote-unclear.png', fullPage: true });
      }

      if (attempt < maxAttempts && !success) {
        console.log('Waiting 30 seconds...');
        await page.waitForTimeout(30000);
      }
    }

    if (success) {
      console.log('\n🎉 SUCCESS! Candidate promotion works!');
      console.log('\nKeeping browser open for 20 seconds...');
      await page.waitForTimeout(20000);
    } else {
      console.log('\n❌ Failed to verify promotion');
    }

  } catch (error) {
    console.error('❌ Error:', error);
    await page.screenshot({ path: 'temp-scripts/promote-test-error.png', fullPage: true });
  } finally {
    await browser.close();
  }
}

testPromoteCandidate();
