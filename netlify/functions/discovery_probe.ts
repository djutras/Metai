import { Handler } from '@netlify/functions';
import { runDiscovery } from '../../src/jobs/runDiscovery';

export const handler: Handler = async () => {
  try {
    const result = await runDiscovery();

    return {
      statusCode: 200,
      body: JSON.stringify({
        success: true,
        ...result,
      }),
    };
  } catch (error) {
    console.error('Discovery probe error:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      }),
    };
  }
};
