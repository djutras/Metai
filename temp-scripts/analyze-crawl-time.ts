import { neon } from '@neondatabase/serverless';
import * as dotenv from 'dotenv';

dotenv.config();

async function analyzeCrawlTime() {
  const DATABASE_URL = process.env.DATABASE_URL;

  if (!DATABASE_URL) {
    throw new Error('DATABASE_URL is required');
  }

  const sql = neon(DATABASE_URL);

  try {
    // Get all enabled topics with their source counts
    const topics = await sql`
      SELECT
        t.id,
        t.name,
        t.slug,
        COUNT(st.source_id) as source_count
      FROM topics t
      LEFT JOIN sources_topics st ON t.id = st.topic_id
      LEFT JOIN sources s ON st.source_id = s.id AND s.enabled = true
      WHERE t.enabled = true
      GROUP BY t.id, t.name, t.slug
      ORDER BY source_count DESC
    `;

    console.log('='.repeat(80));
    console.log('CRAWL TIME ANALYSIS');
    console.log('='.repeat(80));
    console.log('\nEnabled Topics and Source Counts:\n');

    let totalSources = 0;
    topics.forEach((topic, index) => {
      const count = Number(topic.source_count);
      totalSources += count;
      console.log(`  ${index + 1}. ${topic.name} (${topic.slug}): ${count} sources`);
    });

    console.log('\n' + '='.repeat(80));
    console.log('TIME CALCULATIONS:\n');

    // Assume 10 seconds per source (avg for fetching + processing)
    const secondsPerSource = 10;
    const totalSeconds = totalSources * secondsPerSource;
    const totalMinutes = totalSeconds / 60;

    console.log(`Total enabled sources across all topics: ${totalSources}`);
    console.log(`\nAt ${secondsPerSource} seconds per source:`);
    console.log(`  - Total time needed: ${totalSeconds} seconds (${totalMinutes.toFixed(1)} minutes)`);

    // Current limits
    console.log('\n' + '='.repeat(80));
    console.log('CURRENT LIMITS:\n');
    console.log('  - Netlify function timeout: 10 seconds (free tier)');
    console.log('  - GitHub Actions curl timeout: 300 seconds (5 minutes)');
    console.log('  - Proposed new limit: 2700 seconds (45 minutes)');

    // Analysis per topic
    console.log('\n' + '='.repeat(80));
    console.log('PER-TOPIC ANALYSIS:\n');

    topics.forEach((topic) => {
      const count = Number(topic.source_count);
      const topicSeconds = count * secondsPerSource;
      const topicMinutes = topicSeconds / 60;

      const fitsIn5Min = topicSeconds <= 300;
      const fitsIn45Min = topicSeconds <= 2700;

      console.log(`\n${topic.name}:`);
      console.log(`  Sources: ${count}`);
      console.log(`  Est. time: ${topicSeconds}s (${topicMinutes.toFixed(1)} min)`);
      console.log(`  Fits in 5 min? ${fitsIn5Min ? '✅ YES' : '❌ NO'}`);
      console.log(`  Fits in 45 min? ${fitsIn45Min ? '✅ YES' : '❌ NO'}`);
    });

    // Recommendation
    console.log('\n' + '='.repeat(80));
    console.log('RECOMMENDATION:\n');

    const maxTopicTime = Math.max(...topics.map(t => Number(t.source_count) * secondsPerSource));
    const maxTopicMinutes = maxTopicTime / 60;

    console.log(`Largest topic needs: ${maxTopicTime}s (${maxTopicMinutes.toFixed(1)} minutes)`);

    if (maxTopicTime <= 300) {
      console.log('✅ Current 5-minute limit is sufficient');
    } else if (maxTopicTime <= 2700) {
      console.log('⚠️  Need to increase to 45 minutes');
      console.log('   NOTE: Netlify free tier has 10s limit on functions!');
      console.log('   You may need to switch approach or upgrade Netlify tier.');
    } else {
      console.log('❌ Even 45 minutes is not enough!');
      console.log('   Consider splitting topics or parallel processing.');
    }

    console.log('\n' + '='.repeat(80));

  } catch (error) {
    console.error('Error:', error);
  }
}

analyzeCrawlTime();
