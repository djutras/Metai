import type { Handler, HandlerEvent } from '@netlify/functions';

const handler: Handler = async (event: HandlerEvent) => {
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: 'Method not allowed' }),
    };
  }

  const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
  const GITHUB_REPO = process.env.GITHUB_REPO || 'djutras/Metai';

  if (!GITHUB_TOKEN) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'GITHUB_TOKEN not configured' }),
    };
  }

  try {
    const body = JSON.parse(event.body || '{}');
    const topicSlug = body.topicSlug;

    // Trigger GitHub Actions workflow
    const response = await fetch(
      `https://api.github.com/repos/${GITHUB_REPO}/actions/workflows/discovery.yml/dispatches`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${GITHUB_TOKEN}`,
          'Accept': 'application/vnd.github.v3+json',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ref: 'main',
          inputs: {
            topic: topicSlug || '',
          },
        }),
      }
    );

    if (!response.ok) {
      const error = await response.text();
      console.error('GitHub API error:', error);
      return {
        statusCode: response.status,
        body: JSON.stringify({ error: 'Failed to trigger discovery workflow', details: error }),
      };
    }

    return {
      statusCode: 200,
      body: JSON.stringify({
        success: true,
        message: topicSlug
          ? `Discovery started for topic: ${topicSlug}`
          : 'Discovery started for all topics',
      }),
    };
  } catch (error) {
    console.error('Error triggering discovery:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({
        error: 'Failed to trigger discovery',
        details: error instanceof Error ? error.message : 'Unknown error',
      }),
    };
  }
};

export { handler };
