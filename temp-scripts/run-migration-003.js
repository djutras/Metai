const { neon } = require('@neondatabase/serverless');
const fs = require('fs');

const DATABASE_URL = 'postgresql://neondb_owner:npg_IZm4bMTkdxR5@ep-icy-pond-aevzfm4q-pooler.c-2.us-east-2.aws.neon.tech/neondb?sslmode=require';

(async () => {
  const sql = neon(DATABASE_URL);

  console.log('Running migration 003: many-to-many sources-topics...\n');

  try {
    // Read migration file
    const migration = fs.readFileSync('migrations/003_many_to_many_sources_topics.sql', 'utf8');

    // Execute migration
    await sql(migration);

    console.log('✓ Migration completed successfully!');
    console.log('\nChanges made:');
    console.log('  - Created sources_topics junction table');
    console.log('  - Migrated existing source-topic relationships');
    console.log('  - Removed topic_id column from sources table');
    console.log('  - Created indexes for better performance');

    // Verify the migration
    const count = await sql`SELECT COUNT(*) as count FROM sources_topics`;
    console.log(`\n✓ Found ${count[0].count} source-topic relationships in junction table`);
  } catch (error) {
    console.error('✗ Migration failed:', error.message);
    process.exit(1);
  }
})();
