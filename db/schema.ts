import { pgTable, serial, text, integer, boolean, timestamptz, jsonb, bigserial, uniqueIndex, index, pgEnum, bytea, sql } from 'drizzle-orm';
import { desc } from 'drizzle-orm';

// Enums
export const sourceTypeEnum = pgEnum('source_type', ['google_news', 'reddit', 'custom_crawler', 'api']);

// Sources table
export const sources = pgTable('sources', {
  id: serial('id').primaryKey(),
  name: text('name').notNull(),
  domain: text('domain').unique().notNull(),
  type: text('type').notNull(), // Using text with check constraint instead of enum for simpler migration
  apiConfig: jsonb('api_config').$type<Record<string, any>>().default(sql`'{}'::jsonb`).notNull(),
  points: integer('points').default(0).notNull(),
  lastSeenAt: timestamptz('last_seen_at'),
  enabled: boolean('enabled').default(true).notNull(),
  createdAt: timestamptz('created_at').defaultNow().notNull(),
}, (table) => ({
  pointsIdx: index('idx_sources_points').on(table.points.desc()),
}));

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
  configJson: jsonb('config_json').$type<Record<string, any>>().default(sql`'{}'::jsonb`).notNull(),
  enabled: boolean('enabled').default(true).notNull(),
  createdAt: timestamptz('created_at').defaultNow().notNull(),
}));

// Articles table
export const articles = pgTable('articles', {
  id: bigserial('id', { mode: 'bigint' }).primaryKey(),
  canonicalUrl: text('canonical_url').unique().notNull(),
  title: text('title').notNull(),
  summary: text('summary'),
  sourceId: integer('source_id').references(() => sources.id, { onDelete: 'set null' }),
  publishedAt: timestamptz('published_at').notNull(),
  lang: text('lang'),
  imageUrl: text('image_url'),
  simhash: bytea('simhash'),
  paywalledBool: boolean('paywalled_bool').default(false).notNull(),
  firstSeenAt: timestamptz('first_seen_at').defaultNow().notNull(),
}, (table) => ({
  publishedAtIdx: index('idx_articles_published_at').on(table.publishedAt.desc()),
  simhashIdx: index('idx_articles_simhash').on(table.simhash),
  sourceIdIdx: index('idx_articles_source_id').on(table.sourceId),
}));

// Topic-Articles junction table
export const topicArticles = pgTable('topic_articles', {
  id: bigserial('id', { mode: 'bigint' }).primaryKey(),
  topicId: integer('topic_id').notNull().references(() => topics.id, { onDelete: 'cascade' }),
  articleId: bigserial('article_id', { mode: 'bigint' }).notNull().references(() => articles.id, { onDelete: 'cascade' }),
  addedAt: timestamptz('added_at').defaultNow().notNull(),
  hiddenBool: boolean('hidden_bool').default(false).notNull(),
}, (table) => ({
  uniqueTopicArticle: uniqueIndex('topic_articles_topic_id_article_id_key').on(table.topicId, table.articleId),
  topicAddedIdx: index('idx_topic_articles_topic_added').on(table.topicId, table.addedAt.desc()),
}));

// Crawls table
export const crawls = pgTable('crawls', {
  id: bigserial('id', { mode: 'bigint' }).primaryKey(),
  topicId: integer('topic_id').references(() => topics.id, { onDelete: 'set null' }),
  startedAt: timestamptz('started_at').defaultNow().notNull(),
  finishedAt: timestamptz('finished_at'),
  okBool: boolean('ok_bool'),
  statsJson: jsonb('stats_json'),
}, (table) => ({
  topicStartedIdx: index('idx_crawls_topic_id').on(table.topicId, table.startedAt.desc()),
}));

// Candidate domains table
export const candidateDomains = pgTable('candidate_domains', {
  id: serial('id').primaryKey(),
  domain: text('domain').unique().notNull(),
  discoveredVia: text('discovered_via'),
  score: integer('score'),
  robotsState: text('robots_state'),
  firstSeenAt: timestamptz('first_seen_at').defaultNow().notNull(),
  lastSeenAt: timestamptz('last_seen_at'),
  notes: text('notes'),
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
  probedAt: timestamptz('probed_at').defaultNow().notNull(),
}, (table) => ({
  domainIdIdx: index('idx_candidate_probes_domain_id').on(table.domainId),
}));
