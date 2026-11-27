-- Intern management.
-- An "intern" is an application that reached 'hired' on an internship or OJT posting.
-- internship_status only means something while current_status = 'hired'.
DO $$ BEGIN
  CREATE TYPE internship_status AS ENUM ('ongoing', 'completed', 'removed');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

ALTER TABLE applications ADD COLUMN IF NOT EXISTS internship_status   internship_status NOT NULL DEFAULT 'ongoing';
ALTER TABLE applications ADD COLUMN IF NOT EXISTS internship_ended_at TIMESTAMPTZ;   -- when it was marked done or removed
ALTER TABLE applications ADD COLUMN IF NOT EXISTS internship_remarks  TEXT;          -- reason for removal

-- One certificate of completion per internship.
CREATE TABLE IF NOT EXISTS certificates (
    certificate_id  BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    application_id  BIGINT NOT NULL UNIQUE
                    REFERENCES applications(application_id) ON DELETE CASCADE,
    issued_by       BIGINT REFERENCES users(user_id) ON DELETE SET NULL,
    hours_rendered  INTEGER CHECK (hours_rendered > 0),
    remarks         TEXT,
    issued_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_applications_internship ON applications(internship_status) WHERE current_status = 'hired';
