import fetch from 'node-fetch';

async function checkDeploy() {
  const maxAttempts = 30;
  let attempt = 0;

  while (attempt < maxAttempts) {
    attempt++;
    console.log(`\nAttempt ${attempt}/${maxAttempts}: Checking obscureai.netlify.app...`);

    try {
      const response = await fetch('https://obscureai.netlify.app/');
      console.log(`✅ Site is up! Status: ${response.status}`);

      const html = await response.text();

      // Check for common error indicators
      if (html.includes('Application error') ||
          html.includes('Page Not Found') ||
          html.includes('500') ||
          html.includes('Internal Server Error') ||
          html.toLowerCase().includes('error occurred')) {
        console.log('⚠️  Site loaded but shows error page');

        if (attempt >= maxAttempts) {
          console.log('\n❌ Build may have failed. Check Netlify dashboard.');
          process.exit(1);
        }
      } else if (html.includes('Trump') || html.includes('World News')) {
        console.log('✅ Site is working correctly!');
        console.log('\nDeploy successful! Site is live and functional.');
        process.exit(0);
      } else {
        console.log('⚠️  Site loaded but content unclear');
      }

    } catch (error) {
      console.log(`❌ Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }

    // Wait 10 seconds before next attempt
    console.log('Waiting 10 seconds...');
    await new Promise(resolve => setTimeout(resolve, 10000));
  }

  console.log('\n❌ Timed out waiting for deploy. Check Netlify dashboard.');
  process.exit(1);
}

checkDeploy();
