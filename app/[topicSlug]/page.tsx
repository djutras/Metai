import { db, sql as rawSql } from '@/lib/db';
import { topics, topicArticles, articles, sources } from '@/../../db/schema';
import { eq, and, desc, gte } from 'drizzle-orm';
import { notFound } from 'next/navigation';

interface PageProps {
  params: { topicSlug: string };
  searchParams: { filter?: string; lang?: string };
}

// Decode HTML entities
function decodeHtml(html: string): string {
  return html
    .replace(/&#x27;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&#39;/g, "'");
}

export default async function TopicPage({ params, searchParams }: PageProps) {
  const { topicSlug } = params;
  const { filter = '48h', lang } = searchParams;

  // Load topic - use raw SQL to bypass Drizzle caching
  const rawTopics = await rawSql`
    SELECT id, slug, name, query, includes, excludes, lang, freshness_hours as "freshnessHours", max_items as "maxItems", enabled
    FROM topics
    WHERE slug = ${topicSlug} AND enabled = true
    LIMIT 1
  `;

  if (rawTopics.length === 0) {
    notFound();
  }

  const topic = rawTopics[0] as any;
  console.log(`[${topicSlug}] Topic loaded: id=${topic.id}, maxItems=${topic.maxItems}`);

  // Calculate time filter
  const hoursMap: Record<string, number> = { '24h': 24, '48h': 48, '7d': 168 };
  const hours = filter === 'all' ? null : (hoursMap[filter] || 48);
  const cutoff = hours ? new Date(Date.now() - hours * 60 * 60 * 1000) : null;

  // Load articles
  const articlesList = await db
    .select({
      id: articles.id,
      canonicalUrl: articles.canonicalUrl,
      title: articles.title,
      summary: articles.summary,
      imageUrl: articles.imageUrl,
      publishedAt: articles.publishedAt,
      firstSeenAt: articles.firstSeenAt,
      paywalledBool: articles.paywalledBool,
      lang: articles.lang,
      sourceName: sources.name,
      sourceDomain: sources.domain,
    })
    .from(topicArticles)
    .innerJoin(articles, eq(topicArticles.articleId, articles.id))
    .leftJoin(sources, eq(articles.sourceId, sources.id))
    .where(
      and(
        eq(topicArticles.topicId, topic.id),
        eq(topicArticles.hiddenBool, false),
        cutoff ? gte(articles.publishedAt, cutoff) : undefined,
        lang ? eq(articles.lang, lang) : undefined
      )
    )
    .orderBy(desc(topicArticles.addedAt))
    .limit(topic.maxItems);

  console.log(`[${topicSlug}] Query returned ${articlesList.length} articles (maxItems: ${topic.maxItems}, filter: ${filter})`);

  // Filter articles to ensure they contain topic keywords (additional safeguard)
  const topicKeywords: string[] = [];
  if (topic.query) {
    topicKeywords.push(...topic.query.toLowerCase().split(/\s+/).filter((k: string) => k.length >= 3));
  }
  if (topic.includes && Array.isArray(topic.includes) && topic.includes.length > 0) {
    topicKeywords.push(...topic.includes.map((k: string) => k.toLowerCase()));
  }

  const filteredArticles = articlesList.filter(article => {
    // If no topic keywords defined, allow all articles
    if (topicKeywords.length === 0) return true;

    const titleText = (article.title || '').toLowerCase();
    const summaryText = (article.summary || '').toLowerCase();

    // Check if any topic keyword appears in title or summary
    return topicKeywords.some(keyword => {
      const pattern = new RegExp(keyword, 'i');
      return pattern.test(titleText) || pattern.test(summaryText);
    });
  });

  console.log(`[${topicSlug}] Filtered to ${filteredArticles.length} articles with topic keywords`);

  // Calculate last update based on most recent article publish date
  const lastUpdate = filteredArticles.length > 0
    ? Math.floor((Date.now() - new Date(filteredArticles[0].publishedAt).getTime()) / (1000 * 60))
    : 0;

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <header className="mb-8">
        <h1 className="mb-2">{topic.name}</h1>
        <p className="meta-row">
          <span>Updated {lastUpdate} min ago</span>
          <span>•</span>
          <span>{filteredArticles.length} articles</span>
        </p>
      </header>

      {/* Filters */}
      <div className="mb-6 flex gap-2">
        {['24h', '48h', '7d', 'all'].map(f => (
          <a key={f} href={`/${topicSlug}?filter=${f}`} className={`chip ${filter === f ? 'active' : ''}`}>
            {f === 'all' ? 'All' : f}
          </a>
        ))}
      </div>

      {/* Articles */}
      <div className="grid-16">
        {filteredArticles.map(article => (
          <article key={article.id} className="card">
            <a href={article.canonicalUrl} target="_blank" rel="noopener noreferrer">
              <h2 className="mb-2">{decodeHtml(article.title)}</h2>
              <p className="mb-3 max-w-prose">{decodeHtml(article.summary?.slice(0, 200) || '')}...</p>
              <div className="meta-row">
                <span className="chip">{article.sourceDomain}</span>
                {article.paywalledBool && <span className="chip">Paywall</span>}
                <span>{new Date(article.publishedAt).toLocaleString()}</span>
              </div>
            </a>
          </article>
        ))}
      </div>

      {filteredArticles.length === 0 && (
        <p className="text-center mt-12">No articles found for this filter.</p>
      )}
    </div>
  );
}
