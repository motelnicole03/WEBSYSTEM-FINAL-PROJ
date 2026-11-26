-- Company profile for employers: logo, short description and contact details.
-- logo_path stores only the file name (inside uploads/avatars), never a full path.
ALTER TABLE employers ADD COLUMN IF NOT EXISTS logo_path    VARCHAR(255);
ALTER TABLE employers ADD COLUMN IF NOT EXISTS about        TEXT;
ALTER TABLE employers ADD COLUMN IF NOT EXISTS website      VARCHAR(255);
ALTER TABLE employers ADD COLUMN IF NOT EXISTS company_size VARCHAR(20);
ALTER TABLE employers ADD COLUMN IF NOT EXISTS phone        VARCHAR(30);