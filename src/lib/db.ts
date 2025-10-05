import { neon, neonConfig, type NeonQueryFunction } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';
import * as schema from '../../db/schema';

// Enable fetch-based queries for edge/serverless
neonConfig.fetchConnectionCache = true;

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  throw new Error('DATABASE_URL environment variable is required');
}

// Create Neon client with explicit type
const neonSql: NeonQueryFunction<boolean, boolean> = neon(DATABASE_URL);

// Create Drizzle instance with schema
export const db = drizzle(neonSql, { schema });

// Export the Neon SQL function for raw queries
export const sql = neonSql;
