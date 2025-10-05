import { db } from '../src/lib/db';
import { crawlRuns } from './schema';

/**
 * Log a crawl run when a GitHub Actions workflow starts
 * @param workflowName - Name of the workflow (e.g., 'crawl-topics', 'discovery', 'weekly-decay')
 * @param runId - GitHub Actions run ID (optional)
 * @param metadata - Additional metadata about the run (optional)
 */
export async function logCrawlRun(
  workflowName: string,
  runId?: string,
  metadata?: Record<string, any>
) {
  try {
    const result = await db.insert(crawlRuns).values({
      workflowName,
      runId: runId || null,
      metadata: metadata || null,
    }).returning();

    console.log(`✓ Logged crawl run: ${workflowName} (ID: ${result[0].id})`);
    return result[0];
  } catch (error) {
    console.error('Failed to log crawl run:', error);
    throw error;
  }
}
