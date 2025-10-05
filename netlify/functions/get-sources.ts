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

    const sources = await sql`
      SELECT id, name, domain, type, points, topic_id as "topicId", enabled, last_seen_at as "lastSeenAt"
      FROM sources
      ORDER BY created_at DESC
    `;

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(sources),
    };
  } catch (error) {
    console.error('Error fetching sources:', error);
    return {
      statusCode: 500,
      body: 'Failed to fetch sources: ' + (error as Error).message,
    };
  }
};
