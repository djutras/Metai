# Post-Launch Housekeeping & Operations

## Scheduled Function Management

### Stagger Topic Crawls

To avoid resource spikes, stagger topics across different hours:

**Edit `netlify.toml`:**
```toml
# Topic 1: hourly at :05
[[functions]]
  path = "/crawl-topic-tech"
  schedule = "5 * * * *"

# Topic 2: hourly at :20
[[functions]]
  path = "/crawl-topic-politics"
  schedule = "20 * * * *"

# Topic 3: hourly at :35
[[functions]]
  path = "/crawl-topic-economy"
  schedule = "35 * * * *"
```

**Or use query parameters with a single function:**
```bash
# Manually trigger specific topics at different times
curl "https://yoursite.netlify.app/.netlify/functions/crawl-topic?topic=tech"
```

### Weekly Points Decay

Create a weekly scheduled function:

**`netlify/functions/weekly-decay.ts`:**
```typescript
import { Handler } from '@netlify/functions';
import { weeklyDecay } from '../../src/lib/sources';

export const handler: Handler = async () => {
  await weeklyDecay();
  return {
    statusCode: 200,
    body: JSON.stringify({ success: true, message: 'Points decayed' }),
  };
};
```

**Add to `netlify.toml`:**
```toml
[[functions]]
  path = "/weekly-decay"
  schedule = "0 2 * * 0"  # Every Sunday at 2:00 AM UTC
```

### Daily Discovery Schedule

Already configured in `netlify.toml`:
```toml
[[functions]]
  path = "/discovery-probe"
  schedule = "0 3 * * *"  # Daily at 3:00 AM UTC
```

### Domain Cooldown Management

Cooldowns last 1 hour by default. To adjust:

**In `src/lib/robots.ts`:**
```typescript
setCooldown(domain, 2 * 60 * 60 * 1000); // 2 hours
```

Or clear cooldowns manually:
```typescript
clearCooldown('example.com');
```

## Database Queries for Monitoring

### Top Sources by Points

```sql
SELECT
  name,
  domain,
  points,
  last_seen_at,
  enabled
FROM sources
ORDER BY points DESC
LIMIT 20;
```

### Duplicate Rate (Last 24h)

```sql
WITH crawl_stats AS (
  SELECT
    stats_json->>'kept' as kept,
    stats_json->>'skippedDuplicates' as dupes,
    started_at
  FROM crawls
  WHERE started_at > NOW() - INTERVAL '24 hours'
    AND ok_bool = true
)
SELECT
  SUM((kept)::int) as total_kept,
  SUM((dupes)::int) as total_dupes,
  ROUND(100.0 * SUM((dupes)::int) / NULLIF(SUM((kept)::int + (dupes)::int), 0), 2) as dupe_rate_pct
FROM crawl_stats;
```

### Average Publish Latency

How long between article publication and our first crawl:

```sql
SELECT
  AVG(EXTRACT(EPOCH FROM (first_seen_at - published_at)) / 3600) as avg_latency_hours,
  MIN(EXTRACT(EPOCH FROM (first_seen_at - published_at)) / 3600) as min_latency_hours,
  MAX(EXTRACT(EPOCH FROM (first_seen_at - published_at)) / 3600) as max_latency_hours
FROM articles
WHERE first_seen_at > NOW() - INTERVAL '7 days';
```

### Error Rate per Domain

```sql
WITH domain_stats AS (
  SELECT
    SUBSTRING(canonical_url FROM 'https?://([^/]+)') as domain,
    COUNT(*) as total
  FROM articles
  WHERE first_seen_at > NOW() - INTERVAL '24 hours'
  GROUP BY domain
),
crawl_errors AS (
  SELECT
    stats_json->>'errors' as errors
  FROM crawls
  WHERE started_at > NOW() - INTERVAL '24 hours'
)
SELECT
  domain,
  total,
  -- Error calculation would require logging errors per domain
  0 as errors
FROM domain_stats
ORDER BY total DESC
LIMIT 20;
```

### Articles by Freshness

```sql
SELECT
  CASE
    WHEN published_at > NOW() - INTERVAL '3 hours' THEN '0-3h'
    WHEN published_at > NOW() - INTERVAL '12 hours' THEN '3-12h'
    WHEN published_at > NOW() - INTERVAL '48 hours' THEN '12-48h'
    ELSE '>48h'
  END as bucket,
  COUNT(*) as count
FROM articles
WHERE first_seen_at > NOW() - INTERVAL '7 days'
GROUP BY bucket
ORDER BY bucket;
```

## Weekly Maintenance Tasks

### 1. Review Source Performance (Weekly)

