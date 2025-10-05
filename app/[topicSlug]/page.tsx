import { db } from '../../src/lib/db';
import { topics, topicArticles, articles, sources } from '../../db/schema';
import { eq, and, desc, gte } from 'drizzle-orm';
import { notFound } from 'next/navigation';

interface PageProps {
  params: { topicSlug: string };
  searchParams: { filter?: string; lang?: string };
}

export default async function TopicPage({ params, searchParams }: PageProps) {
  const { topicSlug } = params;
  const { filter = '48h', lang } = searchParams;

  // Load topic
  const [topic] = await db
    .select()
    .from(topics)
    .where(and(eq(topics.slug, topicSlug), eq(topics.enabled, true)))
    .limit(1);

  if (!topic) {
    notFound();
  }

  // Calculate time filter
  const hoursMap: Record<string, number> = { '24h': 24, '48h': 48, '7d': 168 };
  const hours = hoursMap[filter] || 48;
  const cutoff = new Date(Date.now() - hours * 60 * 60 * 1000);

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
        gte(articles.publishedAt, cutoff),
        lang ? eq(articles.lang, lang) : undefined
      )
    )
    .orderBy(desc(topicArticles.addedAt))
    .limit(topic.maxItems);

  // Calculate last update
  const lastUpdate = articlesList.length > 0
    ? Math.floor((Date.now() - new Date(articlesList[0].firstSeenAt).getTime()) / (1000 * 60))
    : 0;

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <header className="mb-8">
        <h1 className="mb-2">{topic.name}</h1>
        <p className="meta-row">
          <span>Updated {lastUpdate} min ago</span>
          <span>•</span>
          <span>{articlesList.length} articles</span>
        </p>
      </header>

      {/* Filters */}
      <div className="mb-6 flex gap-2">
        {['24h', '48h', '7d'].map(f => (
          <a key={f} href={`/${topicSlug}?filter=${f}`} className={`chip ${filter === f ? 'active' : ''}`}>
            {f}
          </a>
        ))}
      </div>

      {/* Articles */}
      <div className="grid-16">
        {articlesList.map(article => (
          <article key={article.id} className="card">
            <a href={article.canonicalUrl} target="_blank" rel="noopener noreferrer">
              <h2 className="mb-2">{article.title}</h2>
              <p className="mb-3 max-w-prose">{article.summary?.slice(0, 200)}...</p>
              <div className="meta-row">
                <span className="chip">{article.sourceDomain}</span>
                {article.paywalledBool && <span className="chip">Paywall</span>}
                <span>{new Date(article.publishedAt).toLocaleString()}</span>
              </div>
            </a>
          </article>
        ))}
      </div>

      {articlesList.length === 0 && (
        <p className="text-center mt-12">No articles found for this filter.</p>
      )}
    </div>
  );
}
