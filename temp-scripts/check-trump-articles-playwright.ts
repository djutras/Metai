import { chromium } from 'playwright';

async function checkTrumpArticles() {
  const browser = await chromium.launch({ headless: false });
  const page = await browser.newPage();

  try {
    console.log('Navigating to Trump topic page...');
    await page.goto('http://localhost:3001/Trump?filter=all', { waitUntil: 'networkidle' });

    // Wait for articles to load
    await page.waitForTimeout(2000);

    // Count article elements - try different selectors
    const articleSelectors = [
      'article',
      '[data-article]',
      '.article',
      'a[href*="/Trump/"]',
      'h2, h3'
    ];

    console.log('\n=== Counting articles with different selectors ===');
    for (const selector of articleSelectors) {
      try {
        const count = await page.locator(selector).count();
        console.log(`${selector}: ${count} elements`);
      } catch (e) {
        console.log(`${selector}: Error - ${e}`);
      }
    }

    // Take a screenshot
    await page.screenshot({ path: 'trump-articles-screenshot.png', fullPage: true });
    console.log('\nScreenshot saved to trump-articles-screenshot.png');

    // Get page content to analyze
    const bodyText = await page.textContent('body');
    const articleMatches = bodyText?.match(/article/gi);
    console.log(`\nText instances of "article": ${articleMatches?.length || 0}`);

    // Check if there's a "Load more" or pagination
    const loadMoreButton = await page.locator('button:has-text("Load more"), button:has-text("Show more")').count();
    console.log(`Load more buttons: ${loadMoreButton}`);

    // Get all visible text on page to analyze structure
    const allText = await page.evaluate(() => document.body.innerText);
    console.log('\n=== Page content preview (first 500 chars) ===');
    console.log(allText.substring(0, 500));

    // Keep browser open for inspection
    console.log('\nBrowser will stay open for 30 seconds for inspection...');
    await page.waitForTimeout(30000);

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await browser.close();
  }
}

checkTrumpArticles();
