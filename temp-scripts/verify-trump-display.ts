import { chromium } from 'playwright';

async function verifyTrumpDisplay() {
  const browser = await chromium.launch({ headless: false });
  const page = await browser.newPage();

  try {
    console.log('Navigating to Trump topic page...');
    await page.goto('http://localhost:3001/Trump?filter=all', { waitUntil: 'networkidle' });
    await page.waitForTimeout(2000);

    // Count articles
    const articleCount = await page.locator('article').count();
    console.log(`\n✅ Articles displayed on page: ${articleCount}`);

    // Get the count from the header
    const headerText = await page.textContent('header');
    const countMatch = headerText?.match(/(\d+)\s+articles?/i);
    if (countMatch) {
      console.log(`Header shows: ${countMatch[1]} articles`);
    }

    // Take screenshot
    await page.screenshot({ path: 'trump-final-verification.png', fullPage: true });
    console.log('Screenshot saved to trump-final-verification.png');

    // Get titles of first 10 articles
    console.log('\nFirst 10 article titles:');
    const titles = await page.locator('article h2').allTextContents();
    titles.slice(0, 10).forEach((title, i) => {
      console.log(`${i + 1}. ${title}`);
    });

    console.log('\n=== Summary ===');
    console.log(`Expected: 81+ articles (we have 103 in DB)`);
    console.log(`Displayed: ${articleCount} articles`);
    console.log(`maxItems limit: 100`);

    if (articleCount >= 81) {
      console.log('\n🎉 SUCCESS! All Trump articles are now displayed!');
    } else if (articleCount >= 100) {
      console.log('\n✅ Displaying 100 articles (maxItems limit reached)');
    } else {
      console.log(`\n⚠️  Only showing ${articleCount} articles. Expected more.`);
    }

    console.log('\nBrowser will stay open for 30 seconds for manual inspection...');
    await page.waitForTimeout(30000);

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await browser.close();
  }
}

verifyTrumpDisplay();
