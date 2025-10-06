import { db } from './db';
import { sources, candidateDomains } from '../../db/schema';
import { eq, sql } from 'drizzle-orm';

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
export function extractLinksFromHTML(html: string, currentDomain: string): string[] {
  const links: string[] = [];

  // Simple regex to find href attributes
  const hrefRegex = /href=["']([^"']+)["']/gi;
  let match;

  while ((match = hrefRegex.exec(html)) !== null) {
    const url = match[1];

    // Only process http/https URLs
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
      continue;
    }

    try {
      const urlObj = new URL(url);
      const domain = urlObj.hostname.replace(/^www\./, '');

      // Skip links to the same domain
      if (domain === currentDomain.replace(/^www\./, '')) {
        continue;
      }

      links.push(domain);
    } catch (e) {
      // Invalid URL, skip
      continue;
    }
  }

  return [...new Set(links)]; // Deduplicate
}

/**
 * Check if a domain is mainstream/well-known
 */
export function isMainstreamDomain(domain: string): boolean {
  const cleanDomain = domain.replace(/^www\./, '').toLowerCase();
  return MAINSTREAM_DOMAINS.has(cleanDomain);
}

/**
 * Test if a domain is crawlable (has sitemap, RSS, etc.)
 */
export async function testDomainCrawlability(domain: string): Promise<{
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
    // Test HTTPS
    const httpsUrl = `https://${domain}`;
    try {
      const response = await fetch(httpsUrl, {
        method: 'HEAD',
        signal: AbortSignal.timeout(5000)
      });
      if (response.ok) {
        result.httpsEnabled = true;
        result.score += 5;
      }
    } catch (e) {
      // HTTPS failed, try HTTP
    }

    // Test sitemap
    const sitemapUrl = `https://${domain}/sitemap.xml`;
    try {
      const response = await fetch(sitemapUrl, {
        method: 'HEAD',
        signal: AbortSignal.timeout(5000)
      });
      if (response.ok) {
        result.hasSitemap = true;
        result.score += 10;
      }
    } catch (e) {
      // No sitemap
    }

    // Test common RSS paths
    const rssPaths = ['/rss', '/feed', '/rss.xml', '/feed.xml', '/atom.xml'];
    for (const path of rssPaths) {
      try {
        const response = await fetch(`https://${domain}${path}`, {
          method: 'HEAD',
          signal: AbortSignal.timeout(5000)
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
    console.error(`Error testing ${domain}:`, error);
  }

  return result;
}

/**
 * Check if a domain is already configured as a source
 */
export async function isExistingSource(domain: string): Promise<boolean> {
  const cleanDomain = domain.replace(/^www\./, '');

  const existing = await db
    .select({ id: sources.id })
    .from(sources)
    .where(eq(sources.domain, cleanDomain))
    .limit(1);

  return existing.length > 0;
}

/**
 * Save discovered domain to candidate_domains table
 */
export async function saveDiscoveredDomain(
  domain: string,
  discoveredVia: string,
  score: number
): Promise<void> {
  const cleanDomain = domain.replace(/^www\./, '');

  // Check if already in candidates
  const existing = await db
    .select({ id: candidateDomains.id })
    .from(candidateDomains)
    .where(eq(candidateDomains.domain, cleanDomain))
    .limit(1);

  if (existing.length === 0) {
    // Insert new candidate
    await db.insert(candidateDomains).values({
      domain: cleanDomain,
      discoveredVia,
      score,
      firstSeenAt: new Date(),
      lastSeenAt: new Date()
    });
  } else {
    // Update existing
    await db
      .update(candidateDomains)
      .set({
        lastSeenAt: new Date(),
        score: sql`GREATEST(${candidateDomains.score}, ${score})`
      })
      .where(eq(candidateDomains.id, existing[0].id));
  }
}

/**
 * Award discovery points to a source for finding a new domain
 */
export async function awardDiscoveryPoints(
  sourceId: number,
  points: number = 1
): Promise<void> {
  await db
    .update(sources)
    .set({
      discoveryPoints: sql`${sources.discoveryPoints} + ${points}`
    })
    .where(eq(sources.id, sourceId));
}
