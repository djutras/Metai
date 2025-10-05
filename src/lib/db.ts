import { neon, neonConfig } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';
import * as schema from '../../db/schema';

// Enable fetch-based queries for edge/serverless
neonConfig.fetchConnectionCache = true;

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  throw new Error('DATABASE_URL environment variable is required');
}

// Create Neon client
const sql = neon(DATABASE_URL);

// Create Drizzle instance with schema
export const db = drizzle(sql, { schema });

// Raw SQL helper for advanced queries
export { sql };
