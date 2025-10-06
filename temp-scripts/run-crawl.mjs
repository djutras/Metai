// Direct runner for runTopic
import('./src/jobs/runTopic.ts').then(async ({ runTopic }) => {
  const topicSlug = process.argv[2] || undefined;

  console.log(`Starting ${topicSlug || 'all topics'} crawl...`);

  try {
    const result = await runTopic(topicSlug);
    console.log('\nCrawl result:', JSON.stringify(result, null, 2));
    process.exit(0);
  } catch (error) {
    console.error('Crawl error:', error);
    process.exit(1);
  }
}).catch(error => {
  console.error('Import error:', error);
  process.exit(1);
});
