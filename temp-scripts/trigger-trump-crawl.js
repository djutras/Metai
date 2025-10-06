const fetch = require('node-fetch');

(async () => {
  console.log('Triggering Trump topic crawl...\n');

  try {
    // Call the local Netlify function
    const response = await fetch('http://localhost:8888/.netlify/functions/crawl_topic?topic=Trump', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    const text = await response.text();
    console.log(`Status: ${response.status} ${response.statusText}\n`);

    try {
      const result = JSON.parse(text);
      console.log('=== Crawl Result ===');
      console.log(JSON.stringify(result, null, 2));
    } catch (e) {
      console.log('Raw response:');
      console.log(text);
    }
  } catch (error) {
    console.error('Error:', error.message);
  }
})();
