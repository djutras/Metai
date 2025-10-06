// Test new flexible patterns
const cnnPattern = /^https?:\/\/(?:www\.)?cnn\.com\/\d{4}\/\d{2}\/\d{2}\/[a-z]+\/[a-z0-9-]+(?:\/[a-z0-9-]+)?(?:\/index\.html)?(?:\?.*)?$/;
const guardianPattern = /^https?:\/\/www\.theguardian\.com\/[a-z-]+\/(?:live\/|video\/)?\d{4}\/\w{3}\/\d{1,2}\/[a-z0-9-]+(?:\.html)?(?:\?.*)?$/;

// Sample URLs from sitemaps
const cnnUrls = [
  'https://www.cnn.com/2025/10/05/politics/trump-latest/index.html',
  'https://www.cnn.com/2025/10/5/politics/trump-latest',  // Still fails - need \d{1,2}
  'https://www.cnn.com/2025/10/05/politics/trump-latest',
];

const guardianUrls = [
  'https://www.theguardian.com/us-news/2025/oct/05/trump-campaign',
  'https://www.theguardian.com/us-news/donaldtrump',  // topic page
  'https://www.theguardian.com/us-news/2025/oct/5/trump-latest',
];

console.log('CNN Pattern Test:');
cnnUrls.forEach(url => {
  console.log(`  ${cnnPattern.test(url) ? '✓' : '✗'} ${url}`);
});

console.log('\nGuardian Pattern Test:');
guardianUrls.forEach(url => {
  console.log(`  ${guardianPattern.test(url) ? '✓' : '✗'} ${url}`);
});
