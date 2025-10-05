import { Handler, HandlerEvent } from '@netlify/functions';
import { runTopic } from '../../src/jobs/runTopic';

export const handler: Handler = async (event: HandlerEvent) => {
  try {
    // Get topic slug from query params or default to all enabled topics
    const topicSlug = event.queryStringParameters?.topic;

    const result = await runTopic(topicSlug);

    return {
      statusCode: 200,
      body: JSON.stringify({
        success: true,
        ...result,
      }),
    };
  } catch (error) {
    console.error('Crawl topic error:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      }),
    };
  }
};
