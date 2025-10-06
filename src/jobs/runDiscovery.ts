import { db } from '../lib/db';
import { candidateDomains, candidateProbes, sources, articles, topics, sourcesTopics } from '../../db/schema';
import { sql, eq } from 'drizzle-orm';
import { getRobots } from '../lib/robots';
import { fetchHtml, fetchXml } from '../lib/http';
import { searchAllEngines, mineNewsAggregators, mineReddit } from '../lib/search-engines';

interface DiscoveryStats {
  candidatesFound: number;
  candidatesProbed: number;
  autoPromoted: number;
  errors: number;
}

/**
 * Extract outbound domains from article HTML
 */
function extractOutboundDomains(html: string, sourceDomain: string): string[] {
  const domains = new Set<string>();
  const hrefMatches = html.matchAll(/href=["'](https?:\/\/[^"']+)["']/gi);

  for (const match of hrefMatches) {
    try {
      const url = new URL(match[1]);
      if (url.hostname !== sourceDomain && !url.hostname.includes('facebook.com') && !url.hostname.includes('twitter.com')) {
        domains.add(url.hostname);
      }
    } catch {
      // Skip invalid URLs
    }
  }

  return Array.from(domains);
}

/**
 * Mine outbound links from recent articles
 */
async function mineOutboundLinks(): Promise<string[]> {
  // Get recent articles (last 7 days)
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

  const recentArticles = await db
    .select({
      canonicalUrl: articles.canonicalUrl,
      sourceDomain: sources.domain,
    })
    .from(articles)
    .leftJoin(sources, eq(articles.sourceId, sources.id))
    .where(sql`${articles.firstSeenAt} >= ${sevenDaysAgo}`)
    .limit(100);

  const domains = new Set<string>();

  for (const article of recentArticles) {
    try {
      // Fetch article to extract outbound links
      const result = await fetchHtml(article.canonicalUrl, { timeoutMs: 10000, maxRetries: 1 });
      if (result.status === 200) {
        const outbound = extractOutboundDomains(result.html, article.sourceDomain || '');
        outbound.forEach(d => domains.add(d));
      }
    } catch {
      // Skip failed fetches
    }

    // Limit to avoid long runtime
    if (domains.size > 50) break;
  }

  return Array.from(domains);
}

/**
 * Load seed domains from static list
 */
function loadSeedDomains(): string[] {
  // This would normally load from a JSON file
  // For now, return a small hardcoded list
  return [
    'reuters.com',
    'apnews.com',
    'bbc.com',
    'france24.com',
    'lemonde.fr',
  ];
}

/**
 * Probe a candidate domain
 */
async function probeDomain(domain: string): Promise<{
  hasSitemap: boolean;
  hasFeed: boolean;
  jsonldNews: boolean;
  lastmodRecent: boolean;
  lang?: string;
  score: number;
}> {
  const result = {
    hasSitemap: false,
    hasFeed: false,
    jsonldNews: false,
    lastmodRecent: false,
    lang: undefined as string | undefined,
    score: 0,
  };

  // Check sitemap
  try {
    const sitemapResult = await fetchXml(`https://${domain}/sitemap.xml`, { timeoutMs: 5000, maxRetries: 1 });
    if (sitemapResult.status === 200) {
      result.hasSitemap = true;
      result.score += 30;

      // Check for recent lastmod
      const lastmodMatch = sitemapResult.html.match(/<lastmod>(\d{4}-\d{2}-\d{2})/);
      if (lastmodMatch) {
        const lastmodDate = new Date(lastmodMatch[1]);
        const daysSince = (Date.now() - lastmodDate.getTime()) / (1000 * 60 * 60 * 24);
        if (daysSince <= 7) {
          result.lastmodRecent = true;
          result.score += 20;
        }
      }
    }
  } catch {
    // No sitemap
  }

  // Check RSS/Atom feed
  try {
    const feedUrls = [`https://${domain}/feed`, `https://${domain}/rss`, `https://${domain}/atom.xml`];
    for (const feedUrl of feedUrls) {
      const feedResult = await fetchXml(feedUrl, { timeoutMs: 5000, maxRetries: 1 });
      if (feedResult.status === 200) {
        result.hasFeed = true;
        result.score += 15;
        break;
      }
    }
  } catch {
    // No feed
  }

  // Check homepage for JSON-LD and lang
  try {
    const homepageResult = await fetchHtml(`https://${domain}`, { timeoutMs: 10000, maxRetries: 1 });
    if (homepageResult.status === 200) {
      // Check JSON-LD
      if (homepageResult.html.includes('application/ld+json') && homepageResult.html.includes('NewsArticle')) {
        result.jsonldNews = true;
        result.score += 25;
      }

      // Detect language
      const langMatch = homepageResult.html.match(/<html[^>]+lang=["']([^"']+)["']/i);
      if (langMatch) {
        result.lang = langMatch[1].split('-')[0];
        result.score += 10;
      }
    }
  } catch {
    // Failed homepage fetch
  }

  return result;
}

/**
 * Search for domains related to a specific topic
 */
async function searchForTopic(topic: { name: string; query: string | null; slug: string }): Promise<string[]> {
  const domains = new Set<string>();

  // Build search queries
  const queries: string[] = [
    `${topic.name} news`,
    `${topic.name} latest articles`,
  ];

  if (topic.query) {
    queries.push(`${topic.query} breaking news`);
  }

  // Search each query
  for (const query of queries) {
    const results = await searchAllEngines(query, 10);
    results.forEach(d => domains.add(d));
  }

  return Array.from(domains);
}

