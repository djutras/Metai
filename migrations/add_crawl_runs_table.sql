-- Migration: Add crawl_runs table to track GitHub Actions workflow executions
-- Created: 2025-10-04

CREATE TABLE IF NOT EXISTS crawl_runs (
  id BIGSERIAL PRIMARY KEY,
  workflow_name TEXT NOT NULL,
  run_id TEXT,
  started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  metadata JSONB
);

-- Create index on workflow_name for faster queries
CREATE INDEX idx_crawl_runs_workflow_name ON crawl_runs(workflow_name);

-- Create index on started_at for time-based queries
CREATE INDEX idx_crawl_runs_started_at ON crawl_runs(started_at DESC);
