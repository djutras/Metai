import { neon } from '@neondatabase/serverless';

const workflowName = process.argv[2];

if (!workflowName) {
  console.error('Usage: npx tsx scripts/log-crawl-run.ts <workflow-name>');
  process.exit(1);
}

const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
  console.error('DATABASE_URL environment variable is required');
  process.exit(1);
}

async function logCrawlRun() {
  const sql = neon(DATABASE_URL);

  try {
    // Get GitHub context
    const runId = process.env.GITHUB_RUN_ID || null;
    const actor = process.env.GITHUB_ACTOR || null;
    const event = process.env.GITHUB_EVENT_NAME || null;
    const repository = process.env.GITHUB_REPOSITORY || null;

    const metadata = {
      repository,
      runId,
      actor,
      event,
      runUrl: runId ? `https://github.com/${repository}/actions/runs/${runId}` : null,
    };

    await sql`
      INSERT INTO crawl_runs (workflow_name, run_id, started_at, metadata)
      VALUES (${workflowName}, ${runId}, NOW(), ${JSON.stringify(metadata)})
    `;

    console.log(`✓ Logged crawl run for workflow: ${workflowName}`);
    console.log(`  Run ID: ${runId}`);
    console.log(`  Actor: ${actor}`);
    console.log(`  Event: ${event}`);
  } catch (error) {
    console.error('Failed to log crawl run:', error);
    process.exit(1);
  }
}

logCrawlRun();
