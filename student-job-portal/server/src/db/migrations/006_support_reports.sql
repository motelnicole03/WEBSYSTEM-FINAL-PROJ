-- "Report a problem" form in Settings. Any signed-in user can send a report.
CREATE TABLE IF NOT EXISTS support_reports (
    report_id    BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    user_id      BIGINT NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    category     VARCHAR(30) NOT NULL
                 CHECK (category IN ('not_working', 'wrong_info', 'account', 'suggestion', 'other')),
    page         VARCHAR(120),
    description  TEXT NOT NULL,
    status       VARCHAR(20) NOT NULL DEFAULT 'open'
                 CHECK (status IN ('open', 'resolved')),
    created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_support_reports_user ON support_reports (user_id, created_at DESC);