import { chromium } from 'playwright';

async function verifyLiveSite() {
  const browser = await chromium.launch({ headless: false });
  const page = await browser.newPage();

  try {
    console.log('Checking live site at https://obscureai.netlify.app/Trump?filter=all\n');

    await page.goto('https://obscureai.netlify.app/Trump?filter=all', {
      waitUntil: 'networkidle',
      timeout: 60000
    });

    await page.waitForTimeout(3000);

    // Count articles
    const articleCount = await page.locator('article').count();

    // Get header info
    const headerText = await page.textContent('header');
    const countMatch = headerText?.match(/(\d+)\s+articles?/i);

    console.log('═══════════════════════════════════════════════');
    console.log('        LIVE SITE VERIFICATION');
    console.log('═══════════════════════════════════════════════');
    console.log(`URL: https://obscureai.netlify.app/Trump?filter=all`);
    console.log(`Articles on page: ${articleCount}`);
    if (countMatch) {
      console.log(`Header shows: ${countMatch[1]} articles`);
    }
    console.log('═══════════════════════════════════════════════\n');

    // Take screenshot
    await page.screenshot({ path: 'temp-scripts/live-site-trump.png', fullPage: true });
    console.log('Screenshot saved: live-site-trump.png\n');

    if (articleCount >= 100) {
      console.log('🎉🎉🎉 SUCCESS! Live site shows 100 articles! 🎉🎉🎉');
    } else if (articleCount >= 81) {
      console.log('✅ SUCCESS! Live site shows 81+ articles!');
    } else {
      console.log(`⚠️ Only ${articleCount} articles showing on live site`);
      console.log('This might be a caching issue or the database changes haven\'t propagated');
    }

    // Check a few article titles
    console.log('\nFirst 5 article titles:');
    const titles = await page.locator('article h2').allTextContents();
    titles.slice(0, 5).forEach((title, i) => {
      console.log(`${i + 1}. ${title}`);
    });

    console.log('\nKeeping browser open for 30 seconds...');
    await page.waitForTimeout(30000);

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await browser.close();
  }
}

verifyLiveSite();
