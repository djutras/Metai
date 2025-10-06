import Anthropic from '@anthropic-ai/sdk';

const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

export interface ArticlePatternAnalysis {
  articlePattern: string;
  sitemapPaths: string[];
  indexPaths: string[];
  confidence: number;
  reasoning: string;
}

/**
 * Analyze a set of URLs from a domain to learn article URL patterns
 */
export async function analyzeUrlPatterns(
  domain: string,
  sampleUrls: string[]
): Promise<ArticlePatternAnalysis> {
  const prompt = `You are analyzing a news website to identify article URL patterns.

Domain: ${domain}

Sample URLs from this domain's sitemap:
${sampleUrls.map((url, i) => `${i + 1}. ${url}`).join('\n')}

Task: Analyze these URLs and determine:
1. Which URLs are likely NEWS ARTICLES (not homepage, category pages, about pages, etc.)
2. What is the URL pattern for articles? (as a regex pattern)
3. What sitemap paths might exist? (e.g., /sitemap.xml, /news-sitemap.xml)
4. What index/category pages might list recent articles? (e.g., /news, /latest, /politics)

Guidelines:
- Article URLs usually contain dates (YYYY/MM/DD or YYYY-MM-DD) or unique IDs
- Category/topic pages usually don't have dates
- Homepage and navigation pages should be excluded
- Be FLEXIBLE with patterns to handle URL variations:
  * Allow both single and double-digit dates (5 or 05)
  * Allow optional file extensions (/index.html, .html, etc)
  * Allow optional trailing slashes
  * Allow URL parameters (?query=string)
- Better to be slightly permissive than too strict

Respond in valid JSON format:
{
  "articleUrls": [list of URLs that are articles],
  "articlePattern": "regex pattern matching article URLs (be flexible!)",
  "sitemapPaths": ["/sitemap.xml", etc],
  "indexPaths": ["/news", "/latest", etc],
  "confidence": 0.0-1.0,
  "reasoning": "brief explanation"
}`;

  const message = await client.messages.create({
    model: 'claude-3-5-haiku-20241022',
    max_tokens: 2000,
    messages: [{
      role: 'user',
      content: prompt,
    }],
  });

  const responseText = message.content[0].type === 'text' ? message.content[0].text : '';

  // Extract JSON from response (might be wrapped in markdown)
  const jsonMatch = responseText.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    throw new Error('Failed to extract JSON from Claude response');
  }

  const analysis = JSON.parse(jsonMatch[0]);

  return {
    articlePattern: analysis.articlePattern,
    sitemapPaths: analysis.sitemapPaths || ['/sitemap.xml'],
    indexPaths: analysis.indexPaths || ['/news', '/latest'],
    confidence: analysis.confidence || 0.5,
    reasoning: analysis.reasoning || '',
  };
}

/**
 * Check if a single URL is likely an article using LLM
 * (Expensive - use sparingly, prefer pattern matching)
 */
export async function isArticleUrl(url: string): Promise<boolean> {
  const prompt = `Is this URL a news article page?

URL: ${url}

Respond with ONLY "YES" or "NO" (no explanation).

Guidelines:
- Articles usually have dates or unique IDs in the URL
- Category pages, homepages, about pages are NOT articles
- Author pages, tag pages are NOT articles`;

  const message = await client.messages.create({
    model: 'claude-3-5-haiku-20241022',
    max_tokens: 10,
    messages: [{
      role: 'user',
      content: prompt,
    }],
  });

  const responseText = message.content[0].type === 'text' ? message.content[0].text : '';
  return responseText.trim().toUpperCase() === 'YES';
}
