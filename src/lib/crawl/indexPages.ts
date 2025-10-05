import { fetchHtml } from '../http';

/**
 * Extract article links from an index page using heuristics
 */
function extractArticleLinks(html: string, baseUrl: string): string[] {
  const links: Set<string> = new Set();

  // Common article URL patterns
  const articlePatterns = [
    /\/news\//i,
    /\/article\//i,
    /\/actualites\//i,
    /\/politique\//i,
    /\/societe\//i,
    /\/economy\//i,
    /\/economie\//i,
    /\/world\//i,
    /\/monde\//i,
    /\/sport\//i,
    /\/culture\//i,
    /\/tech\//i,
    /\/science\//i,
    /\/\d{4}\/\d{2}\//,  // Date-based URLs (e.g., /2024/01/)
  ];

  // Extract all href attributes
  const hrefMatches = html.matchAll(/href=["'](.*?)["']/gi);

  for (const match of hrefMatches) {
    let url = match[1].trim();

    // Skip non-article links
    if (!url || url.startsWith('#') || url.startsWith('javascript:')) continue;
    if (url.startsWith('mailto:') || url.startsWith('tel:')) continue;

    // Skip common non-article paths
    if (
      url.includes('/author/') ||
      url.includes('/tag/') ||
      url.includes('/category/') ||
      url.includes('/page/') ||
      url.includes('/search') ||
      url.includes('/login') ||
      url.includes('/register')
    ) {
      continue;
    }

    // Normalize to absolute URL
    try {
      const absoluteUrl = new URL(url, baseUrl);

      // Only include URLs from the same domain
      if (absoluteUrl.hostname !== new URL(baseUrl).hostname) continue;

      // Check if URL matches article patterns
      const matchesPattern = articlePatterns.some(pattern =>
        pattern.test(absoluteUrl.pathname)
      );

      if (matchesPattern) {
        links.add(absoluteUrl.href);
      }
    } catch {
      // Skip invalid URLs
    }
  }

  return Array.from(links);
}

/**
 * Get recent article URLs from index/category pages
 */
export async function getRecentFromIndexPages(
  domain: string,
  categoryPaths: string[] = ['/news', '/latest', '/actualites'],
  maxUrls = 100
): Promise<string[]> {
  const allLinks: Set<string> = new Set();

  // Limit to 3 category pages to avoid overload
  const pathsToFetch = categoryPaths.slice(0, 3);

  for (const path of pathsToFetch) {
    try {
      const url = `https://${domain}${path}`;
      const result = await fetchHtml(url, { timeoutMs: 10000, maxRetries: 2 });

      if (result.status !== 200) continue;

      const links = extractArticleLinks(result.html, url);
      links.forEach(link => allLinks.add(link));

      // Early exit if we have enough links
      if (allLinks.size >= maxUrls) break;
    } catch {
      // Skip failed pages
      continue;
    }
  }

  return Array.from(allLinks).slice(0, maxUrls);
}
