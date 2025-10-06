import { runDiscovery } from '../src/jobs/runDiscovery';

async function main() {
  try {
    console.log('Starting discovery process...\n');

    const result = await runDiscovery();

    console.log('\n' + '='.repeat(80));
    console.log('DISCOVERY COMPLETE');
    console.log('='.repeat(80));
    console.log(JSON.stringify(result, null, 2));

    process.exit(0);
  } catch (error) {
    console.error('\n❌ Discovery failed:', error);
    process.exit(1);
  }
}

main();
