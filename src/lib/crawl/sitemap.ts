import { fetchXml } from '../http';

interface SitemapEntry {
  url: string;
  lastmod?: string;
}

/**
 * Parse XML sitemap and extract URLs with lastmod
 */
function parseSitemap(xml: string): SitemapEntry[] {
  const entries: SitemapEntry[] = [];

  // Simple XML parsing without heavy dependencies
  const urlMatches = xml.matchAll(/<url>(.*?)<\/url>/gs);

  for (const match of urlMatches) {
    const urlBlock = match[1];
    const locMatch = urlBlock.match(/<loc>(.*?)<\/loc>/);
    const lastmodMatch = urlBlock.match(/<lastmod>(.*?)<\/lastmod>/);

    if (locMatch) {
      entries.push({
        url: locMatch[1].trim(),
        lastmod: lastmodMatch?.[1].trim(),
      });
    }
  }

  return entries;
}

/**
 * Parse sitemap index and extract sitemap URLs
 */
function parseSitemapIndex(xml: string): string[] {
  const sitemaps: string[] = [];
  const sitemapMatches = xml.matchAll(/<sitemap>(.*?)<\/sitemap>/gs);

  for (const match of sitemapMatches) {
    const sitemapBlock = match[1];
    const locMatch = sitemapBlock.match(/<loc>(.*?)<\/loc>/);
    if (locMatch) {
      sitemaps.push(locMatch[1].trim());
    }
  }

  return sitemaps;
}

/**
 * Check if a lastmod timestamp is recent (within hours)
 */
function isRecent(lastmod: string | undefined, hoursAgo = 48): boolean {
  if (!lastmod) return false;

  try {
    const date = new Date(lastmod);
    const now = new Date();
    const diffHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60);
    return diffHours <= hoursAgo;
  } catch {
    return false;
  }
}

/**
 * Get recent URLs from sitemaps for a domain
 */
export async function getRecentFromSitemaps(
  domain: string,
  freshnessHours = 48,
  maxUrls = 200
): Promise<string[]> {
  const sitemapUrls = [
    `https://${domain}/sitemap.xml`,
    `https://${domain}/sitemap_index.xml`,
    `https://${domain}/news-sitemap.xml`,
    `https://${domain}/sitemap-news.xml`,
  ];

  const allEntries: SitemapEntry[] = [];

  for (const sitemapUrl of sitemapUrls) {
    try {
      const result = await fetchXml(sitemapUrl, { timeoutMs: 10000, maxRetries: 2 });

      if (result.status !== 200) continue;

      // Check if it's a sitemap index
      if (result.html.includes('<sitemapindex')) {
        const childSitemaps = parseSitemapIndex(result.html);

        // Prioritize news sitemaps
        const newsSitemaps = childSitemaps.filter(url =>
          url.includes('news') || url.includes('article')
        );
        const sitemapsToFetch = [...newsSitemaps, ...childSitemaps].slice(0, 5);

        for (const childUrl of sitemapsToFetch) {
          try {
            const childResult = await fetchXml(childUrl, { timeoutMs: 10000, maxRetries: 1 });
            if (childResult.status === 200) {
              const entries = parseSitemap(childResult.html);
              allEntries.push(...entries);
            }
          } catch {
            // Skip failed child sitemaps
          }
        }
      } else {
        // Regular sitemap
        const entries = parseSitemap(result.html);
        allEntries.push(...entries);
      }
    } catch {
      // Skip failed sitemaps
      continue;
    }
  }

  // Filter by recency and sort by lastmod
  const recentEntries = allEntries
    .filter(entry => isRecent(entry.lastmod, freshnessHours))
    .sort((a, b) => {
      if (!a.lastmod || !b.lastmod) return 0;
      return new Date(b.lastmod).getTime() - new Date(a.lastmod).getTime();
    })
    .slice(0, maxUrls);

  return recentEntries.map(e => e.url);
}
