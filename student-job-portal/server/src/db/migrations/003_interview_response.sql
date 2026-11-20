-- Lets a student confirm or decline an interview slot an employer proposed.
CREATE TYPE interview_response AS ENUM ('pending', 'confirmed', 'declined');

ALTER TABLE interviews
    ADD COLUMN student_response interview_response NOT NULL DEFAULT 'pending';

CREATE INDEX idx_interviews_schedule ON interviews(schedule);

ALTER TYPE notification_type ADD VALUE IF NOT EXISTS 'interview';
