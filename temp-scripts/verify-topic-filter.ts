import { chromium } from 'playwright';

async function verifyTopicFilter() {
  const browser = await chromium.launch({ headless: false });
  const page = await browser.newPage();

  try {
    console.log('Waiting for deploy and verifying topic filtering...');
    console.log('Checking every 20 seconds...\n');

    let verified = false;
    const maxAttempts = 10;

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      console.log(`Attempt ${attempt}/${maxAttempts}...`);

      await page.goto('https://obscureai.netlify.app/admin/crawl-report', {
        waitUntil: 'domcontentloaded',
        timeout: 60000
      });
      await page.waitForTimeout(3000);

      // Get dropdown options
      const options = await page.locator('select option').allTextContents();

      // Find a World News crawl
      const worldNewsIndex = options.findIndex(opt => opt.includes('World News'));

      if (worldNewsIndex >= 0) {
        console.log(`Selecting World News crawl: ${options[worldNewsIndex]}`);
        await page.locator('select').selectOption({ index: worldNewsIndex });
        await page.waitForTimeout(2000);

        // Check if table exists
        const hasTable = await page.locator('table tbody tr').count() > 0;

        if (hasTable) {
          // Count articles
          const articleLinks = await page.locator('table tbody tr td a').count();
          console.log(`Found ${articleLinks} articles`);

          if (articleLinks === 0) {
            console.log('✅ DEPLOYED! World News shows 0 articles (no Trump articles bleeding through)');

            // Count sources with 0 articles
            const noArticlesCount = await page.locator('text=/No articles found/i').count();
            const totalSources = await page.locator('table tbody tr td:first-child').count();

            console.log(`Total sources shown: ${totalSources}`);
            console.log(`Sources with 0 articles: ${noArticlesCount}`);

            verified = true;
          } else {
            // Check if any articles mention Trump (they shouldn't for World News)
            const articleTitles = await page.locator('table tbody tr td a').allTextContents();
            const trumpMentions = articleTitles.filter(title =>
              title.toLowerCase().includes('trump')
            ).length;

            if (trumpMentions > 0) {
              console.log(`⚠️ Still showing ${trumpMentions} Trump articles in World News - old version`);
            } else {
              console.log(`✅ DEPLOYED! ${articleLinks} articles, none mentioning Trump`);
              verified = true;
            }
          }

          if (verified) {
            await page.screenshot({ path: 'temp-scripts/world-news-filtered.png', fullPage: true });
            console.log('📸 Screenshot saved: world-news-filtered.png');
            break;
          }
        } else {
          console.log('No table found for World News');
        }
      }

      if (attempt < maxAttempts && !verified) {
        console.log('Waiting 20 seconds...\n');
        await page.waitForTimeout(20000);
      }
    }

    if (verified) {
      console.log('\n🎉 SUCCESS! World News crawl shows only World News articles!');
      console.log('\nKeeping browser open for 20 seconds...');
      await page.waitForTimeout(20000);
    } else {
      console.log('❌ Could not verify in time');
    }

  } catch (error) {
    console.error('❌ Error:', error);
    await page.screenshot({ path: 'temp-scripts/verify-error.png', fullPage: true });
  } finally {
    await browser.close();
  }
}

verifyTopicFilter();
