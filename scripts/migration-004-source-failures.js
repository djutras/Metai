const { neon } = require('@neondatabase/serverless');
require('dotenv').config();

const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
  throw new Error('DATABASE_URL environment variable is required');
}

async function runMigration() {
  const sql = neon(DATABASE_URL);

  console.log('Running migration 004: Add failure tracking to sources table');

  try {
    // Add failure tracking columns to sources table
    await sql`
      ALTER TABLE sources
      ADD COLUMN IF NOT EXISTS consecutive_failures integer DEFAULT 0 NOT NULL,
      ADD COLUMN IF NOT EXISTS last_failure_at timestamp with time zone,
      ADD COLUMN IF NOT EXISTS last_success_at timestamp with time zone,
      ADD COLUMN IF NOT EXISTS failure_reason text
    `;

    console.log('✅ Migration 004 completed successfully');
    console.log('Added columns:');
    console.log('  - consecutive_failures (integer, default 0)');
    console.log('  - last_failure_at (timestamp)');
    console.log('  - last_success_at (timestamp)');
    console.log('  - failure_reason (text)');

  } catch (error) {
    console.error('❌ Migration 004 failed:', error);
    throw error;
  }
}

runMigration().catch(console.error);
