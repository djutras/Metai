import { neon } from '@neondatabase/serverless';

// Check .env DATABASE_URL
import * as fs from 'fs';
import * as path from 'path';

const envContent = fs.readFileSync(path.join(__dirname, '.env'), 'utf-8');
const databaseUrlMatch = envContent.match(/DATABASE_URL=(.+)/);

if (databaseUrlMatch) {
  const dbUrl = databaseUrlMatch[1].trim();
  console.log('DATABASE_URL from .env:');
  console.log(dbUrl);
  console.log('\n');

  const sql = neon(dbUrl);

  const topics = await sql`SELECT id, slug, name, max_items FROM topics WHERE slug = 'Trump'`;
  console.log('Trump topic from DATABASE_URL:');
  console.log(topics);
}
