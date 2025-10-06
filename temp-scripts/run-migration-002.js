// Run migration 002: Make topic_id required
const { neon } = require('@neondatabase/serverless');
const fs = require('fs');

const DATABASE_URL = 'postgresql://neondb_owner:npg_IZm4bMTkdxR5@ep-icy-pond-aevzfm4q-pooler.c-2.us-east-2.aws.neon.tech/neondb?sslmode=require';

async function runMigration() {
  const sql = neon(DATABASE_URL);

  try {
    console.log('Starting migration 002: Make topic_id required...\n');

    // Check if any sources have NULL topic_id
    console.log('Checking for sources with NULL topic_id...');
    const nullTopics = await sql`
      SELECT id, name, domain FROM sources WHERE topic_id IS NULL
    `;

    if (nullTopics.length > 0) {
      console.log(`\n⚠️  WARNING: Found ${nullTopics.length} source(s) with NULL topic_id:`);
      nullTopics.forEach(s => {
        console.log(`   - ID ${s.id}: ${s.name} (${s.domain})`);
      });
      console.log('\nMigration ABORTED. Please assign a topic to these sources first.');
      process.exit(1);
    }

    console.log('✓ All sources have a topic_id\n');

    // Add foreign key constraint
    console.log('Adding foreign key constraint...');
    await sql`
      DO $$
      BEGIN
          IF NOT EXISTS (
              SELECT 1 FROM pg_constraint WHERE conname = 'sources_topic_id_topics_id_fk'
          ) THEN
              ALTER TABLE sources
              ADD CONSTRAINT sources_topic_id_topics_id_fk
              FOREIGN KEY (topic_id) REFERENCES topics(id) ON DELETE CASCADE;
          END IF;
      END $$;
    `;
    console.log('✓ Foreign key constraint added');

    // Make column NOT NULL
    console.log('Setting topic_id to NOT NULL...');
    await sql`ALTER TABLE sources ALTER COLUMN topic_id SET NOT NULL`;
    console.log('✓ Column set to NOT NULL');

    // Add comment
    console.log('Adding column comment...');
    await sql`COMMENT ON COLUMN sources.topic_id IS 'Required: Each source must belong to exactly one topic'`;
    console.log('✓ Comment added');

    console.log('\n✓✓✓ Migration 002 completed successfully! ✓✓✓\n');

  } catch (error) {
    console.error('\n✗ Migration failed:', error.message);
    process.exit(1);
  }
}

runMigration();
