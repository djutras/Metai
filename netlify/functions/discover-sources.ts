import type { Handler, HandlerEvent } from '@netlify/functions';
import { neon } from '@neondatabase/serverless';
import {
  extractLinksFromHTML,
  isMainstreamDomain,
  testDomainCrawlability,
  isExistingSource,
  saveDiscoveredDomain,
  awardDiscoveryPoints
} from '../../src/lib/discover';

const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
  throw new Error('DATABASE_URL is required');
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

    // Get recent articles for this topic (last 100)
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
      LIMIT 100
    `;

    console.log(`Analyzing ${articles.length} articles for outbound links`);

    const discoveries: any[] = [];
    const domainsSeen = new Set<string>();

    // Process each article
    for (const article of articles) {
      try {
        // Fetch article HTML
        const response = await fetch(article.canonical_url, {
          signal: AbortSignal.timeout(10000)
        });

        if (!response.ok) continue;

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
          const exists = await isExistingSource(domain);
          if (exists) continue;

          console.log(`Testing new domain: ${domain}`);

          // Test crawlability
          const crawlability = await testDomainCrawlability(domain);

          // Only keep domains with some score
          if (crawlability.score > 0) {
            // Save to candidate_domains
            await saveDiscoveredDomain(
              domain,
              article.source_name || sourceDomain,
              crawlability.score
            );

            // Award discovery points to the source
            if (article.source_id) {
              await awardDiscoveryPoints(article.source_id, 1);
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
