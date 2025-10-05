import { Handler } from '@netlify/functions';
import { neon } from '@neondatabase/serverless';

export const handler: Handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      body: 'Method Not Allowed',
    };
  }

  try {
    const body = JSON.parse(event.body || '{}');
    const { slug, name, query, includes, excludes, lang, freshnessHours, maxItems } = body;

    const sql = neon(process.env.DATABASE_URL!);

    await sql`
      INSERT INTO topics (slug, name, query, includes, excludes, lang, freshness_hours, max_items, enabled)
      VALUES (${slug}, ${name}, ${query || null}, ${includes || []}, ${excludes || []}, ${lang || ['en']}, ${freshnessHours || 72}, ${maxItems || 30}, true)
    `;

    return {
      statusCode: 200,
      body: JSON.stringify({ success: true }),
    };
  } catch (error) {
    console.error('Error adding topic:', error);
    return {
      statusCode: 500,
      body: 'Failed to add topic: ' + (error as Error).message,
    };
  }
};
