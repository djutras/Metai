import { Handler } from '@netlify/functions';
import { neon } from '@neondatabase/serverless';

export const handler: Handler = async (event) => {
  if (event.httpMethod !== 'GET') {
    return {
      statusCode: 405,
      body: 'Method Not Allowed',
    };
  }

  try {
    const sql = neon(process.env.DATABASE_URL!);

    const topics = await sql`
      SELECT id, slug, name, query, includes, excludes, lang, freshness_hours as "freshnessHours", max_items as "maxItems", enabled
      FROM topics
      ORDER BY created_at DESC
    `;

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(topics),
    };
  } catch (error) {
    console.error('Error fetching topics:', error);
    return {
      statusCode: 500,
      body: 'Failed to fetch topics: ' + (error as Error).message,
    };
  }
};
