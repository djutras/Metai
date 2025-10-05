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

    const crawlRuns = await sql`
      SELECT
        id,
        workflow_name as "workflowName",
        run_id as "runId",
        started_at as "startedAt",
        metadata
      FROM crawl_runs
      ORDER BY started_at DESC
      LIMIT 100
    `;

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(crawlRuns),
    };
  } catch (error) {
    console.error('Error fetching crawl runs:', error);
    return {
      statusCode: 500,
      body: 'Failed to fetch crawl runs: ' + (error as Error).message,
    };
  }
};
