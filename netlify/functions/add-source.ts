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
    const { name, domain, type, topicId } = body;

    // Validate required fields
    if (!name || !domain || !topicId) {
      return {
        statusCode: 400,
        body: 'Missing required fields: name, domain, and topicId are required',
      };
    }

    const sql = neon(process.env.DATABASE_URL!);

    // Verify topic exists
    const topicCheck = await sql`
      SELECT id FROM topics WHERE id = ${topicId}
    `;

    if (topicCheck.length === 0) {
      return {
        statusCode: 400,
        body: `Topic with ID ${topicId} does not exist`,
      };
    }

    // Use UPSERT to update if domain already exists
    await sql`
      INSERT INTO sources (name, domain, type, points, topic_id, enabled)
      VALUES (${name}, ${domain}, ${type || 'custom_crawler'}, 0, ${topicId}, true)
      ON CONFLICT (domain)
      DO UPDATE SET
        name = EXCLUDED.name,
        type = EXCLUDED.type,
        topic_id = EXCLUDED.topic_id,
        enabled = EXCLUDED.enabled
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
