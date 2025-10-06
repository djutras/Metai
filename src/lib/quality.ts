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
    console.log(`[Quality] Rejected - title too short: "${article.title}"`);
    return false;
  }

  // Check freshness (more lenient - only check if we have a real published date)
  if (article.published_at) {
    const hoursAgo = (Date.now() - article.published_at.getTime()) / (1000 * 60 * 60);
    // Only reject if the date is clearly in the past and exceeds freshness window
    // Allow future dates (clock skew) and very recent articles
    if (hoursAgo > topic.freshnessHours && hoursAgo > 0) {
      console.log(`[Quality] Rejected - too old: ${hoursAgo.toFixed(1)}h ago (limit: ${topic.freshnessHours}h)`);
      return false;
    }
  }

  // Check body/summary length (very lenient: 20-10000 tokens)
  const summaryTokens = countTokens(article.summary);
  if (summaryTokens < 20 || summaryTokens > 10000) {
    console.log(`[Quality] Rejected - summary tokens: ${summaryTokens} (need 20-10000)`);
    return false;
  }

  // Blacklist check
  const blacklistPatterns = [
    /\bopinion\b/i,
    /\b(é|e)ditorial\b/i,
    /\bsponsored\b/i,
    /\badvertorial\b/i,
    /\bpublicit(é|y)\b/i,
    /\bpartner\s+content\b/i,
    /\bpaid\s+post\b/i,
  ];

  const textToCheck = `${article.title} ${article.summary}`.toLowerCase();

  for (const pattern of blacklistPatterns) {
    if (pattern.test(textToCheck)) {
      console.log(`[Quality] Rejected - blacklist: ${pattern}`);
      return false;
    }
  }

  // Topic keyword validation - mandatory check
  // Article MUST contain at least one topic keyword in title OR summary
  const topicKeywords: string[] = [];

  // Collect keywords from topic.query
  if (topic.query) {
    topicKeywords.push(...topic.query.toLowerCase().split(/\s+/).filter(k => k.length >= 3));
  }

  // Collect keywords from topic.includes
  if (topic.includes && topic.includes.length > 0) {
    topicKeywords.push(...topic.includes.map(k => k.toLowerCase()));
  }

  // If topic has keywords, validate they appear in title or summary
  if (topicKeywords.length > 0) {
    const titleText = (article.title || '').toLowerCase();
    const summaryText = (article.summary || '').toLowerCase();

    let hasTopicMatch = false;

    for (const keyword of topicKeywords) {
      // Case-insensitive, partial match (e.g., "trump" matches "Trump's", "Donald Trump")
      const pattern = new RegExp(keyword, 'i');
      if (pattern.test(titleText) || pattern.test(summaryText)) {
        hasTopicMatch = true;
        break;
      }
    }

    if (!hasTopicMatch) {
      console.log(`[Quality] Rejected - no topic keywords found. Required: [${topicKeywords.join(', ')}]`);
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

  const titleText = (article.title || '').toLowerCase();
  const summaryText = typeof article.summary === 'string' ? article.summary.toLowerCase() : '';
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
