# Metaryon News Aggregator

HTML-first, RSS-free news aggregator built with TypeScript, Next.js, Neon (Postgres), and Netlify.

## Features

- **Intelligent Crawling:** Sitemap-first with index page fallback
- **Quality Filtering:** JSON-LD extraction, readability scoring, topic matching
- **Deduplication:** Canonical URL + SimHash near-duplicate detection
- **Smart Ranking:** Recency decay + keyword matching + source reputation
- **Source Discovery:** Automated domain discovery from outbound links and seed lists
- **Respectful:** Honors robots.txt, rate limits, and crawl-delay
- **Legal Compliance:** Headlines/snippets only, always links to source

## Architecture

```
├── db/
│   ├── schema.sql          # Postgres schema (idempotent)
│   └── schema.ts           # Drizzle ORM types
├── src/
│   ├── lib/
│   │   ├── http.ts         # Polite HTTP client with retries
│   │   ├── robots.ts       # robots.txt parser + rate limiter
│   │   ├── extract.ts      # Article extraction (JSON-LD + Readability)
│   │   ├── quality.ts      # Quality gate + topic matching
│   │   ├── dedupe.ts       # Deduplication (URL + SimHash)
│   │   ├── rank.ts         # Ranking algorithm
│   │   ├── sources.ts      # Source scoring + decay
│   │   └── crawl/
│   │       ├── sitemap.ts  # Sitemap parser
│   │       ├── indexPages.ts # Index page link extractor
│   │       └── frontier.ts # Frontier builder with Bloom filter
│   └── jobs/
│       ├── runTopic.ts     # Hourly topic crawler
│       └── runDiscovery.ts # Daily domain discovery
├── netlify/functions/
│   ├── crawl_topic.ts      # Scheduled: hourly
│   └── discovery_probe.ts  # Scheduled: daily
├── app/
│   ├── [topicSlug]/page.tsx # Topic page
│   ├── page.tsx            # Index (multi-topic)
│   └── components/Footer.tsx # Legal footer
└── tests/e2e/              # Playwright tests
```

## Tech Stack

- **Runtime:** Node.js 20+
- **Framework:** Next.js 14 (App Router)
- **Database:** Neon (serverless Postgres)
- **ORM:** Drizzle
- **Deployment:** Netlify (Functions + Scheduled Functions)
- **Testing:** Playwright
- **Bundler:** esbuild

## Quick Start

### 1. Install Dependencies

```bash
npm install
```

### 2. Set Environment Variables

Copy `.env.example` to `.env`:

```bash
DATABASE_URL=postgresql://user:password@host.neon.tech/dbname
ADMIN_PASSWORD=your-password
USER_AGENT_CONTACT=https://yoursite.com/contact
```

### 3. Run Migrations

```bash
npm run db:migrate
```

### 4. Seed Data

```sql
-- Create a topic
INSERT INTO topics (slug, name, query, includes, lang, enabled)
VALUES ('tech', 'Technology', 'AI software', ARRAY['tech'], ARRAY['en'], true);

-- Add sources
INSERT INTO sources (name, domain, type, enabled)
VALUES ('Reuters', 'reuters.com', 'custom_crawler', true);
```

### 5. Run Locally

```bash
npm run dev
```

Visit `http://localhost:3000/tech`

### 6. Deploy

See [DEPLOYMENT.md](./DEPLOYMENT.md) for full deployment guide.

## Configuration

### Topic Configuration

```sql
INSERT INTO topics (
  slug,           -- URL slug
  name,           -- Display name
  query,          -- Search keywords
  includes,       -- Required keywords
  excludes,       -- Banned keywords
  lang,           -- Languages (e.g., ['en', 'fr'])
  freshness_hours, -- Max article age
  max_items,      -- Max articles to keep
  enabled
) VALUES (...);
```

### Source Configuration

```sql
INSERT INTO sources (
  name,           -- Display name
  domain,         -- Domain (no https://)
  type,           -- 'custom_crawler' | 'google_news' | 'reddit' | 'api'
  api_config,     -- JSON config (e.g., {"indexPaths": ["/news"]})
  points,         -- Reputation score (auto-incremented)
  enabled
) VALUES (...);
```

## Operations

See [OPERATIONS.md](./OPERATIONS.md) for:
- Weekly maintenance tasks
- Monitoring queries
- Performance optimization
- Backup & restore

## Testing

### Unit Tests

```bash
npm test
```

### E2E Tests

```bash
npm run test:e2e
```

## Design System

Minimalist, monochrome design:
- **Typography:** Inter, 1.45 line-height
- **Colors:** Near-monochrome (bg: #0B0C0E or #FAFAFA, accent: #4F46E5)
- **Spacing:** 8px grid
- **Cards:** 12px radius, subtle shadow
- **Motion:** 120-160ms micro-transitions

See `app/globals.css` for full design tokens.

## Legal & Safety

- **Headlines/snippets only:** No full-text republication
- **Always links to source:** Canonical URL shown
- **Respects robots.txt:** Disallowed paths never fetched
- **Paywall labels:** Transparent labeling
- **Footer disclaimer:** "© respective owners"

## License

MIT

## Support

- **Issues:** [GitHub Issues](https://github.com/yourusername/metaryon/issues)
- **Docs:** See `/docs` folder
- **Contact:** Set in `USER_AGENT_CONTACT` env var
