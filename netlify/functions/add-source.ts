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
    const { name, domain, type } = body;

    const sql = neon(process.env.DATABASE_URL!);

    await sql`
      INSERT INTO sources (name, domain, type, points, enabled)
      VALUES (${name}, ${domain}, ${type || 'custom_crawler'}, 0, true)
    `;

    return {
      statusCode: 200,
      body: JSON.stringify({ success: true }),
    };
  } catch (error) {
    console.error('Error adding source:', error);
    return {
      statusCode: 500,
      body: 'Failed to add source: ' + (error as Error).message,
    };
  }
};
