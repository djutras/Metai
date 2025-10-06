import { neon } from '@neondatabase/serverless';
import * as dotenv from 'dotenv';
import * as fs from 'fs';
import * as path from 'path';

dotenv.config();

async function runMigration() {
  const DATABASE_URL = process.env.DATABASE_URL;

  if (!DATABASE_URL) {
    throw new Error('DATABASE_URL is required');
  }

  const sql = neon(DATABASE_URL);

  try {
    console.log('Running migration 004: Add suggested_topic_id to candidate_domains\n');

    // Execute migrations one at a time
    console.log('Adding suggested_topic_id column...');
    await sql`
      ALTER TABLE candidate_domains
      ADD COLUMN suggested_topic_id INTEGER REFERENCES topics(id) ON DELETE SET NULL
    `;

    console.log('Creating index...');
    await sql`
      CREATE INDEX idx_candidate_domains_suggested_topic ON candidate_domains(suggested_topic_id)
    `;

    console.log('\n✅ Migration 004 completed successfully!');
    console.log('\nChanges:');
    console.log('  - Added suggested_topic_id column to candidate_domains');
    console.log('  - Added index idx_candidate_domains_suggested_topic');

  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  }
}

runMigration();
