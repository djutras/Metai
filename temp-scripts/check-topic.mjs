import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';
import * as schema from './db/schema.ts';
import dotenv from 'dotenv';

dotenv.config();

const sql = neon(process.env.DATABASE_URL);
const db = drizzle(sql, { schema });

const allTopics = await db.select().from(schema.topics);
console.log('All topics:');
allTopics.forEach(t => console.log(`  - ${t.slug} (${t.name}) - enabled: ${t.enabled}`));

process.exit(0);
