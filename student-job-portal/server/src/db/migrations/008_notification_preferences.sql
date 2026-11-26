-- Notification types a user turned off in Settings (for example {message}).
-- Empty means everything is on. Types are the values of notification_type.
ALTER TABLE users ADD COLUMN IF NOT EXISTS muted_notifications TEXT[] NOT NULL DEFAULT '{}';