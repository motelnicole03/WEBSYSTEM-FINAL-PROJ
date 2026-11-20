-- Unread tracking for messages.
ALTER TABLE messages ADD COLUMN read_at TIMESTAMPTZ;

-- Existing messages count as read.
UPDATE messages SET read_at = sent_at;

CREATE INDEX idx_messages_unread ON messages(receiver_id) WHERE read_at IS NULL;
