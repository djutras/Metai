import { db } from '../lib/db';
import { sources } from '../../db/schema';
import { eq } from 'drizzle-orm';
import { fetchXml } from '../lib/http';
import { analyzeUrlPatterns } from '../lib/llm';

/**
 * Learn article patterns for a source using LLM analysis
 */
export async function learnSource(domain: string): Promise<void> {
  console.log(`\nLearning patterns for: ${domain}`);

  // Step 1: Try to fetch sitemap
  const sitemapUrls: string[] = [];
  const sitemapPaths = [
    '/sitemap.xml',
    '/news-sitemap.xml',
    '/sitemap_news.xml',
    '/sitemap/news.xml',
    '/sitemaps/news.xml',
  ];

  for (const path of sitemapPaths) {
    try {
      const sitemapUrl = `https://${domain}${path}`;
      console.log(`  Trying sitemap: ${sitemapUrl}`);

      const result = await fetchXml(sitemapUrl, { timeoutMs: 10000, maxRetries: 1 });

      if (result.status === 200) {
        console.log(`  ✓ Found sitemap at ${path}`);

        // Extract URLs from sitemap
        const urlMatches = result.html.matchAll(/<loc>(https?:\/\/[^<]+)<\/loc>/g);
        for (const match of urlMatches) {
          sitemapUrls.push(match[1]);
          if (sitemapUrls.length >= 20) break; // Sample 20 URLs
        }

        if (sitemapUrls.length > 0) break;
      }
    } catch (error) {
      // Try next sitemap path
      continue;
    }
  }

  if (sitemapUrls.length === 0) {
    console.log(`  ✗ No sitemaps found or no URLs in sitemaps`);
    console.log(`  Falling back to generic configuration`);

    // Store basic config
    await db
      .update(sources)
      .set({
        apiConfig: {
          sitemapPaths: ['/sitemap.xml'],
          indexPaths: ['/news', '/latest', '/'],
          articlePattern: null, // Will need manual configuration or LLM per-URL
          learned: false,
          learnedAt: new Date(),
        },
      })
      .where(eq(sources.domain, domain));

    return;
  }

  console.log(`  Sampled ${sitemapUrls.length} URLs from sitemap`);

  // Step 2: Send to Claude for analysis
  console.log(`  Analyzing URLs with Claude...`);

  try {
    const analysis = await analyzeUrlPatterns(domain, sitemapUrls.slice(0, 15));

    console.log(`  ✓ Analysis complete (confidence: ${(analysis.confidence * 100).toFixed(0)}%)`);
    console.log(`  Pattern: ${analysis.articlePattern}`);
    console.log(`  Reasoning: ${analysis.reasoning}`);

    // Step 3: Store learned configuration
    await db
      .update(sources)
      .set({
        apiConfig: {
          sitemapPaths: analysis.sitemapPaths,
          indexPaths: analysis.indexPaths,
          articlePattern: analysis.articlePattern,
          learned: true,
          learnedAt: new Date(),
          confidence: analysis.confidence,
          reasoning: analysis.reasoning,
        },
      })
      .where(eq(sources.domain, domain));

    console.log(`  ✓ Saved configuration for ${domain}`);
  } catch (error) {
    console.error(`  ✗ LLM analysis failed:`, error);
    throw error;
  }
}

/**
 * Learn patterns for all sources that don't have configurations
 */
export async function learnAllSources(): Promise<void> {
  const unconfiguredSources = await db
    .select({ domain: sources.domain, name: sources.name })
    .from(sources)
    .where(eq(sources.enabled, true));

  console.log(`\nFound ${unconfiguredSources.length} enabled sources`);

  for (const source of unconfiguredSources) {
    // Check if already has learned config
    const [existing] = await db
      .select({ apiConfig: sources.apiConfig })
      .from(sources)
      .where(eq(sources.domain, source.domain))
      .limit(1);

    const config = existing.apiConfig as any;
    if (config?.learned) {
      console.log(`\n✓ ${source.name} already configured (skipping)`);
      continue;
    }

    try {
      await learnSource(source.domain);
    } catch (error) {
      console.error(`\n✗ Failed to learn ${source.name}:`, error);
      continue;
    }

    // Small delay to avoid rate limits
    await new Promise(resolve => setTimeout(resolve, 2000));
  }

  console.log('\n=== Learning Complete ===');
}