/**
 * Run discovery job
 */
export async function runDiscovery(): Promise<DiscoveryStats> {
  const stats: DiscoveryStats = {
    candidatesFound: 0,
    candidatesProbed: 0,
    autoPromoted: 0,
    errors: 0,
  };

  // Gather candidate domains from multiple sources
  console.log('='.repeat(80));
  console.log('DISCOVERY PHASE 1: Gathering candidates');
  console.log('='.repeat(80));

  // 1. Mine outbound links from recent articles
  console.log('\n1. Mining outbound links from recent articles...');
  const outboundDomains = await mineOutboundLinks();
  console.log(`   Found ${outboundDomains.length} outbound domains`);

  // 2. Load seed domains
  const seedDomains = loadSeedDomains();
  console.log(`\n2. Loaded ${seedDomains.length} seed domains`);

  // 3. Search engines for each topic
  console.log('\n3. Searching for topic-specific domains...');
  const enabledTopics = await db
    .select({ name: topics.name, query: topics.query, slug: topics.slug })
    .from(topics)
    .where(eq(topics.enabled, true));

  const searchDomains: string[] = [];
  for (const topic of enabledTopics) {
    console.log(`   Searching for: ${topic.name}`);
    const topicDomains = await searchForTopic(topic);
    searchDomains.push(...topicDomains);
    console.log(`   Found ${topicDomains.length} domains for ${topic.name}`);
  }

  // 4. Mine news aggregators
  console.log('\n4. Mining news aggregators...');
  const aggregatorDomains = await mineNewsAggregators();
  console.log(`   Found ${aggregatorDomains.length} aggregator domains`);

  // 5. Mine Reddit
  console.log('\n5. Mining Reddit...');
  const redditDomains = await mineReddit('worldnews');
  console.log(`   Found ${redditDomains.length} Reddit domains`);

  const allCandidates = [...new Set([
    ...outboundDomains,
    ...seedDomains,
    ...searchDomains,
    ...aggregatorDomains,
    ...redditDomains,
  ])];

  stats.candidatesFound = allCandidates.length;
  console.log(`\nTotal unique candidates: ${allCandidates.length}`);

  // Filter out existing sources
  const existingSources = await db.select({ domain: sources.domain }).from(sources);
  const existingDomains = new Set(existingSources.map(s => s.domain));
  const newCandidates = allCandidates.filter(d => !existingDomains.has(d));

  console.log(`\n${'='.repeat(80)}`);
  console.log(`DISCOVERY PHASE 2: Probing ${newCandidates.length} new candidates`);
  console.log('='.repeat(80));

  // Probe each candidate (limit to 50 per run to avoid timeouts)
  const probeLimit = 50;
  console.log(`\nProbing up to ${probeLimit} candidates...\n`);

  for (const domain of newCandidates.slice(0, probeLimit)) {
    try {
      // Check if already in candidates
      const existing = await db
        .select({ id: candidateDomains.id })
        .from(candidateDomains)
        .where(eq(candidateDomains.domain, domain))
        .limit(1);

      let candidateId: number;

      if (existing.length === 0) {
        // Insert new candidate
        const [inserted] = await db
          .insert(candidateDomains)
          .values({
            domain,
            discoveredVia: 'outbound_links',
            firstSeenAt: new Date(),
          })
          .returning({ id: candidateDomains.id });

        candidateId = inserted.id;
      } else {
        candidateId = existing[0].id;
      }

      // Probe domain
      console.log(`Probing ${domain}...`);
      const probeResult = await probeDomain(domain);
      stats.candidatesProbed++;

      // Check robots.txt
      let robotsState = 'unknown';
      try {
        const robots = await getRobots(domain);
        robotsState = robots.disallowedPaths.length > 0 ? 'restricted' : 'open';
      } catch {
        robotsState = 'error';
      }

      // Update candidate
      await db
        .update(candidateDomains)
        .set({
          score: probeResult.score,
          robotsState,
          lastSeenAt: new Date(),
        })
        .where(eq(candidateDomains.id, candidateId));

      // Insert probe record
      await db.insert(candidateProbes).values({
        domainId: candidateId,
        hasSitemap: probeResult.hasSitemap,
        hasFeed: probeResult.hasFeed,
        jsonldNews: probeResult.jsonldNews,
        lastmodRecent: probeResult.lastmodRecent,
        lang: probeResult.lang,
        statusJson: probeResult,
        probedAt: new Date(),
      });

      // Auto-promote if score >= 60
      if (probeResult.score >= 60) {
        // Get first enabled topic as default for auto-discovered sources
        const defaultTopic = await db
          .select({ id: topics.id })
          .from(topics)
          .where(eq(topics.enabled, true))
          .limit(1);

        if (defaultTopic.length === 0) {
          console.log(`Cannot auto-promote ${domain}: no topics available`);
        } else {
          // Create source
          const [newSource] = await db.insert(sources).values({
            name: domain,
            domain,
            type: 'custom_crawler',
            points: 0,
            enabled: true,
          }).returning({ id: sources.id });

          // Link to first enabled topic
          await db.insert(sourcesTopics).values({
            sourceId: newSource.id,
            topicId: defaultTopic[0].id,
          });

          stats.autoPromoted++;
          console.log(`Auto-promoted ${domain} to topic ${defaultTopic[0].id} (score: ${probeResult.score})`);
        }
      }
    } catch (error) {
      console.error(`Error probing ${domain}:`, error);
      stats.errors++;
    }
  }

  console.log('Discovery complete:', stats);

  return stats;
}
