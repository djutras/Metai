-- Make topic_id required for sources
-- WARNING: This will fail if any sources have NULL topic_id

-- First, add the foreign key constraint (if not already exists)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'sources_topic_id_topics_id_fk'
    ) THEN
        ALTER TABLE sources
        ADD CONSTRAINT sources_topic_id_topics_id_fk
        FOREIGN KEY (topic_id) REFERENCES topics(id) ON DELETE CASCADE;
    END IF;
END $$;

-- Then, make the column NOT NULL
-- This will fail if any sources have NULL topic_id
ALTER TABLE sources ALTER COLUMN topic_id SET NOT NULL;

-- Add a comment to document the relationship
COMMENT ON COLUMN sources.topic_id IS 'Required: Each source must belong to exactly one topic';
