import { db } from './db';
import { articles, topicArticles, sources } from '../../db/schema';
import { ExtractedArticle } from './extract';
import { eq, and, gte, sql } from 'drizzle-orm';

/**
 * Compute 64-bit SimHash of text
 */
export function simhash(text: string): Buffer {
  const tokens = text.toLowerCase().split(/\s+/).filter(Boolean);
  const vector = new Array(64).fill(0);

  for (const token of tokens) {
    let hash = 0;
    for (let i = 0; i < token.length; i++) {
      hash = (hash * 31 + token.charCodeAt(i)) >>> 0;
    }

    // Update vector based on hash bits
    for (let i = 0; i < 64; i++) {
      if (hash & (1 << (i % 32))) {
        vector[i]++;
      } else {
        vector[i]--;
      }
    }
  }

  // Convert vector to binary
  const bytes = new Uint8Array(8);
  for (let i = 0; i < 64; i++) {
    if (vector[i] > 0) {
      bytes[Math.floor(i / 8)] |= 1 << (i % 8);
    }
  }

  return Buffer.from(bytes);
}

/**
 * Calculate Hamming distance between two buffers
 */
function hammingDistance(a: Buffer, b: Buffer): number {
  if (a.length !== b.length) return Infinity;

  let distance = 0;
  for (let i = 0; i < a.length; i++) {
    const xor = a[i] ^ b[i];
    // Count set bits
    let bits = xor;
    while (bits > 0) {
      distance += bits & 1;
      bits >>= 1;
    }
  }
  return distance;
}

/**
 * Check if article is duplicate (URL or SimHash)
 */
export async function isDuplicate(
  article: ExtractedArticle,
  maxHammingDistance = 3
): Promise<boolean> {
  // Check canonical URL first (exact match)
  const existingByUrl = await db
    .select({ id: articles.id })
    .from(articles)
    .where(eq(articles.canonicalUrl, article.canonical_url))
    .limit(1);

  if (existingByUrl.length > 0) {
    return true;
  }

  // Compute SimHash
  const hashText = `${article.title} ${article.summary}`;
  const hash = simhash(hashText);

  // Check SimHash against recent articles (last 7 days)
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

  const recentArticles = await db
    .select({
      id: articles.id,
      simhash: articles.simhash,
    })
    .from(articles)
    .where(
      and(
        gte(articles.firstSeenAt, sevenDaysAgo),
        sql`${articles.simhash} IS NOT NULL`
      )
    );

  // Check Hamming distance
  for (const existing of recentArticles) {
    if (!existing.simhash) continue;

    const distance = hammingDistance(hash, existing.simhash);
    if (distance < maxHammingDistance) {
      return true; // Near-duplicate found
    }
  }

  return false;
}

/**
 * Upsert article and link to topic
 */
export async function upsertArticleAndLink(
  topicId: number,
  article: ExtractedArticle
): Promise<{ inserted: boolean; articleId: bigint }> {
  // Compute SimHash
  const hashText = `${article.title} ${article.summary}`;
  const hash = simhash(hashText);

  // Get or create source
  let source = await db
    .select({ id: sources.id })
    .from(sources)
    .where(eq(sources.domain, article.source_domain))
    .limit(1);

  let sourceId: number | undefined;

  if (source.length === 0) {
    // Create new source
    const [newSource] = await db
      .insert(sources)
      .values({
        name: article.source_domain,
        domain: article.source_domain,
        type: 'custom_crawler',
        points: 0,
        enabled: true,
      })
      .returning({ id: sources.id });

    sourceId = newSource.id;
  } else {
    sourceId = source[0].id;
  }

  // Update source last_seen_at
  await db
    .update(sources)
    .set({ lastSeenAt: new Date() })
    .where(eq(sources.id, sourceId));

  // Insert article (on conflict do nothing)
  const insertResult = await db
    .insert(articles)
    .values({
      canonicalUrl: article.canonical_url,
      title: article.title,
      summary: article.summary,
      sourceId,
      publishedAt: article.published_at,
      lang: article.lang,
      imageUrl: article.image_url,
      simhash: hash,
      paywalledBool: article.paywalled_bool,
    })
    .onConflictDoNothing()
    .returning({ id: articles.id });

  let articleId: bigint;
  let inserted = false;

  if (insertResult.length > 0) {
    articleId = insertResult[0].id;
    inserted = true;
  } else {
    // Article already exists, get its ID
    const existing = await db
      .select({ id: articles.id })
      .from(articles)
      .where(eq(articles.canonicalUrl, article.canonical_url))
      .limit(1);

    articleId = existing[0].id;
  }

  // Link to topic (on conflict do nothing)
  await db
    .insert(topicArticles)
    .values({
      topicId,
      articleId,
    })
    .onConflictDoNothing();

  return { inserted, articleId };
}
