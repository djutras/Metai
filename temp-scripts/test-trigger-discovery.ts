async function testTrigger() {
  console.log('Testing discovery trigger...\n');

  try {
    const response = await fetch('https://obscureai.netlify.app/.netlify/functions/trigger-discovery', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        topicSlug: 'Trump',
      }),
    });

    console.log('Status:', response.status);

    const text = await response.text();
    console.log('Response:', text);

    if (!response.ok) {
      console.error('\n❌ Failed to trigger discovery');
    } else {
      console.log('\n✅ Discovery triggered successfully');
    }
  } catch (error) {
    console.error('Error:', error);
  }
}

testTrigger();
