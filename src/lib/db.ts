import { neon, neonConfig } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';
import * as schema from '../../db/schema';

// Disable fetch connection cache to prevent stale data
neonConfig.fetchConnectionCache = false;

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  throw new Error('DATABASE_URL environment variable is required');
}

// Create Neon client
const neonSql = neon(DATABASE_URL);

// Create Drizzle instance with schema - use type assertion to handle generic mismatch
export const db = drizzle(neonSql as any, { schema });

// Export the Neon SQL function for raw queries
export const sql = neonSql;