```sql
-- Sources with zero recent articles
SELECT name, domain, last_seen_at, points
FROM sources
WHERE enabled = true
  AND (last_seen_at < NOW() - INTERVAL '7 days' OR last_seen_at IS NULL)
ORDER BY points DESC;
```

Action: Disable underperforming sources or check if robots.txt changed.

### 2. Review Candidate Domains (Weekly)

```sql
SELECT
  cd.domain,
  cd.score,
  cd.robots_state,
  cp.has_sitemap,
  cp.jsonld_news,
  cp.lang
FROM candidate_domains cd
LEFT JOIN candidate_probes cp ON cd.id = cp.domain_id
WHERE cd.score >= 40 AND cd.score < 60
ORDER BY cd.score DESC
LIMIT 50;
```

Action: Manually promote promising candidates to sources.

### 3. Clean Old Articles (Monthly)

```sql
-- Delete articles older than 90 days with no topic links
DELETE FROM articles
WHERE id IN (
  SELECT a.id
  FROM articles a
  LEFT JOIN topic_articles ta ON a.id = ta.article_id
  WHERE ta.id IS NULL
    AND a.first_seen_at < NOW() - INTERVAL '90 days'
);
```

### 4. Vacuum Database (Monthly)

```sql
VACUUM ANALYZE articles;
VACUUM ANALYZE topic_articles;
VACUUM ANALYZE crawls;
```

## Alerts & Monitoring

Set up alerts for:

1. **Crawl Failures:** > 3 consecutive failures
   ```sql
   SELECT topic_id, COUNT(*)
   FROM crawls
   WHERE ok_bool = false
     AND started_at > NOW() - INTERVAL '6 hours'
   GROUP BY topic_id
   HAVING COUNT(*) >= 3;
   ```

2. **Zero Articles:** No articles added in last 2 hours
   ```sql
   SELECT topic_id, MAX(added_at)
   FROM topic_articles
   GROUP BY topic_id
   HAVING MAX(added_at) < NOW() - INTERVAL '2 hours';
   ```

3. **High Error Rate:** > 50% errors in a crawl
   ```sql
   SELECT *
   FROM crawls
   WHERE (stats_json->>'errors')::int > (stats_json->>'kept')::int
     AND started_at > NOW() - INTERVAL '24 hours';
   ```

## Performance Optimization

### Indexing

Already created in schema. Monitor slow queries:

```sql
-- Enable pg_stat_statements extension
CREATE EXTENSION IF NOT EXISTS pg_stat_statements;

-- Find slow queries
SELECT
  query,
  calls,
  mean_exec_time,
  max_exec_time
FROM pg_stat_statements
ORDER BY mean_exec_time DESC
LIMIT 10;
```

### Batch Inserts

For high-volume topics, use batch inserts in `dedupe.ts`:

```typescript
// Instead of individual inserts, batch:
await db.insert(topicArticles).values(articleBatch);
```

## Troubleshooting

### Scheduled Function Not Running

1. Check Netlify Functions logs
2. Verify schedule syntax in `netlify.toml`
3. Check timezone (all times UTC)

### High Duplicate Rate

1. Check SimHash threshold in `dedupe.ts` (default: 3)
2. Verify canonical URL normalization in `extract.ts`
3. Review recent crawl logs for same URL from multiple sources

### Missing Articles

1. Check robots.txt: `curl https://domain.com/robots.txt`
2. Verify sitemap lastmod dates
3. Check quality gate in `isArticle()` function
4. Review crawl stats for `skippedQuality` count

### Memory Issues

Reduce `maxUrlsPerDomain` in frontier builder:
```typescript
maxUrlsPerDomain: 20  // Default: 30
```

## Backup & Restore

### Automated Backups

Neon provides automatic daily snapshots. Configure retention:
- Dashboard > Project Settings > Backups > Retention: 7 days

### Manual Backup

```bash
pg_dump $DATABASE_URL > backup-$(date +%Y%m%d).sql
```

### Restore from Backup

```bash
# Neon point-in-time restore via dashboard

# Or from pg_dump:
psql $DATABASE_URL < backup-20240115.sql
```

## Security

### Rotate Credentials (Quarterly)

1. Generate new DATABASE_URL in Neon
2. Update Netlify environment variable
3. Redeploy

### Review API Access

Check for unusual patterns:
```sql
SELECT DISTINCT source_domain, COUNT(*)
FROM articles
WHERE first_seen_at > NOW() - INTERVAL '24 hours'
GROUP BY source_domain
ORDER BY COUNT(*) DESC;
```

Unexpected high counts may indicate scraping abuse.
