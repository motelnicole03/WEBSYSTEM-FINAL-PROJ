-- Blocked / removed accounts, and a richer activity log for admin actions.

-- When and why an account was blocked (status 'suspended') or removed (status 'inactive').
ALTER TABLE users ADD COLUMN IF NOT EXISTS restricted_at       TIMESTAMPTZ;
ALTER TABLE users ADD COLUMN IF NOT EXISTS restriction_reason  VARCHAR(300);

-- activity_logs already exists (user_id, action, created_at). These columns say WHAT was acted on.
ALTER TABLE activity_logs ADD COLUMN IF NOT EXISTS target_type   VARCHAR(20);   -- company | student | job
ALTER TABLE activity_logs ADD COLUMN IF NOT EXISTS target_id     BIGINT;
ALTER TABLE activity_logs ADD COLUMN IF NOT EXISTS target_label  VARCHAR(255);  -- the name at that time
ALTER TABLE activity_logs ADD COLUMN IF NOT EXISTS details       VARCHAR(500);  -- reason, or the company of a job post

CREATE INDEX IF NOT EXISTS idx_activity_logs_user_created ON activity_logs (user_id, created_at DESC);