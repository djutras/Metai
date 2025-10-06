const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  console.log('Loading wired.com...');
  await page.goto('https://www.wired.com', { waitUntil: 'domcontentloaded', timeout: 15000 });

  // Wait a bit for dynamic content
  await page.waitForTimeout(1000);

  // Get all article titles and URLs
  const articles = await page.evaluate(() => {
    const results = [];

    // Look for article links
    const links = document.querySelectorAll('a[href*="/story/"], a[href*="/article/"]');

    links.forEach(link => {
      // Try to find headline within the link or nearby
      const headline = link.querySelector('h2, h3, .headline, [class*="headline"], [class*="title"]');
      const text = headline ? headline.textContent.trim() : link.textContent.trim();
      const url = link.href;

      if (text && text.length > 10 && url) {
        // Avoid duplicates
        if (!results.find(r => r.url === url)) {
          results.push({ title: text, url: url });
        }
      }
    });

    return results;
  });

  // Filter for titles containing "China"
  const chinaArticles = articles.filter(article =>
    article.title.toLowerCase().includes('china')
  );

  console.log('\n=== Articles with "China" in the title ===\n');

  if (chinaArticles.length === 0) {
    console.log('No articles found with "China" in the title.');
  } else {
    chinaArticles.forEach((article, index) => {
      console.log(`${index + 1}. ${article.title}`);
      console.log(`   ${article.url}\n`);
    });
  }

  console.log(`Total articles found: ${articles.length}`);
  console.log(`Articles with "China": ${chinaArticles.length}`);

  await browser.close();
})();
