-- Star ratings (1 to 5) that students give to companies they applied to.
-- One rating per student per company. Changing it updates the same row.
CREATE TABLE IF NOT EXISTS company_ratings (
    rating_id    BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    employer_id  BIGINT NOT NULL REFERENCES employers(employer_id) ON DELETE CASCADE,
    student_id   BIGINT NOT NULL REFERENCES students(student_id)   ON DELETE CASCADE,
    rating       SMALLINT NOT NULL CHECK (rating BETWEEN 1 AND 5),
    created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (employer_id, student_id)
);

CREATE INDEX IF NOT EXISTS idx_company_ratings_employer ON company_ratings (employer_id);