import { db, sql } from '../lib/db';
import { topics, sources, crawls } from '../../db/schema';
import { eq, and } from 'drizzle-orm';
import { buildFrontier } from '../lib/crawl/frontier';
import { getRobots, isAllowed, rateLimitFor, setCooldown } from '../lib/robots';
import { fetchHtml } from '../lib/http';
import { extractArticle } from '../lib/extract';
import { isArticle, topicMatchScore } from '../lib/quality';
import { isDuplicate, upsertArticleAndLink } from '../lib/dedupe';
import { rankArticles } from '../lib/rank';
import { bumpSourcePoint } from '../lib/sources';

interface CrawlStats {
  kept: number;
  skippedDuplicates: number;
  skippedQuality: number;
  errors: number;
  crawlId: bigint;
}

/**
 * Acquire advisory lock for topic (prevent overlapping runs)
 */
async function acquireTopicLock(topicId: number): Promise<boolean> {
  const result = await sql`SELECT pg_try_advisory_lock(${topicId})`;
  return result[0].pg_try_advisory_lock;
}

/**
 * Release advisory lock for topic
 */
async function releaseTopicLock(topicId: number): Promise<void> {
  await sql`SELECT pg_advisory_unlock(${topicId})`;
}

/**
 * Sleep utility
 */
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Run crawl for a single topic
 */
async function runTopicCrawl(topicSlug: string): Promise<CrawlStats> {
  // Load topic
  const [topic] = await db
    .select()
    .from(topics)
    .where(and(eq(topics.slug, topicSlug), eq(topics.enabled, true)))
    .limit(1);

  if (!topic) {
    throw new Error(`Topic not found or disabled: ${topicSlug}`);
  }

  // Try to acquire lock
  const locked = await acquireTopicLock(topic.id);
  if (!locked) {
    console.warn(`Topic ${topicSlug} is already being crawled, skipping`);
    return {
      kept: 0,
      skippedDuplicates: 0,
      skippedQuality: 0,
      errors: 0,
      crawlId: BigInt(0),
    };
  }

  try {
    // Create crawl log
    const [crawl] = await db
      .insert(crawls)
      .values({
        topicId: topic.id,
        startedAt: new Date(),
      })
      .returning({ id: crawls.id });

    const stats: CrawlStats = {
      kept: 0,
      skippedDuplicates: 0,
      skippedQuality: 0,
      errors: 0,
      crawlId: crawl.id,
    };

    // Load sources
    const siteSources = await db
      .select()
      .from(sources)
      .where(eq(sources.enabled, true));

    const sites = siteSources.map(s => ({
      domain: s.domain,
      indexPaths: (s.apiConfig as any)?.indexPaths || ['/news', '/latest'],
      maxUrlsPerDomain: 30,
    }));

    console.log(`Building frontier for topic ${topicSlug} with ${sites.length} sources`);

    // Build frontier
    const frontierUrls = await buildFrontier(
      {
        slug: topic.slug,
        freshnessHours: topic.freshnessHours,
      },
      sites
    );

    console.log(`Frontier: ${frontierUrls.length} URLs to crawl`);

    // Crawl each URL
    for (const url of frontierUrls) {
      try {
        const urlObj = new URL(url);
        const domain = urlObj.hostname;

        // Check robots.txt
        const robots = await getRobots(domain);
        if (!isAllowed(url, robots)) {
          console.log(`Robots.txt disallows: ${url}`);
          continue;
        }

        // Rate limit
        const delay = rateLimitFor(domain);
        if (delay > 0) {
          await sleep(delay);
        }

        // Fetch HTML
        const result = await fetchHtml(url, { timeoutMs: 15000 });

        if (result.status === 429 || result.status === 403) {
          setCooldown(domain, 60 * 60 * 1000); // 1 hour
          stats.errors++;
          continue;
        }

        if (result.status !== 200) {
          stats.errors++;
          continue;
        }

        // Extract article
        const article = await extractArticle(url, result.html);
        if (!article) {
          stats.skippedQuality++;
          continue;
        }

        // Quality gate
        if (!isArticle(article, topic)) {
          stats.skippedQuality++;
          continue;
        }

        // Dedupe check
        const duplicate = await isDuplicate(article);
        if (duplicate) {
          stats.skippedDuplicates++;
          continue;
        }

        // Upsert article
        const { inserted, articleId } = await upsertArticleAndLink(topic.id, article);

        if (inserted) {
          stats.kept++;

          // Bump source points
          const source = siteSources.find(s => s.domain === article.source_domain);
          if (source) {
            await bumpSourcePoint(source.id, 1);
          }
        }
      } catch (error) {
        console.error(`Error crawling ${url}:`, error);
        stats.errors++;
      }
    }

    // Update crawl log
    await db
      .update(crawls)
      .set({
        finishedAt: new Date(),
        okBool: true,
        statsJson: stats,
      })
      .where(eq(crawls.id, crawl.id));

    console.log(`Topic ${topicSlug} crawl complete:`, stats);

    return stats;
  } finally {
    // Release lock
    await releaseTopicLock(topic.id);
  }
}

/**
 * Run crawl for one or all topics
 */
export async function runTopic(topicSlug?: string): Promise<any> {
  if (topicSlug) {
    // Single topic
    return runTopicCrawl(topicSlug);
  } else {
    // All enabled topics
    const enabledTopics = await db
      .select({ slug: topics.slug })
      .from(topics)
      .where(eq(topics.enabled, true));

    const results = [];

    for (const topic of enabledTopics) {
      try {
        const stats = await runTopicCrawl(topic.slug);
        results.push({ slug: topic.slug, ...stats });
      } catch (error) {
        console.error(`Error running topic ${topic.slug}:`, error);
        results.push({
          slug: topic.slug,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }

    return {
      topics: results,
      total: results.length,
    };
  }
}
