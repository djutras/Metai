import type { Handler, HandlerEvent } from '@netlify/functions';
import { neon } from '@neondatabase/serverless';

const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
  throw new Error('DATABASE_URL is required');
}

// Mainstream domains to exclude from discovery
const MAINSTREAM_DOMAINS = new Set([
  'nytimes.com', 'washingtonpost.com', 'wsj.com', 'ft.com',
  'cnn.com', 'bbc.com', 'reuters.com', 'apnews.com',
  'theguardian.com', 'bloomberg.com', 'economist.com',
  'twitter.com', 'x.com', 'facebook.com', 'youtube.com',
  'instagram.com', 'linkedin.com', 'reddit.com', 'tiktok.com',
  'google.com', 'wikipedia.org', 'amazon.com'
]);

/**
 * Extract all external links from article HTML content
 */
function extractLinksFromHTML(html: string, currentDomain: string): string[] {
  const links: string[] = [];
  const hrefRegex = /href=["']([^"']+)["']/gi;
  let match;

  while ((match = hrefRegex.exec(html)) !== null) {
    const url = match[1];

    if (!url.startsWith('http://') && !url.startsWith('https://')) {
      continue;
    }

    try {
      const urlObj = new URL(url);
      const domain = urlObj.hostname.replace(/^www\./, '');

      if (domain === currentDomain.replace(/^www\./, '')) {
        continue;
      }

      links.push(domain);
    } catch (e) {
      continue;
    }
  }

  return [...new Set(links)];
}

/**
 * Check if a domain is mainstream/well-known
 */
function isMainstreamDomain(domain: string): boolean {
  const cleanDomain = domain.replace(/^www\./, '').toLowerCase();
  return MAINSTREAM_DOMAINS.has(cleanDomain);
}

/**
 * Test if a domain is crawlable
 */
async function testDomainCrawlability(domain: string): Promise<{
  hasSitemap: boolean;
  hasRSS: boolean;
  httpsEnabled: boolean;
  score: number;
}> {
  const result = {
    hasSitemap: false,
    hasRSS: false,
    httpsEnabled: false,
    score: 0
  };

  try {
    const httpsUrl = `https://${domain}`;
    try {
      const response = await fetch(httpsUrl, {
        method: 'HEAD',
        signal: AbortSignal.timeout(2000)
      });
      if (response.ok) {
        result.httpsEnabled = true;
        result.score += 5;
      }
    } catch (e) {
      // HTTPS failed
    }

    const sitemapUrl = `https://${domain}/sitemap.xml`;
    try {
      const response = await fetch(sitemapUrl, {
        method: 'HEAD',
        signal: AbortSignal.timeout(2000)
      });
      if (response.ok) {
        result.hasSitemap = true;
        result.score += 10;
      }
    } catch (e) {
      // No sitemap
    }

    // Only test first RSS path to save time
    const rssPaths = ['/feed', '/rss'];
    for (const path of rssPaths) {
      try {
        const response = await fetch(`https://${domain}${path}`, {
          method: 'HEAD',
          signal: AbortSignal.timeout(2000)
        });
        if (response.ok) {
          result.hasRSS = true;
          result.score += 10;
          break;
        }
      } catch (e) {
        continue;
      }
    }
  } catch (error) {
    // Silently fail - timeout is expected for many domains
  }

  return result;
}

const handler: Handler = async (event: HandlerEvent) => {
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: 'Method not allowed' }),
    };
  }

  const { topicId } = JSON.parse(event.body || '{}');

  if (!topicId) {
    return {
      statusCode: 400,
      body: JSON.stringify({ error: 'topicId is required' }),
    };
  }

  try {
    const sql = neon(DATABASE_URL);

    console.log(`Starting source discovery for topic ${topicId}`);

    // Get recent articles for this topic (last 10 to stay under timeout)
    const articles = await sql`
      SELECT
        a.id,
        a.canonical_url,
        a.source_id,
        s.domain as source_domain,
        s.name as source_name
      FROM topic_articles ta
      JOIN articles a ON ta.article_id = a.id
      LEFT JOIN sources s ON a.source_id = s.id
      WHERE ta.topic_id = ${topicId}
      ORDER BY ta.added_at DESC
      LIMIT 10
    `;

    console.log(`Analyzing ${articles.length} articles for outbound links (Netlify timeout: 10s)`);

    const discoveries: any[] = [];
    const domainsSeen = new Set<string>();

    // Process each article
    for (const article of articles) {
      try {
        // Fetch article HTML with short timeout
        const response = await fetch(article.canonical_url, {
          signal: AbortSignal.timeout(3000)
        });

        if (!response.ok) {
          console.log(`Skipping ${article.canonical_url}: status ${response.status}`);
          continue;
        }

        const html = await response.text();
        const sourceDomain = article.source_domain || '';

        // Extract links from HTML
        const links = extractLinksFromHTML(html, sourceDomain);

        // Process each discovered domain
        for (const domain of links) {
          // Skip if already processed in this run
          if (domainsSeen.has(domain)) continue;
          domainsSeen.add(domain);

          // Filter out mainstream domains
          if (isMainstreamDomain(domain)) continue;

          // Check if already a configured source
          const cleanDomain = domain.replace(/^www\./, '');
          const existingSource = await sql`
            SELECT id FROM sources WHERE domain = ${cleanDomain} LIMIT 1
          `;
          if (existingSource.length > 0) continue;

          console.log(`Testing new domain: ${domain}`);

          // Test crawlability
          const crawlability = await testDomainCrawlability(domain);

          // Only keep domains with some score
          if (crawlability.score > 0) {
            // Save to candidate_domains
            const existingCandidate = await sql`
              SELECT id FROM candidate_domains WHERE domain = ${cleanDomain} LIMIT 1
            `;

            if (existingCandidate.length === 0) {
              await sql`
                INSERT INTO candidate_domains (domain, discovered_via, score, first_seen_at, last_seen_at)
                VALUES (${cleanDomain}, ${article.source_name || sourceDomain}, ${crawlability.score}, NOW(), NOW())
              `;
            } else {
              await sql`
                UPDATE candidate_domains
                SET last_seen_at = NOW(),
                    score = GREATEST(score, ${crawlability.score})
                WHERE id = ${existingCandidate[0].id}
              `;
            }

            // Award discovery points to the source
            if (article.source_id) {
              await sql`
                UPDATE sources
                SET discovery_points = discovery_points + 1
                WHERE id = ${article.source_id}
              `;
            }

            discoveries.push({
              domain,
              discovered_via: article.source_name || sourceDomain,
              discovered_in: article.canonical_url,
              score: crawlability.score,
              has_sitemap: crawlability.hasSitemap,
              has_rss: crawlability.hasRSS,
              https_enabled: crawlability.httpsEnabled
            });

            console.log(`✅ Discovered: ${domain} (score: ${crawlability.score})`);
          }
        }
      } catch (error) {
        console.error(`Error processing article ${article.canonical_url}:`, error);
        continue;
      }
    }

    console.log(`Discovery complete: found ${discoveries.length} new domains`);

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        discoveries,
        total_articles_analyzed: articles.length,
        total_domains_discovered: discoveries.length
      }),
    };

  } catch (error) {
    console.error('Error during source discovery:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Failed to discover sources' }),
    };
  }
};

export { handler };
