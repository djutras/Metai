# Deployment Checklist

## Prerequisites
- Node.js 20+
- Neon account (https://neon.tech)
- Netlify account (https://netlify.com)

## Step-by-Step Deployment

### 1. Create Neon Project

```bash
# Visit https://neon.tech and create a new project
# Copy the DATABASE_URL connection string
```

### 2. Run Database Migrations

```bash
# Set environment variable
export DATABASE_URL="postgresql://user:password@host.neon.tech/dbname?sslmode=require"

# Run migrations
psql $DATABASE_URL -f db/schema.sql
```

Verify tables created:
```sql
\dt
# Should show: sources, topics, articles, topic_articles, crawls, candidate_domains, candidate_probes
```

### 3. Seed Initial Data

```sql
-- Create a test topic
INSERT INTO topics (slug, name, query, includes, excludes, lang, freshness_hours, max_items, enabled)
VALUES ('tech', 'Technology News', 'technology AI software', ARRAY['tech', 'software'], ARRAY['opinion'], ARRAY['en'], 72, 30, true);

-- Add some sources
INSERT INTO sources (name, domain, type, points, enabled)
VALUES
  ('Reuters', 'reuters.com', 'custom_crawler', 0, true),
  ('BBC', 'bbc.com', 'custom_crawler', 0, true),
  ('TechCrunch', 'techcrunch.com', 'custom_crawler', 0, true);
```

### 4. Configure Netlify Site

```bash
# Install Netlify CLI
npm install -g netlify-cli

# Login
netlify login

# Initialize site
netlify init
```

### 5. Set Environment Variables

In Netlify dashboard (Site Settings > Environment Variables):

```
DATABASE_URL=postgresql://user:password@host.neon.tech/dbname?sslmode=require
ADMIN_PASSWORD=your-secure-password
USER_AGENT_CONTACT=https://yourdomain.com/about
USER_AGENT_NAME=NewsAggregator
USER_AGENT_VERSION=1.0.0
```

### 6. Deploy

```bash
# Install dependencies
npm install

# Build locally to verify
npm run build

# Deploy to Netlify
netlify deploy --build --prod
```

### 7. Verify Scheduled Functions

Check Netlify Functions logs:
- `/crawl-topic` should run hourly at :05
- `/discovery-probe` should run daily at 03:00 UTC

Manual test:
```bash
curl https://yoursite.netlify.app/.netlify/functions/crawl-topic?topic=tech
```

Expected response:
```json
{
  "success": true,
  "kept": 15,
  "skippedDuplicates": 5,
  "skippedQuality": 3,
  "errors": 0,
  "crawlId": "123"
}
```

### 8. Run Discovery Once

```bash
curl -X POST https://yoursite.netlify.app/.netlify/functions/discovery-probe
```

### 9. Approve Candidates (Optional)

```sql
-- View discovered candidates
SELECT domain, score, robots_state
FROM candidate_domains
WHERE score >= 40
ORDER BY score DESC;

-- Manually promote a candidate
INSERT INTO sources (name, domain, type, points, enabled)
SELECT domain, domain, 'custom_crawler', 0, true
FROM candidate_domains
WHERE domain = 'example-news-site.com';
```

### 10. Verify Page Updates

Visit `https://yoursite.netlify.app/tech` and verify:
- Articles appear
- "Updated X minutes ago" shows < 70 minutes after crawl
- Source chips display correctly
- No duplicate articles

## Rollback Procedure

If deployment fails:

```bash
# Rollback to previous Netlify deployment
netlify rollback

# Or restore Neon snapshot
# Visit Neon dashboard > Backups > Restore
```

## Backup Policy

Neon automatic daily snapshots enabled by default. Verify in dashboard:
- Backups > Point-in-time restore available for last 7 days

Manual backup:
```bash
pg_dump $DATABASE_URL > backup-$(date +%Y%m%d).sql
```

## Post-Deployment Verification

✅ Database tables created
✅ At least 1 topic and 3 sources seeded
✅ Scheduled functions running
✅ Topic page renders articles
✅ No errors in Netlify function logs
✅ Discovery worker finding candidates
✅ Robots.txt respected (check logs for "disallows" messages)

## Monitoring

- Netlify Functions logs: Dashboard > Functions
- Neon metrics: Dashboard > Metrics
- Error tracking: Check `crawls` table for `ok_bool = false`

```sql
-- Check recent crawl success rate
SELECT
  ok_bool,
  COUNT(*),
  AVG((stats_json->>'kept')::int) as avg_kept
FROM crawls
WHERE started_at > NOW() - INTERVAL '24 hours'
GROUP BY ok_bool;
```
