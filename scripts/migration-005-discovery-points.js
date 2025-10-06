const { neon } = require('@neondatabase/serverless');
require('dotenv').config();

const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
  throw new Error('DATABASE_URL environment variable is required');
}

async function runMigration() {
  const sql = neon(DATABASE_URL);

  console.log('Running migration 005: Add discovery_points to sources table');

  try {
    // Add discovery_points column to sources table
    await sql`
      ALTER TABLE sources
      ADD COLUMN IF NOT EXISTS discovery_points integer DEFAULT 0 NOT NULL
    `;

    console.log('✅ Migration 005 completed successfully');
    console.log('Added column: discovery_points (integer, default 0)');

  } catch (error) {
    console.error('❌ Migration 005 failed:', error);
    throw error;
  }
}

runMigration().catch(console.error);
