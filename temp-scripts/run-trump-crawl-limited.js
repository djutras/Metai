require('dotenv').config();
const { db } = require('./src/lib/db');
const { topics, sources, sourcesTopics, crawls } = require('./db/schema');
const { eq, and } = require('drizzle-orm');
const { fetchHtml } = require('./src/lib/http');
const { extractArticle } = require('./src/lib/extract');
const { isDuplicate, upsertArticleAndLink } = require('./src/lib/dedupe');
const { topicMatchScore } = require('./src/lib/quality');

(async () => {
  console.log('Starting limited Trump crawl for Al Jazeera...\n');

  try {
    // Get Trump topic
    const [topic] = await db
      .select()
      .from(topics)
      .where(and(eq(topics.slug, 'Trump'), eq(topics.enabled, true)))
      .limit(1);

    if (!topic) {
      throw new Error('Trump topic not found');
    }

    console.log(`✓ Found topic: ${topic.name} (ID: ${topic.id})\n`);

    // Get Al Jazeera source
    const alJazeeraSources = await db
      .select({
        id: sources.id,
        name: sources.name,
        domain: sources.domain,
      })
      .from(sources)
      .innerJoin(sourcesTopics, eq(sources.id, sourcesTopics.sourceId))
      .where(
        and(
          eq(sources.enabled, true),
          eq(sources.domain, 'aljazeera.com'),
          eq(sourcesTopics.topicId, topic.id)
        )
      );

    if (alJazeeraSources.length === 0) {
      throw new Error('Al Jazeera not found or not linked to Trump topic');
    }

    console.log(`✓ Found source: ${alJazeeraSources[0].name}\n`);

    // Create crawl log
    const [crawl] = await db
      .insert(crawls)
      .values({
        topicId: topic.id,
        startedAt: new Date(),
      })
      .returning({ id: crawls.id });

    console.log(`✓ Started crawl ID: ${crawl.id.toString()}\n`);

    const stats = {
      kept: 0,
      skippedDuplicates: 0,
      skippedQuality: 0,
      errors: 0,
    };

    // Test URLs from Al Jazeera
    const testUrls = [
      'https://www.aljazeera.com/news/2025/10/4/israel-pounds-gaza-killing-61-despite-trumps-call-for-it-to-halt-bombing',
      'https://www.aljazeera.com/news/2025/10/3/trump-asks-netanyahu-to-end-gaza-war-before-inauguration',
    ];

    for (const url of testUrls) {
      console.log(`\nCrawling: ${url}`);

      try {
        // Check if duplicate
        const extracted = { canonical_url: url };
        const isDupe = await isDuplicate(extracted);

        if (isDupe) {
          console.log('  ⊘ Skipped (duplicate)');
          stats.skippedDuplicates++;
          continue;
        }

        // Fetch HTML
        const result = await fetchHtml(url, { timeoutMs: 10000, maxRetries: 1 });

        if (result.status !== 200) {
          console.log(`  ✗ HTTP ${result.status}`);
          stats.errors++;
          continue;
        }

        // Extract article
        const article = await extractArticle(url, result.html);

        if (!article) {
          console.log('  ✗ Failed to extract article');
          stats.errors++;
          continue;
        }

        console.log(`  Title: ${article.title}`);
        console.log(`  Summary: ${typeof article.summary === 'string' ? article.summary.substring(0, 100) : article.summary}...`);

        // Check topic match
        const matchScore = topicMatchScore(article, topic);
        console.log(`  Match score: ${matchScore}`);

        if (matchScore < 0.3) {
          console.log('  ⊘ Skipped (low match score)');
          stats.skippedQuality++;
          continue;
        }

        // Save article
        const { inserted, articleId } = await upsertArticleAndLink(topic.id, article);

        if (inserted) {
          console.log(`  ✓ Saved article ID: ${articleId.toString()}`);
          stats.kept++;
        } else {
          console.log(`  ⊘ Article already exists: ${articleId.toString()}`);
          stats.skippedDuplicates++;
        }
      } catch (error) {
        console.log(`  ✗ Error: ${error.message}`);
        stats.errors++;
      }
    }

    console.log('\n=== Crawl Stats ===');
    console.log(`Kept: ${stats.kept}`);
    console.log(`Skipped (duplicates): ${stats.skippedDuplicates}`);
    console.log(`Skipped (quality): ${stats.skippedQuality}`);
    console.log(`Errors: ${stats.errors}`);

    // Update crawl log
    await db.update(crawls)
      .set({
        finishedAt: new Date(),
        okBool: true,
        statsJson: stats,
      })
      .where(eq(crawls.id, crawl.id));

    console.log('\n✓ Crawl complete!');
  } catch (error) {
    console.error('\n✗ Crawl failed:', error.message);
    console.error('Full error:', error);
    process.exit(1);
  }
})();
