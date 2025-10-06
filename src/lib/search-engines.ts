import { fetchHtml } from './http';

export interface SearchResult {
  domain: string;
  url: string;
  title?: string;
}

/**
 * Extract unique domains from search results
 */
function extractDomainsFromUrls(urls: string[]): string[] {
  const domains = new Set<string>();

  for (const url of urls) {
    try {
      const urlObj = new URL(url);
      const hostname = urlObj.hostname.replace(/^www\./, '');

      // Filter out common non-news domains
      if (
        !hostname.includes('facebook.com') &&
        !hostname.includes('twitter.com') &&
        !hostname.includes('instagram.com') &&
        !hostname.includes('youtube.com') &&
        !hostname.includes('linkedin.com') &&
        !hostname.includes('reddit.com') &&
        !hostname.includes('duckduckgo.com') &&
        !hostname.includes('google.com') &&
        !hostname.includes('bing.com')
      ) {
        domains.add(hostname);
      }
    } catch {
      // Skip invalid URLs
    }
  }

  return Array.from(domains);
}

/**
 * Search DuckDuckGo HTML (no API key needed)
 */
export async function searchDuckDuckGo(query: string, maxResults: number = 20): Promise<SearchResult[]> {
  const results: SearchResult[] = [];

  try {
    const searchUrl = `https://html.duckduckgo.com/html/?q=${encodeURIComponent(query)}`;

    const response = await fetchHtml(searchUrl, {
      timeoutMs: 10000,
      maxRetries: 2,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5',
      },
    });

    if (response.status !== 200) {
      console.warn(`DuckDuckGo search failed with status ${response.status}`);
      return results;
    }

    // Parse HTML to extract result links
    // DuckDuckGo HTML format: <a class="result__url" href="...">
    const urlPattern = /<a[^>]+class="[^"]*result__url[^"]*"[^>]+href="([^"]+)"/gi;
    const matches = response.html.matchAll(urlPattern);

    for (const match of matches) {
      if (results.length >= maxResults) break;

      try {
        // DDG uses //duckduckgo.com/l/?uddg= redirect URLs
        let url = match[1];

        // Decode DDG redirect
        if (url.includes('uddg=')) {
          const uddgMatch = url.match(/uddg=([^&]+)/);
          if (uddgMatch) {
            url = decodeURIComponent(uddgMatch[1]);
          }
        }

        const urlObj = new URL(url);
        const domain = urlObj.hostname.replace(/^www\./, '');

        results.push({
          domain,
          url,
        });
      } catch {
        // Skip invalid URL
      }
    }
  } catch (error) {
    console.error('DuckDuckGo search error:', error);
  }

  return results;
}


/**
 * Search Brave Search API
 * Requires BRAVE_SEARCH_API_KEY environment variable
 */
export async function searchBrave(query: string, maxResults: number = 20): Promise<SearchResult[]> {
  const results: SearchResult[] = [];
  const apiKey = process.env.BRAVE_SEARCH_API_KEY;

  if (!apiKey) {
    console.warn('BRAVE_SEARCH_API_KEY not set, skipping Brave search');
    return results;
  }

  try {
    const searchUrl = `https://api.search.brave.com/res/v1/web/search?q=${encodeURIComponent(query)}&count=${maxResults}`;

    const response = await fetch(searchUrl, {
      headers: {
        'Accept': 'application/json',
        'X-Subscription-Token': apiKey,
      },
    });

    if (!response.ok) {
      console.warn(`Brave search failed with status ${response.status}`);
      return results;
    }

    const data = await response.json() as any;

    if (data.web?.results) {
      for (const item of data.web.results) {
        try {
          const urlObj = new URL(item.url);
          const domain = urlObj.hostname.replace(/^www\./, '');

          results.push({
            domain,
            url: item.url,
            title: item.title,
          });
        } catch {
          // Skip invalid URL
        }
      }
    }
  } catch (error) {
    console.error('Brave search error:', error);
  }

  return results;
}

/**
 * Unified search across multiple engines
 */
export async function searchAllEngines(query: string, maxPerEngine: number = 20): Promise<string[]> {
  console.log(`Searching for: "${query}"`);

  const [ddgResults, braveResults] = await Promise.all([
    searchDuckDuckGo(query, maxPerEngine),
    searchBrave(query, maxPerEngine),
  ]);

  const allResults = [...ddgResults, ...braveResults];
  const domains = extractDomainsFromUrls(allResults.map(r => r.url));

  console.log(`  DuckDuckGo: ${ddgResults.length} results`);
  console.log(`  Brave: ${braveResults.length} results`);
  console.log(`  Unique domains: ${domains.length}`);

  return domains;
}

/**
 * Mine news aggregators for domains
 */
export async function mineNewsAggregators(): Promise<string[]> {
  const domains = new Set<string>();

  // AllTop - news categories
  try {
    const response = await fetchHtml('https://alltop.com/news', { timeoutMs: 10000 });
    if (response.status === 200) {
      const urlMatches = response.html.matchAll(/href=["'](https?:\/\/[^"']+)["']/gi);
      for (const match of urlMatches) {
        try {
          const url = new URL(match[1]);
          const domain = url.hostname.replace(/^www\./, '');
          if (!domain.includes('alltop.com')) {
            domains.add(domain);
          }
        } catch {
          // Skip
        }
      }
    }
  } catch (error) {
    console.error('AllTop mining error:', error);
  }

  // Add more aggregators here (Techmeme, etc.)

  return Array.from(domains);
}

/**
 * Mine Reddit for domains (from top posts)
 */
export async function mineReddit(subreddit: string = 'worldnews'): Promise<string[]> {
  const domains = new Set<string>();

  try {
    const response = await fetchHtml(`https://www.reddit.com/r/${subreddit}/top/.json?limit=100`, {
      timeoutMs: 10000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; NewsBot/1.0)',
      },
    });

    if (response.status === 200) {
      const data = JSON.parse(response.html);

      if (data?.data?.children) {
        for (const post of data.data.children) {
          const url = post.data?.url;
          if (url && url.startsWith('http')) {
            try {
              const urlObj = new URL(url);
              const domain = urlObj.hostname.replace(/^www\./, '');
              if (!domain.includes('reddit.com')) {
                domains.add(domain);
              }
            } catch {
              // Skip
            }
          }
        }
      }
    }
  } catch (error) {
    console.error(`Reddit mining error (${subreddit}):`, error);
  }

  return Array.from(domains);
}
