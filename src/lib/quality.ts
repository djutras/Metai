import { ExtractedArticle } from './extract';

interface Topic {
  freshnessHours: number;
  query?: string;
  includes: string[];
  excludes: string[];
}

/**
 * Count approximate tokens (words) in text
 */
function countTokens(text: string): number {
  if (!text) return 0;
  return text.split(/\s+/).filter(Boolean).length;
}

/**
 * Check if article meets basic quality criteria
 */
export function isArticle(article: ExtractedArticle, topic: Topic): boolean {
  // Must have title
  if (!article.title || article.title.length < 10) {
    return false;
  }

  // Check freshness
  if (article.published_at) {
    const hoursAgo = (Date.now() - article.published_at.getTime()) / (1000 * 60 * 60);
    if (hoursAgo > topic.freshnessHours) {
      return false;
    }
  } else {
    // No published date
    return false;
  }

  // Check body/summary length (150-3000 tokens)
  const summaryTokens = countTokens(article.summary);
  if (summaryTokens < 150 || summaryTokens > 3000) {
    return false;
  }

  // Blacklist check
  const blacklistPatterns = [
    /\bopinion\b/i,
    /\b(é|e)ditorial\b/i,
    /\bsponsori(s|z)ed\b/i,
    /\badvertorial\b/i,
    /\bpublicit(é|y)\b/i,
    /\bpartner\s+content\b/i,
    /\bpaid\s+post\b/i,
  ];

  const textToCheck = `${article.title} ${article.summary}`.toLowerCase();

  for (const pattern of blacklistPatterns) {
    if (pattern.test(textToCheck)) {
      return false;
    }
  }

  return true;
}

/**
 * BM25-like keyword scoring for topic matching
 */
export function topicMatchScore(article: ExtractedArticle, topic: Topic): number {
  let score = 0;

  const titleText = article.title.toLowerCase();
  const summaryText = (article.summary || '').toLowerCase();
  const combinedText = `${titleText} ${summaryText}`;

  // Query keywords (from topic.query)
  if (topic.query) {
    const queryTerms = topic.query.toLowerCase().split(/\s+/);
    for (const term of queryTerms) {
      if (term.length < 3) continue; // Skip short terms

      const titleMatches = (titleText.match(new RegExp(term, 'gi')) || []).length;
      const summaryMatches = (summaryText.match(new RegExp(term, 'gi')) || []).length;

      // Title matches worth more
      score += titleMatches * 3;
      score += summaryMatches * 1;
    }
  }

  // Includes keywords (must-have)
  if (topic.includes.length > 0) {
    let includesMatched = 0;
    for (const keyword of topic.includes) {
      const pattern = new RegExp(keyword, 'i');
      if (pattern.test(combinedText)) {
        includesMatched++;
        score += 5; // Bonus for includes
      }
    }

    // If no includes matched, heavily penalize
    if (includesMatched === 0) {
      score -= 50;
    }
  }

  // Excludes keywords (must-not-have)
  for (const keyword of topic.excludes) {
    const pattern = new RegExp(keyword, 'i');
    if (pattern.test(combinedText)) {
      score -= 100; // Heavy penalty for excludes
    }
  }

  return Math.max(0, score); // No negative scores
}
