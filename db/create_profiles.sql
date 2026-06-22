-- Create profiles table referencing auth.users
CREATE TABLE IF NOT EXISTS profiles (
  id uuid REFERENCES auth.users ON DELETE CASCADE PRIMARY KEY,
  full_name text,
  address text
);

-- Create doors table for multiple door support
CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS doors (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users ON DELETE CASCADE NOT NULL,
  door_name text NOT NULL,
  door_id_slug text UNIQUE NOT NULL,
  qr_code_image_url text,
  created_at timestamp with time zone DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_doors_user_id ON doors(user_id);

-- Note: Row-Level Security (RLS) is not enabled by this migration.
-- To enable RLS and appropriate policies, run:
-- ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
-- CREATE POLICY "Allow insert by authenticated" ON profiles
--   FOR INSERT TO auth.role WHEN (true) WITH CHECK (auth.role() = 'authenticated');
