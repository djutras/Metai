-- Migration: Convert sources.topic_id to many-to-many relationship

-- Step 1: Create junction table
CREATE TABLE IF NOT EXISTS sources_topics (
  id SERIAL PRIMARY KEY,
  source_id INTEGER NOT NULL REFERENCES sources(id) ON DELETE CASCADE,
  topic_id INTEGER NOT NULL REFERENCES topics(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(source_id, topic_id)
);

-- Step 2: Migrate existing data from sources.topic_id to junction table
INSERT INTO sources_topics (source_id, topic_id)
SELECT id, topic_id FROM sources WHERE topic_id IS NOT NULL
ON CONFLICT (source_id, topic_id) DO NOTHING;

-- Step 3: Drop the foreign key constraint and column
ALTER TABLE sources DROP CONSTRAINT IF EXISTS sources_topic_id_topics_id_fk;
ALTER TABLE sources DROP COLUMN IF EXISTS topic_id;

-- Step 4: Create index for better query performance
CREATE INDEX IF NOT EXISTS idx_sources_topics_source_id ON sources_topics(source_id);
CREATE INDEX IF NOT EXISTS idx_sources_topics_topic_id ON sources_topics(topic_id);

COMMENT ON TABLE sources_topics IS 'Junction table for many-to-many relationship between sources and topics';
