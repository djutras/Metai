const Database = require('better-sqlite3');
const path = require('path');

const dbPath = path.join(__dirname, 'data', 'metai.db');
const db = new Database(dbPath, { readonly: true });

const topic = db.prepare("SELECT * FROM topics WHERE slug = 'Trump'").get();
console.log('Trump topic settings:', topic);

const articleCount = db.prepare(`
  SELECT COUNT(*) as count
  FROM topicArticles
  WHERE topicId = ? AND hiddenBool = 0
`).get(topic.id);

console.log('\nTotal Trump articles in database:', articleCount.count);

db.close();
