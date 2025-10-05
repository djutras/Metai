import { db } from '../src/lib/db';
import { topics, topicArticles, articles, sources } from '../db/schema';
import { eq, desc, gte, sql } from 'drizzle-orm';
import Link from 'next/link';

export default async function HomePage() {
  // Check if we have multiple topics
  const topicsList = await db
    .select()
    .from(topics)
    .where(eq(topics.enabled, true));

  // If only one topic, redirect handled by middleware or show single topic
  if (topicsList.length === 1) {
    const singleTopic = topicsList[0];
    return (
      <div className="max-w-4xl mx-auto px-4 py-8">
        <p>Redirecting to <Link href={`/${singleTopic.slug}`}>{singleTopic.name}</Link>...</p>
      </div>
    );
  }

  // Load merged deduplicated feed from all topics
  const cutoff = new Date(Date.now() - 48 * 60 * 60 * 1000);

  const mergedArticles = await db
    .selectDistinct({
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
      gte(articles.publishedAt, cutoff)
    )
    .orderBy(desc(articles.publishedAt))
    .limit(50);

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <header className="mb-8">
        <h1 className="mb-4">All Topics</h1>

        {/* Topic chips */}
        <div className="flex gap-2 flex-wrap mb-6">
          {topicsList.map(topic => (
            <Link key={topic.id} href={`/${topic.slug}`} className="chip">
              {topic.name}
            </Link>
          ))}
        </div>
      </header>

      {/* Merged feed */}
      <div className="grid-16">
        {mergedArticles.map(article => (
          <article key={article.id} className="card">
            <a href={article.canonicalUrl} target="_blank" rel="noopener noreferrer">
              <h3 className="mb-2">{article.title}</h3>
              <p className="mb-3 max-w-prose text-sm">{article.summary?.slice(0, 150)}...</p>
              <div className="meta-row">
                <span className="chip">{article.sourceDomain}</span>
                {article.paywalledBool && <span className="chip">Paywall</span>}
                <span>{new Date(article.publishedAt).toLocaleString()}</span>
              </div>
            </a>
          </article>
        ))}
      </div>
    </div>
  );
}
