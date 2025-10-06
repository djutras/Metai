-- Add suggested_topic_id to candidate_domains
ALTER TABLE candidate_domains
ADD COLUMN suggested_topic_id INTEGER REFERENCES topics(id) ON DELETE SET NULL;

-- Add index for faster lookups
CREATE INDEX idx_candidate_domains_suggested_topic ON candidate_domains(suggested_topic_id);
