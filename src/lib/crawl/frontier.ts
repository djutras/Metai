import { getRecentFromSitemaps } from './sitemap';
import { getRecentFromIndexPages } from './indexPages';
import { db } from '../db';
import { articles } from '../../../db/schema';
import { inArray } from 'drizzle-orm';

interface Site {
  domain: string;
  indexPaths?: string[];
  maxUrlsPerDomain?: number;
  articlePattern?: string;
}

interface Topic {
  slug: string;
  freshnessHours: number;
}

/**
 * Simple Bloom filter for quick duplicate detection
 */
class BloomFilter {
  private bits: Uint8Array;
  private size: number;

  constructor(expectedItems = 10000) {
    this.size = expectedItems * 10; // 10 bits per item
    this.bits = new Uint8Array(Math.ceil(this.size / 8));
  }

  private hash(str: string, seed: number): number {
    let hash = seed;
    for (let i = 0; i < str.length; i++) {
      hash = (hash * 31 + str.charCodeAt(i)) >>> 0;
    }
    return hash % this.size;
  }

  add(item: string): void {
    for (let i = 0; i < 3; i++) {
      const pos = this.hash(item, i);
      const byteIndex = Math.floor(pos / 8);
      const bitIndex = pos % 8;
      this.bits[byteIndex] |= 1 << bitIndex;
    }
  }

  mightContain(item: string): boolean {
    for (let i = 0; i < 3; i++) {
      const pos = this.hash(item, i);
      const byteIndex = Math.floor(pos / 8);
      const bitIndex = pos % 8;
      if ((this.bits[byteIndex] & (1 << bitIndex)) === 0) {
        return false;
      }
    }
    return true;
  }
}

/**
 * Build frontier of candidate URLs from sitemaps and index pages
 */
export async function buildFrontier(
  topic: Topic,
  sites: Site[]
): Promise<string[]> {
  const bloomFilter = new BloomFilter(5000);
  const candidateUrls: string[] = [];

  // Fetch candidates from each site
  for (const site of sites) {
    try {
      const maxPerDomain = site.maxUrlsPerDomain || 30;
      let urls: string[] = [];

      // Try sitemaps first (more reliable)
      try {
        const sitemapUrls = await getRecentFromSitemaps(
          site.domain,
          topic.freshnessHours,
          maxPerDomain
        );
        urls.push(...sitemapUrls);
      } catch (error) {
        console.warn(`Sitemap fetch failed for ${site.domain}:`, error);
      }

      // Fallback to index pages if not enough URLs from sitemap
      if (urls.length < maxPerDomain / 2 && site.indexPaths) {
        try {
          const indexUrls = await getRecentFromIndexPages(
            site.domain,
            site.indexPaths,
            maxPerDomain - urls.length
          );
          urls.push(...indexUrls);
        } catch (error) {
          console.warn(`Index page fetch failed for ${site.domain}:`, error);
        }
      }

      // Skip pattern filtering - let quality gates handle it
      let filteredUrls = urls;
      // if (site.articlePattern) {
      //   try {
      //     const pattern = new RegExp(site.articlePattern);
      //     filteredUrls = urls.filter(url => pattern.test(url));
      //     console.log(`  Filtered ${urls.length} → ${filteredUrls.length} URLs using pattern for ${site.domain}`);
      //   } catch (error) {
      //     console.warn(`  Invalid article pattern for ${site.domain}:`, error);
      //     filteredUrls = urls;
      //   }
      // }

      // Add to candidates with Bloom filter deduplication
      for (const url of filteredUrls) {
        if (!bloomFilter.mightContain(url)) {
          bloomFilter.add(url);
          candidateUrls.push(url);
        }
      }
    } catch (error) {
      console.error(`Failed to fetch from ${site.domain}:`, error);
      continue;
    }
  }

  // Remove already-seen URLs via DB lookup
  if (candidateUrls.length === 0) return [];

  const seenArticles = await db
    .select({ canonicalUrl: articles.canonicalUrl })
    .from(articles)
    .where(inArray(articles.canonicalUrl, candidateUrls));

  const seenUrls = new Set(seenArticles.map(a => a.canonicalUrl));
  const newUrls = candidateUrls.filter(url => !seenUrls.has(url));

  console.log(
    `Frontier built: ${candidateUrls.length} candidates, ${newUrls.length} new URLs`
  );

  return newUrls;
}
