-- Add topic_id column to sources table
ALTER TABLE sources ADD COLUMN topic_id INTEGER REFERENCES topics(id) ON DELETE SET NULL;

-- Add index for performance
CREATE INDEX idx_sources_topic_id ON sources(topic_id);
