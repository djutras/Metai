import type { Handler } from '@netlify/functions';
import { neon } from '@neondatabase/serverless';

const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
  throw new Error('DATABASE_URL is required');
}

const handler: Handler = async () => {
  try {
    const sql = neon(DATABASE_URL);

    const candidates = await sql`
      SELECT
        id,
        domain,
        discovered_via,
        score,
        robots_state,
        first_seen_at,
        last_seen_at,
        notes
      FROM candidate_domains
      ORDER BY score DESC NULLS LAST, last_seen_at DESC NULLS LAST
    `;

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(candidates),
    };
  } catch (error) {
    console.error('Error fetching candidate domains:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Failed to fetch candidate domains' }),
    };
  }
};

export { handler };
