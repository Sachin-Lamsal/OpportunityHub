-- Additive migration: adds index for scan tracking if needed (existing discovery_jobs table preserved)
CREATE INDEX IF NOT EXISTS discovery_jobs_source_idx ON discovery_jobs (source_id);
CREATE INDEX IF NOT EXISTS discovery_jobs_status_idx ON discovery_jobs (status);
CREATE INDEX IF NOT EXISTS discovery_jobs_created_at_idx ON discovery_jobs (created_at DESC);
