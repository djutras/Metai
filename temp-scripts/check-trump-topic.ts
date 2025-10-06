import { db } from './src/lib/db';
import { topics } from './db/schema';
import { eq } from 'drizzle-orm';

async function checkTrumpTopic() {
  const [topic] = await db
    .select()
    .from(topics)
    .where(eq(topics.slug, 'Trump'))
    .limit(1);

  console.log('Trump topic settings:');
  console.log(JSON.stringify(topic, null, 2));
}

checkTrumpTopic();
