import { JSDOM } from 'jsdom';
import { Readability } from '@mozilla/readability';

export interface ExtractedArticle {
  canonical_url: string;
  title: string;
  summary: string;
  image_url?: string;
  published_at: Date;
  source_domain: string;
  lang?: string;
  paywalled_bool: boolean;
}

/**
 * Canonicalize URL: prefer <link rel=canonical>, strip UTM params
 */
function canonicalizeUrl(url: string, html: string): string {
  // Try to extract canonical link from HTML
  const canonicalMatch = html.match(/<link[^>]+rel=["']canonical["'][^>]+href=["']([^"']+)["']/i) ||
                         html.match(/<link[^>]+href=["']([^"']+)["'][^>]+rel=["']canonical["']/i);

  let canonical = canonicalMatch ? canonicalMatch[1] : url;

  // Remove UTM and tracking params
  try {
    const urlObj = new URL(canonical);
    const paramsToRemove = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term', 'fbclid', 'gclid'];

    paramsToRemove.forEach(param => urlObj.searchParams.delete(param));

    return urlObj.href;
  } catch {
    return canonical;
  }
}

/**
 * Extract JSON-LD structured data
 */
function extractJsonLd(html: string): Partial<ExtractedArticle> | null {
  const scriptMatches = html.matchAll(/<script[^>]+type=["']application\/ld\+json["'][^>]*>(.*?)<\/script>/gis);

  for (const match of scriptMatches) {
    try {
      const jsonContent = match[1].trim();
      const data = JSON.parse(jsonContent);

      // Handle arrays of JSON-LD objects
      const items = Array.isArray(data) ? data : [data];

      for (const item of items) {
        if (item['@type'] === 'NewsArticle' || item['@type'] === 'Article') {
          return {
            title: item.headline || item.name,
            summary: item.description,
            published_at: item.datePublished ? new Date(item.datePublished) : undefined,
            image_url: typeof item.image === 'string' ? item.image : item.image?.url,
          };
        }
      }
    } catch {
      continue;
    }
  }

  return null;
}

/**
 * Extract metadata from meta tags
 */
function extractMetaTags(html: string): Partial<ExtractedArticle> {
  const result: Partial<ExtractedArticle> = {};

  // Title
  const ogTitle = html.match(/<meta[^>]+property=["']og:title["'][^>]+content=["']([^"']+)["']/i);
  const twitterTitle = html.match(/<meta[^>]+name=["']twitter:title["'][^>]+content=["']([^"']+)["']/i);
  const titleTag = html.match(/<title>([^<]+)<\/title>/i);

  result.title = ogTitle?.[1] || twitterTitle?.[1] || titleTag?.[1];

  // Description
  const ogDesc = html.match(/<meta[^>]+property=["']og:description["'][^>]+content=["']([^"']+)["']/i);
  const metaDesc = html.match(/<meta[^>]+name=["']description["'][^>]+content=["']([^"']+)["']/i);

  result.summary = ogDesc?.[1] || metaDesc?.[1];

  // Image
  const ogImage = html.match(/<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/i);
  const twitterImage = html.match(/<meta[^>]+name=["']twitter:image["'][^>]+content=["']([^"']+)["']/i);

  result.image_url = ogImage?.[1] || twitterImage?.[1];

  // Published date
  const articlePublished = html.match(/<meta[^>]+property=["']article:published_time["'][^>]+content=["']([^"']+)["']/i);
  const publishedTime = html.match(/<meta[^>]+name=["']publish(ed)?[-_]?(date|time)["'][^>]+content=["']([^"']+)["']/i);

  const dateStr = articlePublished?.[1] || publishedTime?.[3];
  if (dateStr) {
    try {
      result.published_at = new Date(dateStr);
    } catch {
      // Invalid date
    }
  }

  return result;
}

/**
 * Detect language from HTML
 */
function detectLanguage(html: string): string | undefined {
  // HTML lang attribute
  const htmlLang = html.match(/<html[^>]+lang=["']([^"']+)["']/i);
  if (htmlLang) return htmlLang[1].split('-')[0]; // e.g., en-US -> en

  // Meta tag
  const metaLang = html.match(/<meta[^>]+http-equiv=["']content-language["'][^>]+content=["']([^"']+)["']/i);
  if (metaLang) return metaLang[1].split('-')[0];

  return undefined;
}

/**
 * Detect paywall indicators
 */
function detectPaywall(html: string): boolean {
  const paywallIndicators = [
    /paywall/i,
    /subscriber.{0,20}only/i,
    /premium.{0,20}content/i,
    /login.{0,20}to.{0,20}continue/i,
    /subscribe.{0,20}to.{0,20}read/i,
  ];

  return paywallIndicators.some(pattern => pattern.test(html));
}

/**
 * Extract article using Readability as fallback
 */
function extractWithReadability(html: string, url: string): Partial<ExtractedArticle> {
  try {
    const dom = new JSDOM(html, { url });
    const reader = new Readability(dom.window.document);
    const article = reader.parse();

    if (!article) return {};

    return {
      title: article.title,
      summary: article.excerpt,
      // Readability doesn't provide published date or image
    };
  } catch {
    return {};
  }
}

/**
 * Main extraction function
 */
export async function extractArticle(url: string, html: string): Promise<ExtractedArticle | null> {
  try {
    const canonical_url = canonicalizeUrl(url, html);
    const source_domain = new URL(url).hostname;
    const lang = detectLanguage(html);
    const paywalled_bool = detectPaywall(html);

    // Try JSON-LD first
    let extracted = extractJsonLd(html);

    // Fallback to meta tags
    if (!extracted || !extracted.title) {
      extracted = { ...extracted, ...extractMetaTags(html) };
    }

    // Last resort: Readability
    if (!extracted.title || !extracted.summary) {
      const readabilityData = extractWithReadability(html, url);
      extracted = { ...extracted, ...readabilityData };
    }

    // Validate required fields
    if (!extracted.title) {
      return null;
    }

    // Use current time if no published_at found
    const published_at = extracted.published_at || new Date();

    return {
      canonical_url,
      title: extracted.title,
      summary: extracted.summary || '',
      image_url: extracted.image_url,
      published_at,
      source_domain,
      lang,
      paywalled_bool,
    };
  } catch (error) {
    console.error(`Extraction failed for ${url}:`, error);
    return null;
  }
}
