import { db } from './db';
import { sources } from '../../db/schema';
import { eq } from 'drizzle-orm';
import { ExtractedArticle } from './extract';
import { topicMatchScore } from './quality';

interface Topic {
  query?: string;
  includes: string[];
  excludes: string[];
}

interface ScoredArticle {
  article: ExtractedArticle;
  topicScore: number;
  finalScore: number;
}

/**
 * Calculate recency decay factor
 */
function recencyDecay(publishedAt: Date): number {
  const hoursAgo = (Date.now() - publishedAt.getTime()) / (1000 * 60 * 60);

  if (hoursAgo <= 3) return 1.0;
  if (hoursAgo <= 12) return 0.8;
  if (hoursAgo <= 48) return 0.6;
  return 0.3;
}

/**
 * Get normalized source points (0..1)
 */
async function getNormalizedSourcePoints(sourceDomain: string): Promise<number> {
  // Get min/max points from DB
  const stats = await db
    .select({
      minPoints: sources.points,
      maxPoints: sources.points,
    })
    .from(sources);

  if (stats.length === 0) return 0.5; // Default

  const minPoints = Math.min(...stats.map(s => s.minPoints || 0));
  const maxPoints = Math.max(...stats.map(s => s.maxPoints || 0));

  // Get points for this source
  const source = await db
    .select({ points: sources.points })
    .from(sources)
    .where(eq(sources.domain, sourceDomain))
    .limit(1);

  if (source.length === 0) return 0.5; // Default for new sources

  const points = source[0].points || 0;

  // Normalize to 0..1
  if (maxPoints === minPoints) return 0.5;
  return (points - minPoints) / (maxPoints - minPoints);
}

/**
 * Calculate final ranking score
 */
export async function calculateScore(
  article: ExtractedArticle,
  topic: Topic
): Promise<number> {
  const recency = recencyDecay(article.published_at);
  const topicScore = topicMatchScore(article, topic);
  const normalizedTopicScore = Math.min(topicScore / 50, 1.0); // Normalize to 0..1
  const sourcePoints = await getNormalizedSourcePoints(article.source_domain);

  // Final score: recency + 0.2*topicKeyword + 0.1*sourcePoints
  const finalScore = recency + 0.2 * normalizedTopicScore + 0.1 * sourcePoints;

  return finalScore;
}

/**
 * Rank articles by score
 */
export async function rankArticles(
  articles: ExtractedArticle[],
  topic: Topic
): Promise<ScoredArticle[]> {
  const scored: ScoredArticle[] = [];

  for (const article of articles) {
    const topicScore = topicMatchScore(article, topic);
    const finalScore = await calculateScore(article, topic);

    scored.push({
      article,
      topicScore,
      finalScore,
    });
  }

  // Sort by score desc, then by !paywalled, then by earlier first_seen_at
  scored.sort((a, b) => {
    // Primary: final score
    if (b.finalScore !== a.finalScore) {
      return b.finalScore - a.finalScore;
    }

    // Tie-breaker 1: non-paywalled first
    if (a.article.paywalled_bool !== b.article.paywalled_bool) {
      return a.article.paywalled_bool ? 1 : -1;
    }

    // Tie-breaker 2: earlier published first
    return a.article.published_at.getTime() - b.article.published_at.getTime();
  });

  return scored;
}
