import { pgTable, serial, text, integer, boolean, timestamp, jsonb, bigserial } from 'drizzle-orm/pg-core';

// Sources table
export const sources = pgTable('sources', {
  id: serial('id').primaryKey(),
  name: text('name').notNull(),
  domain: text('domain').unique().notNull(),
  type: text('type').notNull(),
  apiConfig: jsonb('api_config'),
  points: integer('points').default(0).notNull(),
  topicId: integer('topic_id'),
  lastSeenAt: timestamp('last_seen_at', { withTimezone: true }),
  enabled: boolean('enabled').default(true).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull()
});

// Topics table
export const topics = pgTable('topics', {
  id: serial('id').primaryKey(),
  slug: text('slug').unique().notNull(),
  name: text('name').notNull(),
  query: text('query'),
  includes: text('includes').array().default([]).notNull(),
  excludes: text('excludes').array().default([]).notNull(),
  lang: text('lang').array().default(['en']).notNull(),
  region: text('region'),
  freshnessHours: integer('freshness_hours').default(72).notNull(),
  maxItems: integer('max_items').default(30).notNull(),
  configJson: jsonb('config_json'),
  enabled: boolean('enabled').default(true).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull()
});

// Articles table
export const articles = pgTable('articles', {
  id: bigserial('id', { mode: 'bigint' }).primaryKey(),
  canonicalUrl: text('canonical_url').unique().notNull(),
  title: text('title').notNull(),
  summary: text('summary'),
  sourceId: integer('source_id').references(() => sources.id, { onDelete: 'set null' }),
  publishedAt: timestamp('published_at', { withTimezone: true }).notNull(),
  lang: text('lang'),
  imageUrl: text('image_url'),
  simhash: text('simhash'),
  paywalledBool: boolean('paywalled_bool').default(false).notNull(),
  firstSeenAt: timestamp('first_seen_at', { withTimezone: true }).defaultNow().notNull()
});

// Topic-Articles junction table
export const topicArticles = pgTable('topic_articles', {
  id: bigserial('id', { mode: 'bigint' }).primaryKey(),
  topicId: integer('topic_id').notNull().references(() => topics.id, { onDelete: 'cascade' }),
  articleId: bigserial('article_id', { mode: 'bigint' }).notNull().references(() => articles.id, { onDelete: 'cascade' }),
  addedAt: timestamp('added_at', { withTimezone: true }).defaultNow().notNull(),
  hiddenBool: boolean('hidden_bool').default(false).notNull()
});

// Crawls table
export const crawls = pgTable('crawls', {
  id: bigserial('id', { mode: 'bigint' }).primaryKey(),
  topicId: integer('topic_id').references(() => topics.id, { onDelete: 'set null' }),
  startedAt: timestamp('started_at', { withTimezone: true }).defaultNow().notNull(),
  finishedAt: timestamp('finished_at', { withTimezone: true }),
  okBool: boolean('ok_bool'),
  statsJson: jsonb('stats_json')
});

// Candidate domains table
export const candidateDomains = pgTable('candidate_domains', {
  id: serial('id').primaryKey(),
  domain: text('domain').unique().notNull(),
  discoveredVia: text('discovered_via'),
  score: integer('score'),
  robotsState: text('robots_state'),
  firstSeenAt: timestamp('first_seen_at', { withTimezone: true }).defaultNow().notNull(),
  lastSeenAt: timestamp('last_seen_at', { withTimezone: true }),
  notes: text('notes')
});

// Candidate probes table
export const candidateProbes = pgTable('candidate_probes', {
  id: serial('id').primaryKey(),
  domainId: integer('domain_id').notNull().references(() => candidateDomains.id, { onDelete: 'cascade' }),
  hasSitemap: boolean('has_sitemap'),
  hasFeed: boolean('has_feed'),
  jsonldNews: boolean('jsonld_news'),
  lastmodRecent: boolean('lastmod_recent'),
  lang: text('lang'),
  statusJson: jsonb('status_json'),
  probedAt: timestamp('probed_at', { withTimezone: true }).defaultNow().notNull()
});

// Crawl runs table - tracks when GitHub Actions workflows start crawls
export const crawlRuns = pgTable('crawl_runs', {
  id: bigserial('id', { mode: 'bigint' }).primaryKey(),
  workflowName: text('workflow_name').notNull(),
  runId: text('run_id'),
  startedAt: timestamp('started_at', { withTimezone: true }).defaultNow().notNull(),
  metadata: jsonb('metadata')
});
