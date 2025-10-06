require('dotenv').config();
const { db } = require('./src/lib/db');
const { sources } = require('./db/schema');
const { eq } = require('drizzle-orm');

const sourceConfigs = {
  'wired.com': {
    sitemapPaths: ['/sitemap.xml', '/feed/rss'],
    indexPaths: ['/latest', '/news'],
    articlePattern: '^https://www\\.wired\\.com/story/[^/]+/?$',
  },
  'techcrunch.com': {
    sitemapPaths: ['/sitemap.xml'],
    indexPaths: ['/latest'],
    articlePattern: '^https://techcrunch\\.com/\\d{4}/\\d{2}/\\d{2}/[^/]+/?$',
  },
  'arstechnica.com': {
    sitemapPaths: ['/sitemap.xml'],
    indexPaths: ['/'],
    articlePattern: '^https://arstechnica\\.com/[^/]+/\\d{4}/\\d{2}/[^/]+/?$',
  },
  'theverge.com': {
    sitemapPaths: ['/sitemap.xml', '/rss/index.xml'],
    indexPaths: ['/tech', '/'],
    articlePattern: '^https://www\\.theverge\\.com/\\d{4}/\\d+/\\d+/\\d+/[^/]+/?$',
  },
  'theguardian.com': {
    sitemapPaths: ['/sitemaps/news.xml'],
    indexPaths: ['/us-news', '/world/usa', '/us'],
    articlePattern: '^https://www\\.theguardian\\.com/[^/]+/\\d{4}/[a-z]{3}/\\d{2}/[^/]+$',
  },
  'cnn.com': {
    sitemapPaths: ['/sitemap.xml'],
    indexPaths: ['/politics', '/us'],
    articlePattern: '^https://(www\\.)?cnn\\.com/\\d{4}/\\d{2}/\\d{2}/[^/]+/index\\.html$',
  },
  'npr.org': {
    sitemapPaths: ['/sitemap.xml'],
    indexPaths: ['/sections/politics', '/sections/news'],
    articlePattern: '^https://www\\.npr\\.org/\\d{4}/\\d{2}/\\d{2}/\\d+/[^/]+$',
  },
  'aljazeera.com': {
    sitemapPaths: ['/xml/sitemaps/news-sitemap.xml'],
    indexPaths: ['/news', '/where/us'],
    articlePattern: '^https://www\\.aljazeera\\.com/(news|opinions)/\\d{4}/\\d+/\\d+/[^/]+$',
  },
  'nytimes.com': {
    sitemapPaths: ['/sitemaps/news.xml'],
    indexPaths: ['/section/us', '/section/politics'],
    articlePattern: '^https://www\\.nytimes\\.com/\\d{4}/\\d{2}/\\d{2}/[^/]+/[^/]+\\.html$',
  },
  'washingtonpost.com': {
    sitemapPaths: ['/news-sitemap-index.xml'],
    indexPaths: ['/politics', '/nation'],
    articlePattern: '^https://www\\.washingtonpost\\.com/[^/]+/\\d{4}/\\d{2}/\\d{2}/[^/]+/?$',
  },
  'bloomberg.com': {
    sitemapPaths: ['/sitemap_news.xml'],
    indexPaths: ['/politics', '/news'],
    articlePattern: '^https://www\\.bloomberg\\.com/news/articles/\\d{4}-\\d{2}-\\d{2}/[^/]+$',
  },
  'ft.com': {
    sitemapPaths: ['/sitemap.xml'],
    indexPaths: ['/world/us', '/us-politics'],
    articlePattern: '^https://www\\.ft\\.com/content/[a-f0-9-]+$',
  },
  'economist.com': {
    sitemapPaths: ['/sitemap.xml'],
    indexPaths: ['/united-states', '/international'],
    articlePattern: '^https://www\\.economist\\.com/[^/]+/\\d{4}/\\d{2}/\\d{2}/[^/]+$',
  },
  'politico.com': {
    sitemapPaths: ['/sitemap.xml'],
    indexPaths: ['/news/politics', '/news'],
    articlePattern: '^https://www\\.politico\\.com/(news|story)/\\d{4}/\\d{2}/\\d{2}/[^/]+$',
  },
  'thehill.com': {
    sitemapPaths: ['/sitemap.xml'],
    indexPaths: ['/policy', '/homenews'],
    articlePattern: '^https://thehill\\.com/[^/]+/\\d+-.+/?$',
  },
  'axios.com': {
    sitemapPaths: ['/sitemap.xml'],
    indexPaths: ['/politics', '/'],
    articlePattern: '^https://www\\.axios\\.com/\\d{4}/\\d{2}/\\d{2}/[^/]+$',
  },
  'propublica.org': {
    sitemapPaths: ['/sitemap.xml'],
    indexPaths: ['/'],
    articlePattern: '^https://www\\.propublica\\.org/article/[^/]+$',
  },
  'theatlantic.com': {
    sitemapPaths: ['/sitemap/news.xml'],
    indexPaths: ['/politics', '/ideas'],
    articlePattern: '^https://www\\.theatlantic\\.com/[^/]+/archive/\\d{4}/\\d{2}/[^/]+/\\d+/?$',
  },
  'vox.com': {
    sitemapPaths: ['/sitemap.xml', '/rss/index.xml'],
    indexPaths: ['/policy-and-politics', '/'],
    articlePattern: '^https://www\\.vox\\.com/[^/]+/\\d+/\\d+/\\d+/\\d+/[^/]+$',
  },
  'vice.com': {
    sitemapPaths: ['/sitemap.xml'],
    indexPaths: ['/en/section/news'],
    articlePattern: '^https://www\\.vice\\.com/en/article/[^/]+/[^/]+$',
  },
  'apnews.com': {
    sitemapPaths: ['/sitemap.xml'],
    indexPaths: ['/hub/politics', '/hub/donald-trump'],
    articlePattern: '^https://apnews\\.com/article/[a-f0-9]+$',
  },
  'bbc.com': {
    sitemapPaths: ['/sitemap.xml'],
    indexPaths: ['/news/world/us_and_canada', '/news/world'],
    articlePattern: '^https://www\\.bbc\\.com/news/[^/]+-\\d+$',
  },
  'reuters.com': {
    sitemapPaths: ['/sitemap_news_index1.xml'],
    indexPaths: ['/world/us', '/world'],
    articlePattern: '^https://www\\.reuters\\.com/[^/]+/[^/]+/[^/]+-\\d{4}-\\d{2}-\\d{2}/?$',
  },
  'www.aljazeera.com': {
    sitemapPaths: ['/xml/sitemaps/news-sitemap.xml'],
    indexPaths: ['/news', '/where/us'],
    articlePattern: '^https://www\\.aljazeera\\.com/(news|opinions)/\\d{4}/\\d+/\\d+/[^/]+$',
  },
};

(async () => {
  console.log('Configuring sources with crawl strategies...\n');

  let updated = 0;
  let notFound = 0;

  for (const [domain, config] of Object.entries(sourceConfigs)) {
    try {
      const result = await db
        .update(sources)
        .set({
          apiConfig: {
            sitemapPaths: config.sitemapPaths,
            indexPaths: config.indexPaths,
            articlePattern: config.articlePattern,
          },
        })
        .where(eq(sources.domain, domain))
        .returning({ id: sources.id, name: sources.name });

      if (result.length > 0) {
        console.log(`✓ ${result[0].name.padEnd(30)} ${domain}`);
        updated++;
      } else {
        console.log(`✗ Not found: ${domain}`);
        notFound++;
      }
    } catch (error) {
      console.error(`✗ Error updating ${domain}:`, error.message);
    }
  }

  console.log(`\n=== Summary ===`);
  console.log(`Updated: ${updated}`);
  console.log(`Not found: ${notFound}`);

  process.exit(0);
})();
