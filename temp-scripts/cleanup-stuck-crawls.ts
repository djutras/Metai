import { neon } from '@neondatabase/serverless';
import * as dotenv from 'dotenv';

dotenv.config();

async function cleanupStuckCrawls() {
  const DATABASE_URL = process.env.DATABASE_URL;

  if (!DATABASE_URL) {
    throw new Error('DATABASE_URL is required');
  }

  const sql = neon(DATABASE_URL);

  try {
    console.log('Finding stuck crawls (finished_at IS NULL)...\n');

    // Find stuck crawls
    const stuckCrawls = await sql`
      SELECT
        c.id,
        c.topic_id,
        t.name as topic_name,
        c.started_at,
        c.stats_json
      FROM crawls c
      LEFT JOIN topics t ON c.topic_id = t.id
      WHERE c.finished_at IS NULL
      ORDER BY c.started_at DESC
    `;

    if (stuckCrawls.length === 0) {
      console.log('No stuck crawls found!');
      return;
    }

    console.log(`Found ${stuckCrawls.length} stuck crawls:\n`);

    stuckCrawls.forEach((crawl, index) => {
      const started = new Date(crawl.started_at).toLocaleString();
      const stats = crawl.stats_json as any;
      console.log(`  #${index + 1} - ${crawl.topic_name} (ID: ${crawl.id}) - Started: ${started}`);
    });

    console.log('\n' + '='.repeat(80));
    console.log('Marking stuck crawls as finished with failure status...\n');

    // Update each stuck crawl
    for (const crawl of stuckCrawls) {
      const stats = (crawl.stats_json || {}) as any;

      await sql`
        UPDATE crawls
        SET
          finished_at = NOW(),
          ok_bool = false,
          stats_json = ${JSON.stringify({
            kept: stats.kept || 0,
            skippedDuplicates: stats.skippedDuplicates || 0,
            skippedQuality: stats.skippedQuality || 0,
            errors: (stats.errors || 0) + 1,
            error: 'Crawl timeout - manually cleaned up',
          })}
        WHERE id = ${crawl.id}
      `;

      console.log(`  ✓ Marked crawl #${crawl.id} (${crawl.topic_name}) as finished`);
    }

    console.log(`\n✅ Successfully cleaned up ${stuckCrawls.length} stuck crawls`);

  } catch (error) {
    console.error('Error:', error);
  }
}

cleanupStuckCrawls();
