-- Profile photo and short bio for students.
-- photo_path stores only the file name (inside uploads/avatars), never a full path.
ALTER TABLE students ADD COLUMN IF NOT EXISTS bio        TEXT;
ALTER TABLE students ADD COLUMN IF NOT EXISTS photo_path VARCHAR(255);