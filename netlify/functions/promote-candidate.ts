import type { Handler, HandlerEvent } from '@netlify/functions';
import { neon } from '@neondatabase/serverless';

const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
  throw new Error('DATABASE_URL is required');
}

const handler: Handler = async (event: HandlerEvent) => {
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: 'Method not allowed' }),
    };
  }

  const { candidateId, topicId } = JSON.parse(event.body || '{}');

  if (!candidateId || !topicId) {
    return {
      statusCode: 400,
      body: JSON.stringify({ error: 'candidateId and topicId are required' }),
    };
  }

  try {
    const sql = neon(DATABASE_URL);

    // Get candidate domain info
    const candidates = await sql`
      SELECT id, domain, discovered_via
      FROM candidate_domains
      WHERE id = ${candidateId}
      LIMIT 1
    `;

    if (candidates.length === 0) {
      return {
        statusCode: 404,
        body: JSON.stringify({ error: 'Candidate not found' }),
      };
    }

    const candidate = candidates[0];

    // Check if source already exists with this domain
    const existingSources = await sql`
      SELECT id FROM sources WHERE domain = ${candidate.domain} LIMIT 1
    `;

    let sourceId: number;

    if (existingSources.length > 0) {
      // Source already exists, just link it to the topic
      sourceId = existingSources[0].id;
      console.log(`Source already exists for ${candidate.domain}, using ID ${sourceId}`);
    } else {
      // Create new source
      const newSources = await sql`
        INSERT INTO sources (name, domain, type, enabled)
        VALUES (
          ${candidate.discovered_via || candidate.domain},
          ${candidate.domain},
          'custom_crawler',
          true
        )
        RETURNING id
      `;
      sourceId = newSources[0].id;
      console.log(`Created new source for ${candidate.domain} with ID ${sourceId}`);
    }

    // Check if source-topic relationship already exists
    const existingRelations = await sql`
      SELECT id FROM sources_topics
      WHERE source_id = ${sourceId} AND topic_id = ${topicId}
      LIMIT 1
    `;

    if (existingRelations.length === 0) {
      // Create source-topic relationship
      await sql`
        INSERT INTO sources_topics (source_id, topic_id)
        VALUES (${sourceId}, ${topicId})
      `;
      console.log(`Linked source ${sourceId} to topic ${topicId}`);
    } else {
      console.log(`Source ${sourceId} already linked to topic ${topicId}`);
    }

    // Delete candidate (it's been promoted)
    await sql`
      DELETE FROM candidate_domains
      WHERE id = ${candidateId}
    `;
    console.log(`Deleted candidate ${candidateId}`);

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        success: true,
        sourceId,
        domain: candidate.domain,
        topicId
      }),
    };

  } catch (error) {
    console.error('Error promoting candidate:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Failed to promote candidate' }),
    };
  }
};

export { handler };
