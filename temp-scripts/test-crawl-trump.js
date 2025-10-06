const { neon } = require('@neondatabase/serverless');
const { JSDOM } = require('jsdom');

const DATABASE_URL = 'postgresql://neondb_owner:npg_IZm4bMTkdxR5@ep-icy-pond-aevzfm4q-pooler.c-2.us-east-2.aws.neon.tech/neondb?sslmode=require';

async function fetchHtml(url) {
  const response = await fetch(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (compatible; MetaiBot/1.0; +https://obscureai.netlify.app/about)',
    },
  });

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}`);
  }

  return await response.text();
}

function extractArticleLinks(html, domain) {
  const dom = new JSDOM(html);
  const document = dom.window.document;

  const links = [];
  const seenUrls = new Set();

  // Find all article links
  const anchors = document.querySelectorAll('a[href]');

  anchors.forEach(a => {
    const href = a.getAttribute('href');
    if (!href) return;

    // Build full URL
    let fullUrl;
    try {
      if (href.startsWith('http')) {
        fullUrl = href;
      } else if (href.startsWith('/')) {
        fullUrl = `https://${domain}${href}`;
      } else {
        return;
      }

      // Only include articles from the same domain
      const url = new URL(fullUrl);
      if (url.hostname !== domain && url.hostname !== `www.${domain}`) return;

      // Check if URL or text mentions Trump
      const text = a.textContent.toLowerCase();
      const urlLower = fullUrl.toLowerCase();

      if (text.includes('trump') || urlLower.includes('trump')) {
        if (!seenUrls.has(fullUrl)) {
          seenUrls.add(fullUrl);
          links.push({
            url: fullUrl,
            text: a.textContent.trim().substring(0, 100),
          });
        }
      }
    } catch (e) {
      // Invalid URL
    }
  });

  return links;
}

(async () => {
  const sql = neon(DATABASE_URL);

  console.log('Testing Trump crawl for Al Jazeera...\n');

  try {
    // Fetch Al Jazeera homepage
    console.log('Step 1: Fetching https://www.aljazeera.com/...');
    const html = await fetchHtml('https://www.aljazeera.com/');
    console.log('✓ Homepage fetched\n');

    // Extract Trump-related article links
    console.log('Step 2: Extracting Trump-related articles...');
    const trumpArticles = extractArticleLinks(html, 'aljazeera.com');
    console.log(`✓ Found ${trumpArticles.length} Trump-related links\n`);

    if (trumpArticles.length === 0) {
      console.log('No Trump articles found on homepage. Trying search page...\n');

      // Try Al Jazeera search for Trump
      const searchUrl = 'https://www.aljazeera.com/search/trump';
      console.log(`Fetching ${searchUrl}...`);
      const searchHtml = await fetchHtml(searchUrl);
      const searchArticles = extractArticleLinks(searchHtml, 'aljazeera.com');

      console.log(`✓ Found ${searchArticles.length} articles from search\n`);
      trumpArticles.push(...searchArticles);
    }

    // Display found articles
    console.log('=== Trump-related articles found ===\n');
    trumpArticles.slice(0, 10).forEach((article, i) => {
      console.log(`${i + 1}. ${article.text}`);
      console.log(`   ${article.url}\n`);
    });

    if (trumpArticles.length > 10) {
      console.log(`... and ${trumpArticles.length - 10} more\n`);
    }

    // Get Trump topic info
    console.log('\n=== Trump Topic Info ===');
    const trumpTopic = await sql`
      SELECT * FROM topics WHERE id = 2
    `;

    if (trumpTopic.length > 0) {
      const topic = trumpTopic[0];
      console.log(`Name: ${topic.name}`);
      console.log(`Slug: ${topic.slug}`);
      console.log(`Query: ${topic.query || 'None'}`);
      console.log(`Includes: ${topic.includes?.join(', ') || 'None'}`);
      console.log(`Excludes: ${topic.excludes?.join(', ') || 'None'}`);
    }

    // Check if Al Jazeera is linked to Trump topic
    console.log('\n=== Source-Topic Link ===');
    const sourceLink = await sql`
      SELECT st.*, s.name, s.domain, t.name as topic_name
      FROM sources_topics st
      JOIN sources s ON st.source_id = s.id
      JOIN topics t ON st.topic_id = t.id
      WHERE s.domain = 'aljazeera.com' AND st.topic_id = 2
    `;

    if (sourceLink.length > 0) {
      console.log(`✓ Al Jazeera is linked to Trump topic`);
      console.log(`  Source: ${sourceLink[0].name}`);
      console.log(`  Topic: ${sourceLink[0].topic_name}`);
    } else {
      console.log('✗ Al Jazeera is NOT linked to Trump topic');
    }

  } catch (error) {
    console.error('Error:', error.message);
    console.error('Full error:', error);
  }
})();
