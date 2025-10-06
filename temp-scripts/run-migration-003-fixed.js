const { neon } = require('@neondatabase/serverless');

const DATABASE_URL = 'postgresql://neondb_owner:npg_IZm4bMTkdxR5@ep-icy-pond-aevzfm4q-pooler.c-2.us-east-2.aws.neon.tech/neondb?sslmode=require';

(async () => {
  const sql = neon(DATABASE_URL);

  console.log('Running migration 003: many-to-many sources-topics...\n');

  try {
    // Step 1: Create junction table
    console.log('Step 1: Creating sources_topics junction table...');
    await sql`
      CREATE TABLE IF NOT EXISTS sources_topics (
        id SERIAL PRIMARY KEY,
        source_id INTEGER NOT NULL REFERENCES sources(id) ON DELETE CASCADE,
        topic_id INTEGER NOT NULL REFERENCES topics(id) ON DELETE CASCADE,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        UNIQUE(source_id, topic_id)
      )
    `;
    console.log('✓ Table created\n');

    // Step 2: Migrate existing data
    console.log('Step 2: Migrating existing source-topic relationships...');
    const migrated = await sql`
      INSERT INTO sources_topics (source_id, topic_id)
      SELECT id, topic_id FROM sources WHERE topic_id IS NOT NULL
      ON CONFLICT (source_id, topic_id) DO NOTHING
      RETURNING *
    `;
    console.log(`✓ Migrated ${migrated.length} relationships\n`);

    // Step 3: Drop foreign key constraint
    console.log('Step 3: Removing old topic_id column...');
    await sql`ALTER TABLE sources DROP CONSTRAINT IF EXISTS sources_topic_id_topics_id_fk`;
    console.log('✓ Dropped foreign key constraint');

    await sql`ALTER TABLE sources DROP COLUMN IF EXISTS topic_id`;
    console.log('✓ Dropped topic_id column\n');

    // Step 4: Create indexes
    console.log('Step 4: Creating indexes...');
    await sql`CREATE INDEX IF NOT EXISTS idx_sources_topics_source_id ON sources_topics(source_id)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_sources_topics_topic_id ON sources_topics(topic_id)`;
    console.log('✓ Indexes created\n');

    // Verify
    const count = await sql`SELECT COUNT(*) as count FROM sources_topics`;
    console.log(`\n✓✓✓ Migration completed successfully! ✓✓✓`);
    console.log(`Total source-topic relationships: ${count[0].count}`);
  } catch (error) {
    console.error('\n✗ Migration failed:', error.message);
    console.error('Full error:', error);
    process.exit(1);
  }
})();
