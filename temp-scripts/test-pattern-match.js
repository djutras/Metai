// Test if patterns match sample sitemap URLs
const cnnPattern = /^https:\/\/www\.cnn\.com\/\d{4}\/\d{2}\/\d{2}\/[a-z]+\/[^/]+$/;
const guardianPattern = /^https?:\/\/www\.theguardian\.com\/[a-z-]+\/(?:live\/|ng-interactive\/|gallery\/|video\/)?\d{4}\/\w{3}\/\d{2}\/[\w-]+$/;

// Sample URLs from sitemaps
const cnnUrls = [
  'https://www.cnn.com/2025/10/05/politics/trump-latest/index.html',
  'https://www.cnn.com/2025/10/5/politics/trump-latest',
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
