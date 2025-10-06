import { neon } from '@neondatabase/serverless';
import * as dotenv from 'dotenv';

dotenv.config();

async function checkRecentCrawls() {
  const DATABASE_URL = process.env.DATABASE_URL;

  if (!DATABASE_URL) {
    throw new Error('DATABASE_URL is required');
  }

  const sql = neon(DATABASE_URL);

  try {
    console.log('Checking crawls after Oct 5, 2025 11:44 AM...\n');

    // Count crawls after that time
    const countResult = await sql`
      SELECT COUNT(*) as count
      FROM crawls
      WHERE finished_at > '2025-10-05 11:44:00'
    `;

    console.log(`Total crawls finished after Oct 5, 11:44 AM: ${countResult[0].count}\n`);

    // List those crawls
    const crawls = await sql`
      SELECT
        c.id,
        c.topic_id,
        t.name as topic_name,
        c.started_at,
        c.finished_at,
        c.stats_json
      FROM crawls c
      LEFT JOIN topics t ON c.topic_id = t.id
      WHERE c.finished_at > '2025-10-05 11:44:00'
      ORDER BY c.finished_at DESC
    `;

    if (crawls.length > 0) {
      console.log('Crawls that finished after Oct 5, 11:44 AM:');
      console.log('='.repeat(80));

      crawls.forEach((crawl, index) => {
        const started = new Date(crawl.started_at).toLocaleString();
        const finished = crawl.finished_at ? new Date(crawl.finished_at).toLocaleString() : 'Not finished';
        const stats = crawl.stats_json as any;
        const kept = stats?.kept || 0;

        console.log(`\n#${index + 1}`);
        console.log(`  ID: ${crawl.id}`);
        console.log(`  Topic: ${crawl.topic_name || `ID ${crawl.topic_id}`}`);
        console.log(`  Started: ${started}`);
        console.log(`  Finished: ${finished}`);
        console.log(`  Articles kept: ${kept}`);
      });
    } else {
      console.log('No crawls found after that time.');
    }

    // Also check if there are currently running crawls
    console.log('\n' + '='.repeat(80));
    const runningCrawls = await sql`
      SELECT
        c.id,
        c.topic_id,
        t.name as topic_name,
        c.started_at,
        c.finished_at
      FROM crawls c
      LEFT JOIN topics t ON c.topic_id = t.id
      WHERE c.finished_at IS NULL
      ORDER BY c.started_at DESC
      LIMIT 10
    `;

    if (runningCrawls.length > 0) {
      console.log(`\nCurrently running crawls: ${runningCrawls.length}`);
      runningCrawls.forEach((crawl, index) => {
        const started = new Date(crawl.started_at).toLocaleString();
        console.log(`  #${index + 1} - ${crawl.topic_name || `Topic ${crawl.topic_id}`} - Started: ${started}`);
      });
    } else {
      console.log('\nNo currently running crawls.');
    }

  } catch (error) {
    console.error('Error:', error);
  }
}

checkRecentCrawls();
