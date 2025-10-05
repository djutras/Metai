import type { Handler, HandlerEvent } from '@netlify/functions';
import { neon } from '@neondatabase/serverless';

const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
  throw new Error('DATABASE_URL is required');
}

const handler: Handler = async (event: HandlerEvent) => {
  if (event.httpMethod !== 'GET') {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: 'Method not allowed' }),
    };
  }

  const crawlId = event.queryStringParameters?.crawlId;

  try {
    const sql = neon(DATABASE_URL);

    if (crawlId) {
      // Get specific crawl details with sources and articles
      const [crawl] = await sql`
        SELECT id, topic_id, started_at, finished_at, ok_bool, stats_json
        FROM crawls
        WHERE id = ${crawlId}
      `;

      if (!crawl) {
        return {
          statusCode: 404,
          body: JSON.stringify({ error: 'Crawl not found' }),
        };
      }

      // Get topic name
      const [topic] = await sql`
        SELECT name FROM topics WHERE id = ${crawl.topic_id}
      `;

      // Get all sources configured for this topic, with articles found during this crawl
      // This shows ALL sources attempted, including those that found 0 articles
      const results = await sql`
        SELECT
          s.id as source_id,
          s.name as source_name,
          s.domain as source_domain,
          a.id as article_id,
          a.title as article_title,
          a.canonical_url as article_url,
          a.published_at,
          ta.added_at
        FROM sources_topics st
        JOIN sources s ON st.source_id = s.id
        LEFT JOIN articles a ON a.source_id = s.id
        LEFT JOIN topic_articles ta ON ta.article_id = a.id
          AND ta.topic_id = ${crawl.topic_id}
          AND ta.added_at >= ${crawl.started_at}
          AND ta.added_at <= ${crawl.finished_at || 'NOW()'}
        WHERE st.topic_id = ${crawl.topic_id}
        ORDER BY s.name, ta.added_at DESC NULLS LAST
      `;

      // Group by source
      const sourceMap = new Map();
      results.forEach((row: any) => {
        const sourceKey = row.source_id;
        if (!sourceMap.has(sourceKey)) {
          sourceMap.set(sourceKey, {
            source_id: row.source_id,
            source_name: row.source_name,
            source_domain: row.source_domain,
            articles: [],
          });
        }
        // Only add article if it exists (article_id is not null)
        if (row.article_id) {
          sourceMap.get(sourceKey).articles.push({
            id: row.article_id,
            title: row.article_title,
            url: row.article_url,
            published_at: row.published_at,
            added_at: row.added_at,
          });
        }
      });

      return {
        statusCode: 200,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          crawl: {
            ...crawl,
            topic_name: topic?.name,
          },
          sources: Array.from(sourceMap.values()),
          total_articles: results.length,
        }),
      };
    } else {
      // Get list of ALL recent crawls (last 48 hours)
      const crawls = await sql`
        SELECT
          c.id,
          c.topic_id,
          c.started_at,
          c.finished_at,
          c.ok_bool,
          c.stats_json,
          t.name as topic_name
        FROM crawls c
        LEFT JOIN topics t ON c.topic_id = t.id
        WHERE c.started_at >= NOW() - INTERVAL '48 hours'
        ORDER BY c.started_at DESC
        LIMIT 50
      `;

      return {
        statusCode: 200,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(crawls),
      };
    }
  } catch (error) {
    console.error('Error fetching crawl report:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Failed to fetch crawl report' }),
    };
  }
};

export { handler };
