import 'dotenv/config';
import { chromium } from 'playwright';
import Anthropic from '@anthropic-ai/sdk';
import { db } from './src/lib/db';
import { sources, sourcesTopics, topics, articles, articlesTopics } from './db/schema';
import { eq } from 'drizzle-orm';

const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY!,
});

interface TrumpArticle {
  title: string;
  url: string;
  sourceUrl: string;
}

/**
 * Use Claude to identify Trump articles from a list of links
 */
async function findTrumpArticles(links: { text: string; url: string }[], sourceDomain: string): Promise<TrumpArticle[]> {
  const prompt = `You are analyzing links from a news website to find articles about Donald Trump.

Source: ${sourceDomain}

Links found on homepage:
${links.map((l, i) => `${i + 1}. "${l.text}" - ${l.url}`).join('\n')}

Task: Identify which links are likely articles about Donald Trump (or just "Trump").

Guidelines:
- Look for ANY mention of "Trump", "Donald Trump", "POTUS" (if referring to Trump), "President Trump", "Trump administration"
- Include articles where Trump is mentioned even if not the main topic
- Must be NEWS ARTICLES (not category pages, author pages, or navigation links)
- Check BOTH the link text AND the URL for mentions of Trump
- Be GENEROUS - include if there's any reasonable chance it's Trump-related
- Also look for Trump administration members: Vance, Homan, Hegseth, etc.

Respond in JSON format:
{
  "trumpArticles": [
    {"title": "article title", "url": "full URL", "reason": "why this is a Trump article"}
  ]
}`;

  try {
    const message = await client.messages.create({
      model: 'claude-3-5-haiku-20241022',
      max_tokens: 2000,
      messages: [{
        role: 'user',
        content: prompt,
      }],
    });

    const responseText = message.content[0].type === 'text' ? message.content[0].text : '';
    const jsonMatch = responseText.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      return [];
    }

    const analysis = JSON.parse(jsonMatch[0]);
    return analysis.trumpArticles?.map((a: any) => ({
      title: a.title,
      url: a.url,
      sourceUrl: sourceDomain
    })) || [];
  } catch (error) {
    console.error(`  Error analyzing with Claude:`, error);
    return [];
  }
}

/**
 * Scrape a source's homepage with Playwright and find Trump articles
 */
async function scrapeSourceForTrump(domain: string): Promise<TrumpArticle[]> {
  console.log(`\nScraping ${domain}...`);

  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  try {
    // Visit homepage
    await page.goto(`https://${domain}`, { waitUntil: 'domcontentloaded', timeout: 20000 });

    // Extract all links
    const links = await page.evaluate(() => {
      const anchors = Array.from(document.querySelectorAll('a[href]'));
      return anchors.map(a => ({
        text: (a as HTMLAnchorElement).textContent?.trim() || '',
        url: (a as HTMLAnchorElement).href
      })).filter(l => l.text && l.url && l.url.startsWith('http'));
    });

    console.log(`  Found ${links.length} links on homepage`);

    // Use Claude to identify Trump articles
    const trumpArticles = await findTrumpArticles(links, domain);

    console.log(`  ✓ Found ${trumpArticles.length} Trump articles`);

    return trumpArticles;
  } catch (error) {
    console.error(`  ✗ Error scraping ${domain}:`, error);
    return [];
  } finally {
    await browser.close();
  }
}

/**
 * Main function to scrape all sources and save Trump articles
 */
async function main() {
  console.log('=== Trump Article Scraper with Playwright + Claude ===\n');

  // Get all Trump sources
  const trumpSources = await db
    .select({ domain: sources.domain, id: sources.id })
    .from(sources)
    .innerJoin(sourcesTopics, eq(sources.id, sourcesTopics.sourceId))
    .innerJoin(topics, eq(sourcesTopics.topicId, topics.id))
    .where(eq(topics.slug, 'Trump'));

  console.log(`Found ${trumpSources.length} sources for Trump topic\n`);

  const results: { domain: string; count: number; articles: TrumpArticle[] }[] = [];

  // Scrape each source
  for (const source of trumpSources) {
    const trumpArticles = await scrapeSourceForTrump(source.domain);
    results.push({
      domain: source.domain,
      count: trumpArticles.length,
      articles: trumpArticles
    });

    // Small delay to avoid rate limits
    await new Promise(resolve => setTimeout(resolve, 2000));
  }

  // Calculate coverage
  const sourcesWithArticles = results.filter(r => r.count > 0).length;
  const coveragePercent = (sourcesWithArticles / trumpSources.length) * 100;

  console.log('\n=== RESULTS ===');
  console.log(`Sources with Trump articles: ${sourcesWithArticles}/${trumpSources.length} (${coveragePercent.toFixed(1)}%)`);
  console.log('\nBreakdown by source:');
  results.forEach(r => {
    console.log(`  ${r.domain}: ${r.count} articles`);
  });

  // Save articles to database
  console.log('\n=== Saving to database ===');
  let saved = 0;
  let skipped = 0;

  for (const result of results) {
    if (result.count === 0) continue;

    const source = trumpSources.find(s => s.domain === result.domain)!;

    for (const article of result.articles) {
      try {
        // Insert article
        const [inserted] = await db
          .insert(articles)
          .values({
            title: article.title,
            canonicalUrl: article.url,
            summary: `Trump article from ${result.domain}`,
            sourceDomain: result.domain,
            sourceId: source.id,
            publishedAt: new Date(),
          })
          .onConflictDoNothing()
          .returning({ id: articles.id });

        if (inserted) {
          // Link to Trump topic
          const trumpTopic = await db
            .select({ id: topics.id })
            .from(topics)
            .where(eq(topics.slug, 'Trump'))
            .limit(1);

          if (trumpTopic.length > 0) {
            await db
              .insert(articlesTopics)
              .values({
                articleId: inserted.id,
                topicId: trumpTopic[0].id,
              })
              .onConflictDoNothing();
          }

          saved++;
          console.log(`  ✓ Saved: ${article.title.substring(0, 60)}...`);
        } else {
          skipped++;
        }
      } catch (error) {
        console.error(`  ✗ Error saving: ${article.title.substring(0, 60)}...`);
        console.error(`    ${error}`);
      }
    }
  }

  console.log(`\n✓ Saved ${saved} new Trump articles to database (${skipped} already existed)`);

  // Check if we achieved 80%
  if (coveragePercent >= 80) {
    console.log(`\n✅ SUCCESS! Achieved ${coveragePercent.toFixed(1)}% coverage (target: 80%)`);
  } else {
    console.log(`\n❌ FAILED: Only ${coveragePercent.toFixed(1)}% coverage (target: 80%)`);
    console.log('Sources missing Trump articles:');
    results.filter(r => r.count === 0).forEach(r => console.log(`  - ${r.domain}`));
  }

  process.exit(coveragePercent >= 80 ? 0 : 1);
}

main().catch(console.error);
