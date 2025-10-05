-- Idempotent schema for Neon/Postgres news aggregator
-- Run with: psql $DATABASE_URL -f schema.sql

-- Enable extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Sources table
CREATE TABLE IF NOT EXISTS sources (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  domain TEXT UNIQUE NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('google_news', 'reddit', 'custom_crawler', 'api')),
  api_config JSONB DEFAULT '{}'::jsonb,
  points INTEGER DEFAULT 0,
  last_seen_at TIMESTAMPTZ,
  enabled BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Topics table
CREATE TABLE IF NOT EXISTS topics (
  id SERIAL PRIMARY KEY,
  slug TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  query TEXT,
  includes TEXT[] DEFAULT '{}',
  excludes TEXT[] DEFAULT '{}',
  lang TEXT[] DEFAULT '{en}',
  region TEXT,
  freshness_hours INTEGER DEFAULT 72,
  max_items INTEGER DEFAULT 30,
  config_json JSONB DEFAULT '{}'::jsonb,
  enabled BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Articles table
CREATE TABLE IF NOT EXISTS articles (
  id BIGSERIAL PRIMARY KEY,
  canonical_url TEXT UNIQUE NOT NULL,
  title TEXT NOT NULL,
  summary TEXT,
  source_id INTEGER REFERENCES sources(id) ON DELETE SET NULL,
  published_at TIMESTAMPTZ NOT NULL,
  lang TEXT,
  image_url TEXT,
  simhash BYTEA,
  paywalled_bool BOOLEAN DEFAULT false,
  first_seen_at TIMESTAMPTZ DEFAULT NOW()
);

-- Topic-Articles junction table
CREATE TABLE IF NOT EXISTS topic_articles (
  id BIGSERIAL PRIMARY KEY,
  topic_id INTEGER NOT NULL REFERENCES topics(id) ON DELETE CASCADE,
  article_id BIGINT NOT NULL REFERENCES articles(id) ON DELETE CASCADE,
  added_at TIMESTAMPTZ DEFAULT NOW(),
  hidden_bool BOOLEAN DEFAULT false,
  UNIQUE(topic_id, article_id)
);

-- Crawl logs
CREATE TABLE IF NOT EXISTS crawls (
  id BIGSERIAL PRIMARY KEY,
  topic_id INTEGER REFERENCES topics(id) ON DELETE SET NULL,
  started_at TIMESTAMPTZ DEFAULT NOW(),
  finished_at TIMESTAMPTZ,
  ok_bool BOOLEAN,
  stats_json JSONB
);

-- Candidate domains for discovery
CREATE TABLE IF NOT EXISTS candidate_domains (
  id SERIAL PRIMARY KEY,
  domain TEXT UNIQUE NOT NULL,
  discovered_via TEXT,
  score INTEGER,
  robots_state TEXT,
  first_seen_at TIMESTAMPTZ DEFAULT NOW(),
  last_seen_at TIMESTAMPTZ,
  notes TEXT
);

-- Candidate probes
CREATE TABLE IF NOT EXISTS candidate_probes (
  id SERIAL PRIMARY KEY,
  domain_id INTEGER NOT NULL REFERENCES candidate_domains(id) ON DELETE CASCADE,
  has_sitemap BOOLEAN,
  has_feed BOOLEAN,
  jsonld_news BOOLEAN,
  lastmod_recent BOOLEAN,
  lang TEXT,
  status_json JSONB,
  probed_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_articles_published_at ON articles(published_at DESC);
CREATE INDEX IF NOT EXISTS idx_sources_points ON sources(points DESC);
CREATE INDEX IF NOT EXISTS idx_topic_articles_topic_added ON topic_articles(topic_id, added_at DESC);
CREATE INDEX IF NOT EXISTS idx_articles_simhash ON articles USING hash(simhash);
CREATE INDEX IF NOT EXISTS idx_articles_source_id ON articles(source_id);
CREATE INDEX IF NOT EXISTS idx_crawls_topic_id ON crawls(topic_id, started_at DESC);
CREATE INDEX IF NOT EXISTS idx_candidate_probes_domain_id ON candidate_probes(domain_id);
