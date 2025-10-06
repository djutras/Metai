const { neon } = require('@neondatabase/serverless');

const DATABASE_URL = 'postgresql://neondb_owner:npg_IZm4bMTkdxR5@ep-icy-pond-aevzfm4q-pooler.c-2.us-east-2.aws.neon.tech/neondb?sslmode=require';

(async () => {
  const sql = neon(DATABASE_URL);

  console.log('Checking crawl_runs table...\n');

  try {
    const runs = await sql`
      SELECT workflow_name, run_id, started_at, metadata
      FROM crawl_runs
      ORDER BY started_at DESC
      LIMIT 10
    `;

    console.log(`Found ${runs.length} crawl runs:\n`);

    runs.forEach((run, i) => {
      console.log(`=== Run ${i + 1} ===`);
      console.log(`Workflow: ${run.workflow_name}`);
      console.log(`Run ID: ${run.run_id}`);
      console.log(`Started: ${run.started_at}`);
      console.log(`Metadata: ${JSON.stringify(run.metadata, null, 2)}`);
      console.log('');
    });

    if (runs.length === 0) {
      console.log('No crawl runs found in database.');
      console.log('\nThis means the log-crawl-run.ts script has not successfully executed yet.');
      console.log('Next step: Manually trigger the workflow and watch the logs.');
    }
  } catch (error) {
    console.error('Error querying database:', error.message);
  }
})();
