import { runTopic } from '../src/jobs/runTopic';

async function main() {
  try {
    // Get topic slug from command line args (optional)
    const topicSlug = process.argv[2];

    console.log(topicSlug
      ? `Starting crawl for topic: ${topicSlug}`
      : 'Starting crawl for all enabled topics');

    const result = await runTopic(topicSlug);

    console.log('\nCrawl completed successfully!');
    console.log(JSON.stringify(result, null, 2));

    process.exit(0);
  } catch (error) {
    console.error('\nCrawl failed:', error);
    process.exit(1);
  }
}

main();
